import { FARCASTER_HUB_URL } from './constants';

/**
 * Get the custody (wallet) address for a given Farcaster FID
 * This fetches the user's verified addresses from Farcaster Hub
 */
export async function getCustodyAddressFromFid(fid: number): Promise<string | null> {
  try {
    // Fetch from Farcaster Hub API
    const response = await fetch(`${FARCASTER_HUB_URL}/v1/userDataByFid?fid=${fid}`);
    const data = await response.json();

    // Find custody address in the messages
    if (data.messages) {
      for (const message of data.messages) {
        if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_CUSTODY_ADDRESS') {
          return message.data.userDataBody.value;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get custody address for FID:', fid, error);
    return null;
  }
}

/**
 * Get verified addresses for a Farcaster FID
 * Returns an array of connected wallet addresses
 */
export async function getVerifiedAddressesFromFid(fid: number): Promise<string[]> {
  try {
    const response = await fetch(`${FARCASTER_HUB_URL}/v1/verificationsByFid?fid=${fid}`);
    const data = await response.json();

    const addresses: string[] = [];

    if (data.messages) {
      for (const message of data.messages) {
        if (message.data?.verificationAddBody?.address) {
          addresses.push(message.data.verificationAddBody.address);
        }
      }
    }

    return addresses;
  } catch (error) {
    console.error('Failed to get verified addresses for FID:', fid, error);
    return [];
  }
}
