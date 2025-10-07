-- ============================================
-- STEP 4: VERIFY MIGRATION SUCCESS
-- ============================================
-- Run this after Step 3 to verify everything worked

-- Check table structures
SELECT 'Users table structure' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT 'Recommendations table structure' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recommendations'
ORDER BY ordinal_position;

SELECT 'Tips table structure' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tips'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 'Foreign key constraints' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('recommendations', 'tips');

-- Verify data integrity
SELECT 'Data counts' as info;
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'recommendations', COUNT(*) FROM recommendations
UNION ALL
SELECT 'tips', COUNT(*) FROM tips;

-- Compare with backup counts
SELECT 'Backup counts' as info;
SELECT 'users_backup' as table_name, COUNT(*) as count FROM users_backup
UNION ALL
SELECT 'recommendations_backup', COUNT(*) FROM recommendations_backup
UNION ALL
SELECT 'tips_backup', COUNT(*) FROM tips_backup;

-- Test joins work correctly
SELECT 'Test recommendation join' as info;
SELECT r.id, r.song_title, r.curator_fid, u.username, u.farcaster_fid
FROM recommendations r
JOIN users u ON r.curator_fid = u.farcaster_fid
LIMIT 5;

SELECT 'Test tips join' as info;
SELECT
    t.id,
    t.amount_usd,
    tipper.username as tipper_username,
    curator.username as curator_username
FROM tips t
JOIN users tipper ON t.tipper_fid = tipper.farcaster_fid
JOIN users curator ON t.curator_fid = curator.farcaster_fid
LIMIT 5;

-- Check for any orphaned records (should be 0)
SELECT 'Orphaned recommendations' as warning, COUNT(*)
FROM recommendations r
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.farcaster_fid = r.curator_fid);

SELECT 'Orphaned tips (tipper)' as warning, COUNT(*)
FROM tips t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.farcaster_fid = t.tipper_fid);

SELECT 'Orphaned tips (curator)' as warning, COUNT(*)
FROM tips t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.farcaster_fid = t.curator_fid);

SELECT '✅ Migration verification complete!' as status;
