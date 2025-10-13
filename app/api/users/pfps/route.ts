import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch users with PFPs, limit to 10 for the OG image
    const { data: users, error } = await supabase
      .from('users')
      .select('farcaster_pfp_url')
      .not('farcaster_pfp_url', 'is', null)
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pfpUrls = users?.map(u => u.farcaster_pfp_url).filter(Boolean) || [];

    return NextResponse.json({ pfps: pfpUrls });
  } catch (error) {
    console.error('Error fetching PFPs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
