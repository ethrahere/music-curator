import { NextRequest, NextResponse } from 'next/server';
import { FARCASTER_HUB_URL } from '@/lib/constants';

/**
 * Get wallet address(es) for a Farcaster FID
 * This endpoint fetches verified addresses from Farcaster Hub
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

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
          // Convert to checksum address format
          addresses.push(address);
        }
      }
    }

    // Return the first verified address (primary wallet)
    const primaryAddress = addresses[0] || null;

    return NextResponse.json({
      success: true,
      fid: parseInt(fid),
      primaryAddress,
      allAddresses: addresses,
    });
  } catch (error) {
    console.error('Error fetching address for FID:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
