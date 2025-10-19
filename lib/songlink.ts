/**
 * Songlink/Odesli API Integration
 *
 * This utility normalizes music links across different platforms.
 * It takes any music URL (Spotify, YouTube, Apple Music, SoundCloud, etc.)
 * and returns canonical track information plus links for all available platforms.
 */

import { MusicPlatform } from '@/types/music';

export interface SonglinkResponse {
  entityUniqueId: string; // Canonical identifier for the track
  pageUrl: string; // Songlink page URL
  linksByPlatform: {
    spotify?: {
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    };
    appleMusic?: {
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    };
    youtube?: {
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    };
    soundcloud?: {
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    };
    youtubeMusic?: {
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    };
    tidal?: {
      url: string;
      nativeAppUriMobile?: string;
      nativeAppUriDesktop?: string;
    };
  };
  entitiesByUniqueId: {
    [key: string]: {
      id: string;
      type: string;
      title?: string;
      artistName?: string;
      thumbnailUrl?: string;
      thumbnailWidth?: number;
      thumbnailHeight?: number;
      apiProvider: string;
      platforms: string[];
    };
  };
}

export interface NormalizedTrack {
  songlinkId: string;
  title: string;
  artist: string;
  artworkUrl: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeUrl?: string;
  soundcloudUrl?: string;
  youtubeMusicUrl?: string;
  tidalUrl?: string;
  songlinkPageUrl: string;
}

/**
 * Fetch track information from Songlink API
 * @param url - Any music platform URL
 * @returns Normalized track data with all platform links
 */
export async function fetchSonglinkData(url: string): Promise<NormalizedTrack | null> {
  try {
    console.log('[Songlink] Fetching data for URL:', url);

    const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Songlink] API error:', response.status, response.statusText);
      return null;
    }

    const data: SonglinkResponse = await response.json();
    console.log('[Songlink] API response received:', {
      entityId: data.entityUniqueId,
      platforms: Object.keys(data.linksByPlatform || {}),
    });

    // Extract the first entity (the track)
    const entityId = data.entityUniqueId;
    const entity = data.entitiesByUniqueId[entityId];

    if (!entity) {
      console.error('[Songlink] No entity found in response');
      return null;
    }

    // Normalize the data
    const normalizedTrack: NormalizedTrack = {
      songlinkId: entityId,
      title: entity.title || 'Unknown Title',
      artist: entity.artistName || 'Unknown Artist',
      artworkUrl: entity.thumbnailUrl || '',
      spotifyUrl: data.linksByPlatform.spotify?.url,
      appleMusicUrl: data.linksByPlatform.appleMusic?.url,
      youtubeUrl: data.linksByPlatform.youtube?.url,
      soundcloudUrl: data.linksByPlatform.soundcloud?.url,
      youtubeMusicUrl: data.linksByPlatform.youtubeMusic?.url,
      tidalUrl: data.linksByPlatform.tidal?.url,
      songlinkPageUrl: data.pageUrl,
    };

    console.log('[Songlink] Normalized track:', {
      title: normalizedTrack.title,
      artist: normalizedTrack.artist,
      platforms: Object.keys(data.linksByPlatform || {}).length,
    });

    return normalizedTrack;
  } catch (error) {
    console.error('[Songlink] Error fetching data:', error);
    return null;
  }
}

/**
 * Detect platform from URL
 * @param url - Music URL
 * @returns Platform name from MusicPlatform union
 */
export function detectPlatform(url: string): MusicPlatform {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('spotify.com')) return 'spotify';
  if (urlLower.includes('music.apple.com')) return 'apple music';
  if (urlLower.includes('bandcamp.com')) return 'bandcamp';
  if (urlLower.includes('music.youtube.com') || urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  }
  if (urlLower.includes('soundcloud.com')) return 'soundcloud';

  return 'other';
}
