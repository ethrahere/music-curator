import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MusicTrack } from '@/types/music';

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

    // Transform to MusicTrack format
    const tracks: MusicTrack[] = (data || []).map((rec) => ({
      id: rec.id,
      url: rec.music_url,
      platform: rec.platform || 'other',
      title: rec.song_title,
      artist: rec.artist,
      artwork: rec.artwork_url || 'https://placehold.co/600x400/1a1a1a/white?text=Music',
      embedUrl: rec.embed_url || '',
      tips: rec.total_tips_usd || 0,
      sharedBy: {
        fid: user.farcaster_fid || 0,
        username: username,
      },
      timestamp: new Date(rec.created_at).getTime(),
    }));

    return NextResponse.json({ success: true, tracks });
  } catch (error) {
    console.error('Error fetching user tracks:', error);
    return NextResponse.json({ success: false, tracks: [] }, { status: 500 });
  }
}
