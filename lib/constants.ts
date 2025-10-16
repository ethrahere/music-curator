/**
 * Centralized constants for the Curio music curator app
 * All hardcoded values should be defined here for easy maintenance
 */

// ============================================================================
// BLOCKCHAIN CONSTANTS
// ============================================================================

/**
 * USDC token address on Base network
 * This is the ONLY token accepted for tips
 */
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

/**
 * USDC token identifier for Farcaster SDK (CAIP-19 format)
 */
export const USDC_TOKEN_ID = 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

/**
 * Native ETH token identifier for swaps
 */
export const ETH_TOKEN_ID = 'eip155:8453/native' as const;

/**
 * USDC has 6 decimal places
 */
export const USDC_DECIMALS = 6;

/**
 * ETH has 18 decimal places
 */
export const ETH_DECIMALS = 18;

// ============================================================================
// SWAP ESTIMATION CONSTANTS
// ============================================================================

/**
 * Rough ETH/USD price for swap estimation
 * Note: Actual swap will use real-time rates from the swap protocol
 * This is just for initial estimation
 */
export const ETH_USD_ESTIMATE = 3000;

/**
 * Buffer percentage to add to swap estimates (as decimal)
 * Example: 0.05 = 5% buffer
 */
export const SWAP_BUFFER_PERCENT = 0.05;

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Farcaster Hub API base URL
 */
export const FARCASTER_HUB_URL = 'https://hub.farcaster.xyz:2281' as const;

/**
 * Warpcast API base URL
 */
export const WARPCAST_API_URL = 'https://client.warpcast.com/v2' as const;

/**
 * App base URL for links and embeds
 * TODO: Consider using environment variable for production/staging differences
 */
export const APP_BASE_URL = 'https://music-curator.vercel.app' as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

/**
 * Default tip amounts shown as quick options (in USDC)
 */
export const DEFAULT_TIP_AMOUNTS = [1, 5, 10] as const;

/**
 * Default placeholder image for tracks without artwork
 */
export const DEFAULT_ARTWORK_URL = 'https://placehold.co/600x400/1a1a1a/white?text=Music' as const;

/**
 * Toast message duration (milliseconds)
 */
export const TOAST_DURATION = 2000;

/**
 * Tip success animation duration (milliseconds)
 */
export const TIP_SUCCESS_DURATION = 3000;

// ============================================================================
// PLATFORM OEMBED URLS
// ============================================================================

/**
 * oEmbed endpoint URLs for different music platforms
 */
export const OEMBED_URLS = {
  youtube: 'https://www.youtube.com/oembed',
  spotify: 'https://open.spotify.com/oembed',
  soundcloud: 'https://soundcloud.com/oembed',
} as const;

/**
 * Embed player URLs for different platforms
 */
export const EMBED_BASE_URLS = {
  youtube: 'https://www.youtube.com/embed',
  spotify: 'https://open.spotify.com/embed/track',
  soundcloud: 'https://w.soundcloud.com/player',
} as const;
