-- ============================================
-- STEP 3: MIGRATE TO FID-BASED SCHEMA
-- ============================================
-- Run this after Step 2 is complete and verified

-- ==========================================
-- 3.1: DROP EXISTING CONSTRAINTS
-- ==========================================

ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_curator_address_fkey;
ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_tipper_address_fkey;
ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_curator_address_fkey;

-- ==========================================
-- 3.2: ADD TEMPORARY FID COLUMNS
-- ==========================================

ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS curator_fid INTEGER;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS tipper_fid INTEGER;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS curator_fid_new INTEGER;

-- ==========================================
-- 3.3: POPULATE FID COLUMNS FROM EXISTING DATA
-- ==========================================

-- Populate recommendations.curator_fid
UPDATE recommendations r
SET curator_fid = (
  SELECT u.farcaster_fid
  FROM users u
  WHERE u.username = r.curator_address
     OR u.address = r.curator_address
     OR u.farcaster_username = r.curator_address
     OR ('fid:' || u.farcaster_fid::TEXT) = r.curator_address
  LIMIT 1
);

-- Populate tips.tipper_fid
UPDATE tips t
SET tipper_fid = (
  SELECT u.farcaster_fid
  FROM users u
  WHERE u.username = t.tipper_address
     OR u.address = t.tipper_address
     OR u.farcaster_username = t.tipper_address
     OR ('fid:' || u.farcaster_fid::TEXT) = t.tipper_address
     OR u.farcaster_fid::TEXT = REPLACE(t.tipper_address, 'fid:', '')
  LIMIT 1
);

-- Populate tips.curator_fid_new
UPDATE tips t
SET curator_fid_new = (
  SELECT u.farcaster_fid
  FROM users u
  WHERE u.username = t.curator_address
     OR u.address = t.curator_address
     OR u.farcaster_username = t.curator_address
     OR ('fid:' || u.farcaster_fid::TEXT) = t.curator_address
     OR u.farcaster_fid::TEXT = REPLACE(t.curator_address, 'fid:', '')
  LIMIT 1
);

-- ==========================================
-- 3.4: VERIFY DATA MIGRATION
-- ==========================================

-- Check for unmapped recommendations
SELECT 'Recommendations without curator_fid' as warning, COUNT(*)
FROM recommendations
WHERE curator_fid IS NULL;

-- Check for unmapped tips
SELECT 'Tips without tipper_fid' as warning, COUNT(*)
FROM tips
WHERE tipper_fid IS NULL;

SELECT 'Tips without curator_fid' as warning, COUNT(*)
FROM tips
WHERE curator_fid_new IS NULL;

-- Show sample of migrated data
SELECT 'Sample migrated recommendation' as info;
SELECT id, curator_address, curator_fid, song_title FROM recommendations LIMIT 3;

SELECT 'Sample migrated tip' as info;
SELECT id, tipper_address, tipper_fid, curator_address, curator_fid_new FROM tips LIMIT 3;

-- ==========================================
-- 3.5: DROP OLD COLUMNS AND RENAME NEW ONES
-- ==========================================

ALTER TABLE recommendations DROP COLUMN curator_address;
ALTER TABLE tips DROP COLUMN tipper_address;
ALTER TABLE tips DROP COLUMN curator_address;
ALTER TABLE tips RENAME COLUMN curator_fid_new TO curator_fid;

-- ==========================================
-- 3.6: SET UP USERS TABLE PRIMARY KEY
-- ==========================================

-- Drop existing primary key if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

-- Make farcaster_fid the primary key
ALTER TABLE users ADD PRIMARY KEY (farcaster_fid);

-- Make farcaster_fid NOT NULL
ALTER TABLE users ALTER COLUMN farcaster_fid SET NOT NULL;

-- ==========================================
-- 3.7: ADD FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Add NOT NULL constraints first
ALTER TABLE recommendations ALTER COLUMN curator_fid SET NOT NULL;
ALTER TABLE tips ALTER COLUMN tipper_fid SET NOT NULL;
ALTER TABLE tips ALTER COLUMN curator_fid SET NOT NULL;

-- Add foreign keys
ALTER TABLE recommendations
  ADD CONSTRAINT fk_curator
  FOREIGN KEY (curator_fid)
  REFERENCES users(farcaster_fid)
  ON DELETE CASCADE;

ALTER TABLE tips
  ADD CONSTRAINT fk_tipper
  FOREIGN KEY (tipper_fid)
  REFERENCES users(farcaster_fid)
  ON DELETE CASCADE;

ALTER TABLE tips
  ADD CONSTRAINT fk_curator_tips
  FOREIGN KEY (curator_fid)
  REFERENCES users(farcaster_fid)
  ON DELETE CASCADE;

-- ==========================================
-- 3.8: CLEAN UP USERS TABLE (OPTIONAL)
-- ==========================================

-- Remove redundant columns
ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users DROP COLUMN IF EXISTS farcaster_username;

-- Keep: farcaster_fid, username, farcaster_display_name, farcaster_pfp_url, bio, notification_token

SELECT 'Migration complete!' as status;
