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

    // Get co-signers for this track
    const { data, error } = await supabase
      .from('co_signs')
      .select('user_fid, created_at')
      .eq('recommendation_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching co-signers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch co-signers' },
        { status: 500 }
      );
    }

    // Get unique user FIDs
    const userFids = data?.map((cs) => cs.user_fid) || [];

    // Fetch user info for these FIDs
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('farcaster_fid, username, farcaster_pfp_url')
      .in('farcaster_fid', userFids);

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

    // Combine co-sign data with user info
    const cosigners = data?.map((item) => {
      const user = usersMap.get(item.user_fid);
      return {
        fid: item.user_fid,
        username: user?.username || 'unknown',
        pfpUrl: user?.farcaster_pfp_url,
        timestamp: item.created_at,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      cosigners,
      total: cosigners.length,
    });
  } catch (error) {
    console.error('Error in cosigners API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
