import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Fetch all users without PFPs
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('farcaster_fid, username, farcaster_pfp_url')
      .is('farcaster_pfp_url', null);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users without PFPs found' });
    }

    const results = [];

    // Fetch PFPs from Warpcast API for each user
    for (const user of users) {
      try {
        const response = await fetch(
          `https://client.warpcast.com/v2/user-by-fid?fid=${user.farcaster_fid}`
        );

        if (response.ok) {
          const data = await response.json();
          const pfpUrl = data.result?.user?.pfp?.url;

          if (pfpUrl) {
            // Update user with PFP
            const { error: updateError } = await supabase
              .from('users')
              .update({ farcaster_pfp_url: pfpUrl })
              .eq('farcaster_fid', user.farcaster_fid);

            if (updateError) {
              results.push({
                fid: user.farcaster_fid,
                username: user.username,
                success: false,
                error: updateError.message,
              });
            } else {
              results.push({
                fid: user.farcaster_fid,
                username: user.username,
                success: true,
                pfp_url: pfpUrl,
              });
            }
          } else {
            results.push({
              fid: user.farcaster_fid,
              username: user.username,
              success: false,
              error: 'PFP not found in API response',
            });
          }
        } else {
          results.push({
            fid: user.farcaster_fid,
            username: user.username,
            success: false,
            error: `API error: ${response.status}`,
          });
        }
      } catch (error) {
        results.push({
          fid: user.farcaster_fid,
          username: user.username,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: 'Backfill complete',
      total: users.length,
      results,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
