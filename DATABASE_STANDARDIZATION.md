# Database Standardization Plan

## Problem
Mixed address formats causing foreign key issues and data confusion:
- Some users: `address = "stmzonline.base.eth"`
- Some users: `address = "fid:1178143"`
- Tracks: `curator_address = "psychonaut"` (username only)

## Solution: Standardize on Farcaster FID

### 1. Users Table Structure

**Primary Key:** Use `farcaster_fid` as the unique identifier

```sql
-- Clean up users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ADD PRIMARY KEY (farcaster_fid);

-- Remove duplicate/confusing columns
ALTER TABLE users DROP COLUMN IF EXISTS farcaster_username; -- redundant with username
ALTER TABLE users DROP COLUMN IF EXISTS address; -- causing confusion

-- Rename for clarity
ALTER TABLE users RENAME COLUMN username TO farcaster_handle;

-- Final users table structure:
-- farcaster_fid (INTEGER, PRIMARY KEY) - unique Farcaster ID
-- farcaster_handle (TEXT) - e.g., "psychonaut", "stmzonline"
-- farcaster_display_name (TEXT) - e.g., "Psychonaut 🎵"
-- farcaster_pfp_url (TEXT) - profile picture
-- bio (TEXT) - user bio
-- notification_token (TEXT) - for notifications
-- created_at, updated_at
```

### 2. Recommendations Table

```sql
-- Update to use FID directly
ALTER TABLE recommendations RENAME COLUMN curator_address TO curator_fid;
ALTER TABLE recommendations ALTER COLUMN curator_fid TYPE INTEGER USING
  CASE
    WHEN curator_fid ~ '^\d+$' THEN curator_fid::INTEGER
    ELSE (SELECT farcaster_fid FROM users WHERE username = curator_fid OR farcaster_username = curator_fid LIMIT 1)
  END;

-- Add foreign key
ALTER TABLE recommendations
  ADD CONSTRAINT fk_curator
  FOREIGN KEY (curator_fid)
  REFERENCES users(farcaster_fid)
  ON DELETE CASCADE;
```

### 3. Tips Table

```sql
-- Update to use FIDs directly
ALTER TABLE tips RENAME COLUMN tipper_address TO tipper_fid;
ALTER TABLE tips RENAME COLUMN curator_address TO curator_fid;

-- Convert existing data
ALTER TABLE tips ALTER COLUMN tipper_fid TYPE INTEGER USING
  CASE
    WHEN tipper_fid LIKE 'fid:%' THEN SUBSTRING(tipper_fid FROM 5)::INTEGER
    ELSE (SELECT farcaster_fid FROM users WHERE address = tipper_fid OR username = tipper_fid LIMIT 1)
  END;

ALTER TABLE tips ALTER COLUMN curator_fid TYPE INTEGER USING
  CASE
    WHEN curator_fid LIKE 'fid:%' THEN SUBSTRING(curator_fid FROM 5)::INTEGER
    ELSE (SELECT farcaster_fid FROM users WHERE address = curator_fid OR username = curator_fid LIMIT 1)
  END;

-- Add foreign keys
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
```

## Migration Steps

### Step 1: Backup Current Data
```sql
-- Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE recommendations_backup AS SELECT * FROM recommendations;
CREATE TABLE tips_backup AS SELECT * FROM tips;
```

### Step 2: Clean Users Table
```sql
-- Ensure all users have farcaster_fid
UPDATE users SET farcaster_fid = 0 WHERE farcaster_fid IS NULL;

-- Standardize username field
UPDATE users SET username = COALESCE(farcaster_username, username, address);

-- Remove FID: prefix from any addresses that have it
UPDATE users SET address = SUBSTRING(address FROM 5) WHERE address LIKE 'fid:%';
```

### Step 3: Apply Schema Changes (in order)
```sql
-- 1. Drop existing foreign keys
ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_curator_address_fkey;
ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_tipper_address_fkey;
ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_curator_address_fkey;

-- 2. Add temporary FID columns
ALTER TABLE recommendations ADD COLUMN curator_fid_temp INTEGER;
ALTER TABLE tips ADD COLUMN tipper_fid_temp INTEGER;
ALTER TABLE tips ADD COLUMN curator_fid_temp INTEGER;

-- 3. Populate FID columns from existing data
UPDATE recommendations SET curator_fid_temp = (
  SELECT farcaster_fid FROM users
  WHERE users.username = recommendations.curator_address
     OR users.address = recommendations.curator_address
     OR users.farcaster_username = recommendations.curator_address
  LIMIT 1
);

UPDATE tips SET tipper_fid_temp = (
  SELECT farcaster_fid FROM users
  WHERE users.username = REPLACE(tips.tipper_address, 'fid:', '')::INTEGER::TEXT
     OR users.farcaster_fid = NULLIF(REPLACE(tips.tipper_address, 'fid:', ''), '')::INTEGER
     OR users.address = tips.tipper_address
  LIMIT 1
);

UPDATE tips SET curator_fid_temp = (
  SELECT farcaster_fid FROM users
  WHERE users.username = REPLACE(tips.curator_address, 'fid:', '')::INTEGER::TEXT
     OR users.farcaster_fid = NULLIF(REPLACE(tips.curator_address, 'fid:', ''), '')::INTEGER
     OR users.address = tips.curator_address
  LIMIT 1
);

-- 4. Drop old columns
ALTER TABLE recommendations DROP COLUMN curator_address;
ALTER TABLE tips DROP COLUMN tipper_address;
ALTER TABLE tips DROP COLUMN curator_address;

-- 5. Rename temp columns
ALTER TABLE recommendations RENAME COLUMN curator_fid_temp TO curator_fid;
ALTER TABLE tips RENAME COLUMN tipper_fid_temp TO tipper_fid;
ALTER TABLE tips RENAME COLUMN curator_fid_temp TO curator_fid;

-- 6. Make users.farcaster_fid the primary key
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ADD PRIMARY KEY (farcaster_fid);

-- 7. Add foreign keys
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

-- 8. Clean up users table (optional)
ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users DROP COLUMN IF EXISTS farcaster_username;
```

### Step 4: Verify Data Integrity
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM recommendations WHERE curator_fid NOT IN (SELECT farcaster_fid FROM users);
SELECT COUNT(*) FROM tips WHERE tipper_fid NOT IN (SELECT farcaster_fid FROM users);
SELECT COUNT(*) FROM tips WHERE curator_fid NOT IN (SELECT farcaster_fid FROM users);

-- Check all relationships work
SELECT r.*, u.username
FROM recommendations r
JOIN users u ON r.curator_fid = u.farcaster_fid
LIMIT 5;

SELECT t.*, u1.username as tipper, u2.username as curator
FROM tips t
JOIN users u1 ON t.tipper_fid = u1.farcaster_fid
JOIN users u2 ON t.curator_fid = u2.farcaster_fid
LIMIT 5;
```

## Code Changes Required

### 1. Update API Routes

**app/api/tracks/route.ts** - Track listing
```typescript
const { data, error } = await supabase
  .from('recommendations')
  .select(`
    *,
    curator:users!curator_fid(farcaster_fid, username, farcaster_pfp_url)
  `)
```

**app/api/tracks/[id]/tip/route.ts** - Tipping
```typescript
// Get curator by FID
const { data: curator } = await supabase
  .from('users')
  .select('farcaster_fid, username, notification_token')
  .eq('farcaster_fid', toFid)
  .single();

// Ensure tipper exists
await supabase.from('users').upsert({
  farcaster_fid: fromFid,
  username: tipperUsername,
});

// Insert tip
const tipInsertData = {
  recommendation_id: id,
  tipper_fid: fromFid,
  curator_fid: toFid,
  amount_usd: requestedAmount,
  transaction_hash: txHash,
};
```

**app/api/users/[username]/stats/route.ts** - User stats
```typescript
// Lookup user by username
const { data: user } = await supabase
  .from('users')
  .select('farcaster_fid')
  .eq('username', username)
  .single();

// Get stats
const { data: recommendations } = await supabase
  .from('recommendations')
  .select('*')
  .eq('curator_fid', user.farcaster_fid);
```

### 2. Update TypeScript Types

```typescript
// types/music.ts
export interface MusicTrack {
  id: string;
  url: string;
  platform: string;
  title: string;
  artist: string;
  artwork: string;
  embedUrl: string;
  tips: number;
  sharedBy: {
    fid: number;          // Farcaster FID
    username: string;     // Farcaster handle
  };
  timestamp: number;
}

// Database types
export interface User {
  farcaster_fid: number;           // Primary key
  username: string;                // Farcaster handle
  farcaster_display_name?: string;
  farcaster_pfp_url?: string;
  bio?: string;
  notification_token?: string;
}

export interface Recommendation {
  id: string;
  curator_fid: number;  // References users.farcaster_fid
  music_url: string;
  song_title: string;
  artist: string;
  // ... other fields
}

export interface Tip {
  id: string;
  recommendation_id: string;
  tipper_fid: number;   // References users.farcaster_fid
  curator_fid: number;  // References users.farcaster_fid
  amount_usd: number;
  transaction_hash: string;
}
```

## Benefits of This Approach

1. ✅ **Single source of truth**: FID is the unique identifier
2. ✅ **No format confusion**: No more "fid:xxx" strings, just integers
3. ✅ **Foreign keys work properly**: Referential integrity enforced
4. ✅ **Simpler queries**: Direct JOINs instead of string matching
5. ✅ **Better performance**: Integer comparisons are faster
6. ✅ **Easier to reason about**: Clear relationships

## Rollback Plan

If something goes wrong:
```sql
-- Restore from backup
DROP TABLE users;
DROP TABLE recommendations;
DROP TABLE tips;

CREATE TABLE users AS SELECT * FROM users_backup;
CREATE TABLE recommendations AS SELECT * FROM recommendations_backup;
CREATE TABLE tips AS SELECT * FROM tips_backup;
```
