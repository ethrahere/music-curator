-- ============================================
-- STEP 2: CLEAN AND PREPARE USERS TABLE
-- ============================================
-- Run this after Step 1 backup is complete

-- Ensure all users have farcaster_fid (required for primary key)
UPDATE users
SET farcaster_fid = 0
WHERE farcaster_fid IS NULL;

-- Standardize username field (prefer farcaster_username, fallback to username, then address)
UPDATE users
SET username = COALESCE(
  NULLIF(TRIM(farcaster_username), ''),
  NULLIF(TRIM(username), ''),
  NULLIF(TRIM(address), '')
)
WHERE username IS NULL OR username = '';

-- Check for duplicate FIDs (these need to be resolved manually)
SELECT 'Duplicate FIDs found (must fix before migration)' as warning, farcaster_fid, COUNT(*)
FROM users
WHERE farcaster_fid != 0
GROUP BY farcaster_fid
HAVING COUNT(*) > 1;

-- Check for users without FID (these need FIDs assigned)
SELECT 'Users without valid FID' as warning, id, address, username, farcaster_username
FROM users
WHERE farcaster_fid IS NULL OR farcaster_fid = 0;

-- Verify users table is ready
SELECT 'Users ready for migration' as status, COUNT(*) as count
FROM users
WHERE farcaster_fid IS NOT NULL AND farcaster_fid > 0;
