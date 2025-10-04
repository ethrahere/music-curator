-- Add music-specific fields to recommendations table
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('youtube', 'spotify', 'soundcloud', 'bandcamp', 'other')) DEFAULT 'other',
ADD COLUMN IF NOT EXISTS artwork_url TEXT,
ADD COLUMN IF NOT EXISTS embed_url TEXT;

-- Create index for faster platform filtering
CREATE INDEX IF NOT EXISTS idx_recommendations_platform ON recommendations(platform);

-- Create index for most tipped tracks
CREATE INDEX IF NOT EXISTS idx_recommendations_tip_count ON recommendations(tip_count DESC);
