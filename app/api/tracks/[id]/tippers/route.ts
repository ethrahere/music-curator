import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    // Get all tips for this track
    const { data, error } = await supabase
      .from('tips')
      .select('tipper_fid, created_at')
      .eq('recommendation_id', id)
      .order('created_at', { ascending: false })
      .limit(100); // Get more to dedupe

    if (error) {
      console.error('Error fetching tips:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tippers' },
        { status: 500 }
      );
    }

    // Get unique tipper FIDs
    const uniqueFids = [...new Set(data?.map((tip) => tip.tipper_fid) || [])].slice(0, limit);

    // Fetch user info for these FIDs
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('farcaster_fid, username, farcaster_pfp_url')
      .in('farcaster_fid', uniqueFids);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user info' },
        { status: 500 }
      );
    }

    // Map users by FID for quick lookup
    const usersMap = new Map<number, { farcaster_fid: number; username: string; farcaster_pfp_url?: string }>();
    usersData?.forEach((user) => {
      usersMap.set(user.farcaster_fid, user);
    });

    // Build tippers list with timestamps from first tip
    const tippersWithTimestamps = new Map<number, string>();
    data?.forEach((tip) => {
      if (!tippersWithTimestamps.has(tip.tipper_fid)) {
        tippersWithTimestamps.set(tip.tipper_fid, tip.created_at);
      }
    });

    // Combine user info with timestamps
    const tippers = uniqueFids.map((fid) => {
      const user = usersMap.get(fid);
      return {
        fid,
        username: user?.username || 'unknown',
        pfpUrl: user?.farcaster_pfp_url,
        timestamp: tippersWithTimestamps.get(fid),
      };
    });

    return NextResponse.json({
      success: true,
      tippers,
      total: tippers.length,
    });
  } catch (error) {
    console.error('Error in tippers API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
