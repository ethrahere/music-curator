-- ============================================
-- STEP 1: BACKUP ALL TABLES
-- ============================================
-- Run this first to backup your data before any changes

-- Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE recommendations_backup AS SELECT * FROM recommendations;
CREATE TABLE tips_backup AS SELECT * FROM tips;

-- Verify backups
SELECT 'users_backup' as table_name, COUNT(*) as row_count FROM users_backup
UNION ALL
SELECT 'recommendations_backup', COUNT(*) FROM recommendations_backup
UNION ALL
SELECT 'tips_backup', COUNT(*) FROM tips_backup;

-- Check current data state
SELECT 'Current users' as info, COUNT(*) as count FROM users;
SELECT 'Current recommendations' as info, COUNT(*) as count FROM recommendations;
SELECT 'Current tips' as info, COUNT(*) as count FROM tips;

-- Show sample data to understand current format
SELECT 'Sample user data' as info;
SELECT id, address, username, farcaster_username, farcaster_fid FROM users LIMIT 5;

SELECT 'Sample recommendation data' as info;
SELECT id, curator_address, song_title FROM recommendations LIMIT 5;

SELECT 'Sample tip data' as info;
SELECT id, tipper_address, curator_address, amount_usd FROM tips LIMIT 5;
