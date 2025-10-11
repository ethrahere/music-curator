import sdk from '@farcaster/frame-sdk';

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
    return {
      fid: context.user?.fid || 0,
      username: context.user?.username || 'anonymous',
      pfpUrl: context.user?.pfpUrl,
    };
  } catch (error) {
    console.error('Failed to get user context:', error);
    return {
      fid: 0,
      username: 'anonymous',
      pfpUrl: undefined,
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
    const sanitizedImage = imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl : undefined;
    const embeds: [string] | [string, string] = sanitizedImage
      ? [trackUrl, sanitizedImage]
      : [trackUrl];

    await sdk.actions.composeCast({
      text: text || '',
      embeds,
    });
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
      token: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
      amount: (tipAmount * 1000000).toString(), // Convert to USDC decimals (6)
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
        targetUrl: `https://music-curator.vercel.app/track/${trackId}`,
        tokens: [curatorNotificationToken],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}
