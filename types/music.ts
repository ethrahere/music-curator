export type MusicPlatform = 'youtube' | 'spotify' | 'soundcloud' | 'bandcamp' | 'apple music' | 'other';

export interface PlatformLinks {
  spotify?: string;
  appleMusic?: string;
  youtube?: string;
  soundcloud?: string;
  youtubeMusic?: string;
  tidal?: string;
  songlink?: string; // The song.link page itself
}

export interface MusicTrack {
  id: string;
  url: string; // original streaming link (what curator pasted)
  platform: MusicPlatform;
  title: string;
  artist: string;
  artwork: string;
  embedUrl: string; // iframe embed URL
  tips: number;
  coSigns?: number; // Number of co-signs/likes
  sharedBy: {
    fid: number;
    username: string;
    curatorScore?: number;
    pfpUrl?: string;
    walletAddress?: string; // Primary wallet address for tips
  };
  timestamp: number;
  review?: string;
  platformLinks?: PlatformLinks; // All platform links from Songlink API
}

export interface MusicMetadata {
  title: string;
  artist: string;
  artwork: string;
  embedUrl: string;
  platform: MusicPlatform;
}
