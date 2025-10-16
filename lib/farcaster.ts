import sdk from '@farcaster/frame-sdk';
import { USDC_TOKEN_ID, USDC_DECIMALS, APP_BASE_URL } from './constants';

// Initialize Farcaster SDK
export async function initializeFarcaster() {
  try {
    await sdk.actions.ready();
    return true;
  } catch (error) {
    console.error('Failed to initialize Farcaster SDK:', error);
    return false;
  }
}

// Get current user context
export async function getUserContext() {
  try {
    const context = await sdk.context;

    // Get connected wallet address from Ethereum provider
    let walletAddress = null;
    try {
      const provider = sdk.wallet.ethProvider;
      const accounts = await provider.request({
        method: 'eth_accounts'
      }) as string[];
      walletAddress = accounts && accounts.length > 0 ? accounts[0] : null;
      console.log('Wallet address from eth provider:', walletAddress);
    } catch (providerError) {
      console.error('Failed to get wallet from provider:', providerError);
    }

    return {
      fid: context.user?.fid || 0,
      username: context.user?.username || 'anonymous',
      pfpUrl: context.user?.pfpUrl,
      walletAddress,
    };
  } catch (error) {
    console.error('Failed to get user context:', error);
    return {
      fid: 0,
      username: 'anonymous',
      pfpUrl: undefined,
      walletAddress: null,
    };
  }
}

// Get location context (e.g., opened from cast_embed)
export async function getLocationContext() {
  try {
    const context = await sdk.context;
    return context.location;
  } catch (error) {
    console.error('Failed to get location context:', error);
    return null;
  }
}

// Share track to Farcaster feed
export async function shareToFarcaster(trackUrl: string, text?: string, imageUrl?: string) {
  try {
    // Only embed the track URL, not the image
    // The track page's Open Graph metadata will provide the image
    const embeds: [string] = [trackUrl];

    console.log('shareToFarcaster called with:', {
      trackUrl,
      text,
      imageUrl,
      embeds
    });

    const castPayload = {
      text: text || '',
      embeds,
    };

    console.log('Calling composeCast with:', JSON.stringify(castPayload, null, 2));

    await sdk.actions.composeCast(castPayload);
    return true;
  } catch (error) {
    console.error('Failed to share to Farcaster:', error);
    return false;
  }
}

// Generate Mini App embed metadata
export function generateEmbedMetadata(
  trackId: string,
  artworkUrl: string,
  baseUrl: string
) {
  return {
    version: '1',
    imageUrl: artworkUrl,
    button: {
      title: '▶ Play',
      action: {
        type: 'launch',
        name: 'Music Player',
        url: `${baseUrl}/play?trackId=${trackId}`,
        splashImageUrl: `${baseUrl}/curio-logo.png`,
        splashBackgroundColor: '#1a1a1a',
      },
    },
  };
}

// Send USDC tip to curator
export async function sendTip(curatorFid: number, tipAmount: number) {
  try {
    const result = await sdk.actions.sendToken({
      token: USDC_TOKEN_ID, // Base USDC
      amount: (tipAmount * Math.pow(10, USDC_DECIMALS)).toString(), // Convert to USDC decimals (6)
      recipientFid: curatorFid, // Pre-fill recipient by Farcaster ID
    });

    if (result.success) {
      return {
        success: true,
        transaction: result.send?.transaction,
      };
    } else {
      return {
        success: false,
        reason: result.reason,
      };
    }
  } catch (error) {
    console.error('Tip error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send notification to curator
export async function notifyCurator(
  curatorNotificationToken: string,
  tipperUsername: string,
  amount: number,
  trackTitle: string,
  trackId: string,
  notificationUrl: string
) {
  try {
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${curatorNotificationToken}`,
      },
      body: JSON.stringify({
        notificationId: `tip-${Date.now()}`,
        title: 'You received a tip! 💰',
        body: `@${tipperUsername} tipped you $${amount} for "${trackTitle}"`,
        targetUrl: `${APP_BASE_URL}/track/${trackId}`,
        tokens: [curatorNotificationToken],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}
