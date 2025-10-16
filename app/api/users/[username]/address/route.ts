import { NextRequest, NextResponse } from 'next/server';
import { FARCASTER_HUB_URL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

/**
 * Get wallet address for a Farcaster user
 * Accepts either FID (number) or username (string)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    let fid: number;

    // Check if the parameter is a numeric FID or a username
    if (/^\d+$/.test(username)) {
      // It's a FID
      fid = parseInt(username);
    } else {
      // It's a username - look up the FID
      const { data: user, error } = await supabase
        .from('users')
        .select('farcaster_fid')
        .eq('username', username)
        .single();

      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      fid = user.farcaster_fid;
    }

    // Fetch verified addresses from Farcaster Hub
    const response = await fetch(`${FARCASTER_HUB_URL}/v1/verificationsByFid?fid=${fid}`);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch from Farcaster Hub' },
        { status: response.status }
      );
    }

    const data = await response.json();

    const addresses: string[] = [];

    // Extract verified addresses from messages
    if (data.messages && Array.isArray(data.messages)) {
      for (const message of data.messages) {
        const address = message.data?.verificationAddBody?.address;
        if (address) {
          addresses.push(address);
        }
      }
    }

    // Return the first verified address (primary wallet)
    const primaryAddress = addresses[0] || null;

    return NextResponse.json({
      success: true,
      fid,
      primaryAddress,
      allAddresses: addresses,
    });
  } catch (error) {
    console.error('Error fetching address:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
