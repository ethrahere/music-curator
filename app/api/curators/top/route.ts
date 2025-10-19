import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[TOP CURATORS API] Starting request');
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6');
    const timeframe = searchParams.get('timeframe') || 'week'; // week, month, all
    console.log('[TOP CURATORS API] Limit:', limit, 'Timeframe:', timeframe);

    // Get top curators by score with their recent activity
    console.log('[TOP CURATORS API] Querying users table...');
    const { data: curators, error } = await supabase
      .from('users')
      .select(`
        farcaster_fid,
        username,
        farcaster_pfp_url,
        curator_score
      `)
      .gt('curator_score', 0)
      .order('curator_score', { ascending: false })
      .limit(limit);

    console.log('[TOP CURATORS API] Query result:', { curators: curators?.length, error });

    if (error) {
      console.error('[TOP CURATORS API] Error fetching top curators:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch curators' },
        { status: 500 }
      );
    }

    // Get track counts for each curator
    const curatorsWithStats = await Promise.all(
      (curators || []).map(async (curator) => {
        const { count } = await supabase
          .from('recommendations')
          .select('*', { count: 'exact', head: true })
          .eq('curator_fid', curator.farcaster_fid);

        return {
          fid: curator.farcaster_fid,
          username: curator.username,
          pfpUrl: curator.farcaster_pfp_url,
          curatorScore: curator.curator_score,
          trackCount: count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      curators: curatorsWithStats,
    });
  } catch (error) {
    console.error('Error in top curators API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
