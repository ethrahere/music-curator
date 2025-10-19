-- Migration: Songlink Integration
-- This migration creates a separate tracks table and updates recommendations to reference it
-- This enables track deduplication and multi-platform link storage

-- Create tracks table with canonical track data
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  songlink_id TEXT UNIQUE NOT NULL, -- Canonical identifier from Songlink API
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_artwork_url TEXT,

  -- Platform URLs (all optional, stored from Songlink response)
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_url TEXT,
  soundcloud_url TEXT,
  youtube_music_url TEXT,
  tidal_url TEXT,
  songlink_page_url TEXT, -- The song.link page itself

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on songlink_id for fast lookups (caching)
CREATE INDEX IF NOT EXISTS idx_tracks_songlink_id ON tracks(songlink_id);

-- Add index on title and artist for search
CREATE INDEX IF NOT EXISTS idx_tracks_title_artist ON tracks(title, artist);

-- Update recommendations table to reference tracks
-- Add new columns (reusing existing music_url and review columns)
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE; -- For future token gating

-- Make old fields nullable for backward compatibility during migration
-- These will be deprecated in favor of data from tracks table
ALTER TABLE recommendations
  ALTER COLUMN music_url DROP NOT NULL,
  ALTER COLUMN song_title DROP NOT NULL,
  ALTER COLUMN artist DROP NOT NULL,
  ALTER COLUMN review DROP NOT NULL;

-- Update comments to reflect new usage
COMMENT ON COLUMN recommendations.music_url IS 'The original URL the curator submitted (could be any platform).';
COMMENT ON COLUMN recommendations.review IS 'The curator review or comment about the track.';

-- Create index on track_id for fast joins
CREATE INDEX IF NOT EXISTS idx_recommendations_track_id ON recommendations(track_id);

-- Create index on curator_fid for curator profile lookups
CREATE INDEX IF NOT EXISTS idx_recommendations_curator_fid ON recommendations(curator_fid);

-- Add updated_at trigger for tracks table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the schema
COMMENT ON TABLE tracks IS 'Canonical track data normalized via Songlink API. One row per unique song.';
COMMENT ON TABLE recommendations IS 'Curator recommendations linking to canonical tracks. Multiple curators can recommend the same track.';
COMMENT ON COLUMN tracks.songlink_id IS 'Unique identifier from Songlink API (entityUniqueId). Used for deduplication.';
COMMENT ON COLUMN recommendations.track_id IS 'Foreign key to tracks table. Links recommendation to canonical track.';
COMMENT ON COLUMN recommendations.is_public IS 'Whether this recommendation is publicly visible (for future token gating).';
