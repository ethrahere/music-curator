import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MusicTrack } from '@/types/music';
import { DEFAULT_ARTWORK_URL } from '@/lib/constants';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const supabase = getSupabase();

    console.log('Fetching tracks for username:', username);

    // Get user by username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('farcaster_fid, username')
      .eq('username', username)
      .single();

    console.log('User lookup result:', { user, userError });

    if (!user) {
      console.log('User not found in database');
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    console.log('Found user:', user);

    // Get user's tracks using FID
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('curator_fid', user.farcaster_fid)
      .order('created_at', { ascending: false });

    console.log('Tracks query result:', { count: data?.length, error });

    if (error) {
      console.error('Supabase error fetching tracks:', error);
      return NextResponse.json({ success: false, tracks: [], error: error.message });
    }

    // Get wallet address and curator data for this user
    const { data: userData } = await supabase
      .from('users')
      .select('wallet_address, curator_score, farcaster_pfp_url')
      .eq('farcaster_fid', user.farcaster_fid)
      .single();

    // Get co-sign counts for all tracks
    const trackIds = data?.map(rec => rec.id) || [];
    const { data: coSignData } = await supabase
      .from('co_signs')
      .select('recommendation_id')
      .in('recommendation_id', trackIds);

    // Count co-signs per track
    const coSignCounts = (coSignData || []).reduce((acc, cs) => {
      acc[cs.recommendation_id] = (acc[cs.recommendation_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transform to MusicTrack format
    const tracks: MusicTrack[] = (data || []).map((rec) => ({
      id: rec.id,
      url: rec.music_url,
      platform: rec.platform || 'other',
      title: rec.song_title,
      artist: rec.artist,
      artwork: rec.artwork_url || DEFAULT_ARTWORK_URL,
      embedUrl: rec.embed_url || '',
      tips: rec.total_tips_usd || 0,
      coSigns: coSignCounts[rec.id] || 0,
      sharedBy: {
        fid: user.farcaster_fid || 0,
        username: username,
        curatorScore: userData?.curator_score || 0,
        pfpUrl: userData?.farcaster_pfp_url || undefined,
        walletAddress: userData?.wallet_address || undefined,
      },
      timestamp: new Date(rec.created_at).getTime(),
      review: rec.review || undefined,
    }));

    console.log('Transformed tracks with tips:', tracks.map(t => ({ id: t.id, title: t.title, tips: t.tips })));

    return NextResponse.json({ success: true, tracks });
  } catch (error) {
    console.error('Error fetching user tracks:', error);
    return NextResponse.json({ success: false, tracks: [] }, { status: 500 });
  }
}
