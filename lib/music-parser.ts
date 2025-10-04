import { MusicMetadata, MusicPlatform } from '@/types/music';

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /music\.youtube\.com\/watch\?v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract Spotify track ID
function extractSpotifyId(url: string): string | null {
  const match = url.match(/spotify\.com\/track\/([^?&\n]+)/);
  return match ? match[1] : null;
}

// Extract SoundCloud track info
function extractSoundCloudInfo(url: string): { url: string } | null {
  if (url.includes('soundcloud.com/')) {
    return { url };
  }
  return null;
}

// Extract Bandcamp track info
function extractBandcampInfo(url: string): { url: string } | null {
  if (url.includes('bandcamp.com/track/')) {
    return { url };
  }
  return null;
}

// Detect platform from URL
export function detectPlatform(url: string): MusicPlatform {
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com')) {
    return 'youtube';
  }
  if (url.includes('spotify.com')) {
    return 'spotify';
  }
  if (url.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  if (url.includes('bandcamp.com')) {
    return 'bandcamp';
  }
  return 'other';
}

// Fetch metadata from oEmbed APIs
async function fetchOEmbed(url: string, platform: MusicPlatform): Promise<Partial<MusicMetadata>> {
  try {
    let oEmbedUrl = '';

    switch (platform) {
      case 'youtube':
        oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        break;
      case 'spotify':
        oEmbedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        break;
      case 'soundcloud':
        oEmbedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        break;
      default:
        return {};
    }

    const response = await fetch(oEmbedUrl);
    if (!response.ok) return {};

    const data = await response.json();

    return {
      title: data.title || 'Unknown Track',
      artist: data.author_name || 'Unknown Artist',
      artwork: data.thumbnail_url || '/placeholder-artwork.png',
    };
  } catch (error) {
    console.error('oEmbed fetch failed:', error);
    return {};
  }
}

// Extract metadata from music URL
export async function extractMusicMetadata(url: string): Promise<MusicMetadata> {
  const platform = detectPlatform(url);
  let embedUrl = '';
  let metadata: Partial<MusicMetadata> = {};

  switch (platform) {
    case 'youtube': {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
        metadata = await fetchOEmbed(url, platform);
      }
      break;
    }
    case 'spotify': {
      const trackId = extractSpotifyId(url);
      if (trackId) {
        embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
        metadata = await fetchOEmbed(url, platform);
      }
      break;
    }
    case 'soundcloud': {
      const info = extractSoundCloudInfo(url);
      if (info) {
        embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(info.url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;
        metadata = await fetchOEmbed(url, platform);
      }
      break;
    }
    case 'bandcamp': {
      const info = extractBandcampInfo(url);
      if (info) {
        // Bandcamp requires extracting album/track ID from URL for embed
        const match = url.match(/\/track\/([^/]+)/);
        if (match) {
          embedUrl = url.replace('/track/', '/EmbeddedPlayer/track=');
        }
      }
      break;
    }
    default:
      break;
  }

  return {
    title: metadata.title || 'Unknown Track',
    artist: metadata.artist || 'Unknown Artist',
    artwork: metadata.artwork || '/placeholder-artwork.png',
    embedUrl,
    platform,
  };
}

// Generate embed URL for player
export function getEmbedUrl(track: { platform: MusicPlatform; embedUrl: string }): string {
  return track.embedUrl;
}

// Validate music URL
export function isValidMusicUrl(url: string): boolean {
  try {
    new URL(url);
    const platform = detectPlatform(url);
    return platform !== 'other' || url.includes('http');
  } catch {
    return false;
  }
}
