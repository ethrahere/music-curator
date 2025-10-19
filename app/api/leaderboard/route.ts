import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
};

export async function GET() {
  try {
    const supabase = getSupabase();

    // Get all users sorted by XP
    const { data: allUsersXP, error: xpError } = await supabase
      .from('users')
      .select('farcaster_fid, username, farcaster_pfp_url, xp')
      .order('xp', { ascending: false })
      .limit(50);

    if (xpError) {
      console.error('Error fetching XP leaderboard:', xpError);
    }

    console.log('Raw XP data from Supabase:', {
      count: allUsersXP?.length || 0,
      first: allUsersXP?.[0],
      hasXP: allUsersXP?.filter(u => u.xp).length || 0,
    });

    // Filter users with XP > 0 and map to expected format
    const xpLeaderboard = allUsersXP
      ?.filter(user => (user.xp || 0) > 0)
      .map(user => ({
        farcaster_fid: user.farcaster_fid,
        username: user.username,
        pfp_url: user.farcaster_pfp_url,
        xp: user.xp,
      })) || [];

    // Get all users sorted by curator score
    const { data: allUsersScore, error: scoreError } = await supabase
      .from('users')
      .select('farcaster_fid, username, farcaster_pfp_url, curator_score')
      .order('curator_score', { ascending: false })
      .limit(50);

    if (scoreError) {
      console.error('Error fetching curator score leaderboard:', scoreError);
    }

    // Filter users with curator_score > 0 and map to expected format
    const curatorScoreLeaderboard = allUsersScore
      ?.filter(user => (user.curator_score || 0) > 0)
      .map(user => ({
        farcaster_fid: user.farcaster_fid,
        username: user.username,
        pfp_url: user.farcaster_pfp_url,
        curator_score: user.curator_score,
      })) || [];

    console.log('Leaderboard data:', {
      xpCount: xpLeaderboard.length,
      scoreCount: curatorScoreLeaderboard.length,
      sampleXP: xpLeaderboard.slice(0, 3),
      sampleScore: curatorScoreLeaderboard.slice(0, 3),
    });

    return NextResponse.json({
      success: true,
      xpLeaderboard,
      curatorScoreLeaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
