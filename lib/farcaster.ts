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
    };
  } catch (error) {
    console.error('Failed to get user context:', error);
    return {
      fid: 0,
      username: 'anonymous',
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
export async function shareToFarcaster(trackUrl: string, text?: string) {
  try {
    await sdk.actions.composeCast({
      text: text || '',
      embeds: [trackUrl],
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
        type: 'launch_frame',
        name: 'Music Player',
        url: `${baseUrl}/play?trackId=${trackId}`,
        splashImageUrl: `${baseUrl}/icon.png`,
        splashBackgroundColor: '#1a1a1a',
      },
    },
  };
}
