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

    // Get user address - try by username first, then by address
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('address, farcaster_fid')
      .eq('username', username)
      .single();

    // If not found by username, try by address
    if (userError || !user) {
      const { data: userByAddress } = await supabase
        .from('users')
        .select('address, farcaster_fid')
        .eq('address', username)
        .single();

      user = userByAddress;
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get user's tracks
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('curator_address', user.address)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, tracks: [] });
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
