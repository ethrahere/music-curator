import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DbTrack = {
  id: string;
  curator_address: string;
  music_url: string;
  song_title: string;
  artist: string;
  album?: string;
  review: string;
  genre: string;
  moods: string[];
  tip_count: number;
  platform: 'youtube' | 'spotify' | 'soundcloud' | 'bandcamp' | 'other';
  artwork_url?: string;
  embed_url?: string;
  created_at: string;
  updated_at: string;
};
