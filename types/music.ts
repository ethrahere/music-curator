export type MusicPlatform = 'youtube' | 'spotify' | 'soundcloud' | 'bandcamp' | 'other';

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
  };
  timestamp: number;
}

export interface MusicMetadata {
  title: string;
  artist: string;
  artwork: string;
  embedUrl: string;
  platform: MusicPlatform;
}
