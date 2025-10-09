-- Migration: Add badges column to users table
-- Run this in your Supabase SQL editor

-- Add badges column as JSONB array
ALTER TABLE users
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.badges IS 'Array of badge objects earned by the user. Format: [{"id": "early_curator", "name": "Early Curator", "earnedAt": "2024-01-01T00:00:00Z"}]';

-- Example badges structure:
-- [
--   {"id": "early_curator", "name": "Early Curator", "earnedAt": "2024-01-01T00:00:00Z"},
--   {"id": "first_share", "name": "First Share", "earnedAt": "2024-01-15T00:00:00Z"},
--   {"id": "first_tip", "name": "First Tip", "earnedAt": "2024-01-20T00:00:00Z"}
-- ]
