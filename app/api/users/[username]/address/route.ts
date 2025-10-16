import { NextRequest, NextResponse } from 'next/server';
import { FARCASTER_HUB_URL } from '@/lib/constants';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key);
};

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
      const supabase = getSupabase();
      const { data: user, error } = await supabase
        .from('users')
        .select('farcaster_fid')
        .eq('username', username)
        .single();

      if (error || !user) {
        console.error('User lookup error:', error);
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      fid = user.farcaster_fid;
    }

    // Fetch verified addresses from Neynar API (more reliable than Farcaster Hub)
    console.log('Fetching address for FID:', fid);
    const neynarApiKey = process.env.NEYNAR_API_KEY;

    if (!neynarApiKey) {
      console.warn('NEYNAR_API_KEY not configured - this is required for production');
      // For development: Return error message prompting user to get address via Farcaster
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet address lookup not configured',
          message: 'NEYNAR_API_KEY required. Get one at https://neynar.com',
        },
        { status: 503 }
      );
    }

    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        'accept': 'application/json',
        'api_key': neynarApiKey,
      },
    });

    if (!response.ok) {
      console.error('Neynar API error:', response.status, await response.text());
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Neynar response:', JSON.stringify(data, null, 2));

    const addresses: string[] = [];

    // Extract verified addresses from Neynar response
    if (data.users && Array.isArray(data.users) && data.users.length > 0) {
      const user = data.users[0];
      if (user.verified_addresses?.eth_addresses) {
        addresses.push(...user.verified_addresses.eth_addresses);
      }
      // Also add custody address as fallback
      if (user.custody_address) {
        addresses.push(user.custody_address);
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
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
