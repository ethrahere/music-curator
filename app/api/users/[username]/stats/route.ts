import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Get user info by username
    const { data: user } = await supabase
      .from('users')
      .select('farcaster_fid, bio')
      .eq('username', username)
      .single();

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get tracks shared count
    const { count: tracksShared } = await supabase
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('curator_fid', user.farcaster_fid);

    // Get total tips earned
    const { data: tipsData } = await supabase
      .from('recommendations')
      .select('total_tips_usd')
      .eq('curator_fid', user.farcaster_fid);

    const tipsEarned = tipsData?.reduce((sum, rec) => sum + (rec.total_tips_usd || 0), 0) || 0;

    // Get success rate (tracks with 5+ USDC tips)
    const { count: successfulTracks } = await supabase
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('curator_fid', user.farcaster_fid)
      .gte('total_tips_usd', 5);

    const successRate = tracksShared ? Math.round(((successfulTracks || 0) / tracksShared) * 100) : 0;

    // Followers count (placeholder - implement later)
    const followers = 0;

    return NextResponse.json({
      success: true,
      stats: {
        tracksShared: tracksShared || 0,
        followers,
        tipsEarned: Math.round(tipsEarned * 100) / 100, // Round to 2 decimals
        successRate,
      },
      bio: user.bio || '',
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
