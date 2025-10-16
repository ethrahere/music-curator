export type MusicPlatform = 'youtube' | 'spotify' | 'soundcloud' | 'bandcamp' | 'apple music' | 'other';

export interface MusicTrack {
  id: string;
  url: string; // original streaming link
  platform: MusicPlatform;
  title: string;
  artist: string;
  artwork: string;
  embedUrl: string; // iframe embed URL
  tips: number;
  sharedBy: {
    fid: number;
    username: string;
    curatorScore?: number;
    pfpUrl?: string;
    walletAddress?: string; // Primary wallet address for tips
  };
  timestamp: number;
  review?: string;
}

export interface MusicMetadata {
  title: string;
  artist: string;
  artwork: string;
  embedUrl: string;
  platform: MusicPlatform;
}
