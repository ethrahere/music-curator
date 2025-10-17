# Database Schema Documentation

## Overview

Curio uses Supabase (PostgreSQL) with a schema optimized for Farcaster integration and real-time scoring updates.

## Core Tables

### `users`

Stores user profiles and curator reputation.

```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farcaster_fid INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  farcaster_pfp_url TEXT,
  wallet_address TEXT,                    -- Primary wallet for USDC tips
  curator_score BIGINT DEFAULT 0,         -- Calculated reputation score
  notification_token TEXT,                -- For push notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_farcaster_fid ON users(farcaster_fid);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
```

**Key Columns:**
- `farcaster_fid`: Unique Farcaster user ID (primary identifier)
- `wallet_address`: Captured from SDK for USDC tipping
- `curator_score`: Auto-updated via triggers (see [CURATOR_SCORE.md](./CURATOR_SCORE.md))

### `recommendations`

Stores music tracks shared by curators.

```sql
CREATE TABLE recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curator_fid INTEGER NOT NULL REFERENCES users(farcaster_fid),
  music_url TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  review TEXT,
  genre TEXT NOT NULL,
  moods TEXT[] DEFAULT '{}',
  platform TEXT,                          -- spotify, soundcloud, youtube
  artwork_url TEXT,
  embed_url TEXT,
  co_sign_count INTEGER DEFAULT 0,        -- Cached count
  tip_count INTEGER DEFAULT 0,            -- Number of tips received
  total_tips_usd DECIMAL(10, 2) DEFAULT 0,-- Total USDC received
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recommendations_curator ON recommendations(curator_fid);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX idx_recommendations_total_tips_usd ON recommendations(total_tips_usd DESC);
CREATE INDEX idx_recommendations_genre ON recommendations(genre);
```

**Key Columns:**
- `curator_fid`: References `users(farcaster_fid)`
- `co_sign_count`: Denormalized for performance
- `total_tips_usd`: Sum of all tips in USD

### `co_signs`

Tracks user co-signs (free appreciation) for tracks.

```sql
CREATE TABLE co_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  user_fid INTEGER NOT NULL REFERENCES users(farcaster_fid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recommendation_id, user_fid)     -- One co-sign per user per track
);

-- Indexes
CREATE INDEX idx_cosigns_recommendation ON co_signs(recommendation_id);
CREATE INDEX idx_cosigns_user ON co_signs(user_fid);
```

**Constraints:**
- Users can only co-sign each track once
- Co-signs cascade delete with track

### `tips`

Records USDC tips sent between users.

```sql
CREATE TABLE tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  tipper_fid INTEGER NOT NULL REFERENCES users(farcaster_fid),
  curator_fid INTEGER NOT NULL REFERENCES users(farcaster_fid),
  amount INTEGER DEFAULT 0,               -- Legacy field (unused)
  amount_usd DECIMAL(10, 2),              -- Actual USDC amount
  transaction_hash TEXT,                  -- Base blockchain tx hash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tips_recommendation ON tips(recommendation_id);
CREATE INDEX idx_tips_tipper ON tips(tipper_fid);
CREATE INDEX idx_tips_curator ON tips(curator_fid);
CREATE INDEX idx_tips_created_at ON tips(created_at DESC);
```

**Key Columns:**
- `amount_usd`: USDC amount (6 decimals on-chain, stored as decimal)
- `transaction_hash`: Links to Base blockchain transaction

## Configuration Tables

### `scoring_config`

Centralized configuration for curator score calculations.

```sql
CREATE TABLE scoring_config (
  id SERIAL PRIMARY KEY,
  points_per_cosign INTEGER DEFAULT 1,
  points_per_usdc INTEGER DEFAULT 5
);

-- Initialize with default values
INSERT INTO scoring_config DEFAULT VALUES;
```

**Usage:**
- Update these values to change scoring weights globally
- See [CURATOR_SCORE.md](./CURATOR_SCORE.md) for details

## Database Triggers

### Automatic Curator Score Updates

The system uses PostgreSQL triggers to maintain score accuracy:

#### 1. Co-sign Trigger

```sql
CREATE OR REPLACE FUNCTION update_cosign_count()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_curator_fid INTEGER;
BEGIN
  SELECT points_per_cosign INTO v_points FROM scoring_config LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    -- Increment recommendation co_sign_count
    UPDATE recommendations
      SET co_sign_count = co_sign_count + 1
      WHERE id = NEW.recommendation_id;

    -- Add points to curator_score
    SELECT curator_fid INTO v_curator_fid
      FROM recommendations WHERE id = NEW.recommendation_id;

    UPDATE users
      SET curator_score = curator_score + v_points
      WHERE farcaster_fid = v_curator_fid;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement co_sign_count
    UPDATE recommendations
      SET co_sign_count = GREATEST(co_sign_count - 1, 0)
      WHERE id = OLD.recommendation_id;

    -- Subtract points from curator_score
    SELECT curator_fid INTO v_curator_fid
      FROM recommendations WHERE id = OLD.recommendation_id;

    UPDATE users
      SET curator_score = GREATEST(curator_score - v_points, 0)
      WHERE farcaster_fid = v_curator_fid;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cosign_count_trigger
AFTER INSERT OR DELETE ON co_signs
FOR EACH ROW EXECUTE FUNCTION update_cosign_count();
```

#### 2. Tip Trigger

```sql
CREATE OR REPLACE FUNCTION update_curator_score_on_tip()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  SELECT points_per_usdc INTO v_points FROM scoring_config LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    UPDATE users
      SET curator_score = curator_score + ROUND(NEW.amount_usd * v_points)
      WHERE farcaster_fid = NEW.curator_fid;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tip_score_trigger
AFTER INSERT ON tips
FOR EACH ROW EXECUTE FUNCTION update_curator_score_on_tip();
```

#### 3. Recommendation Delete Trigger

```sql
CREATE OR REPLACE FUNCTION adjust_score_on_recommendation_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_total_cosigns INTEGER;
BEGIN
  SELECT points_per_cosign INTO v_points FROM scoring_config LIMIT 1;
  SELECT COUNT(*) INTO v_total_cosigns FROM co_signs WHERE recommendation_id = OLD.id;

  UPDATE users
    SET curator_score = GREATEST(curator_score - (v_total_cosigns * v_points), 0)
    WHERE farcaster_fid = OLD.curator_fid;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rec_delete_score_trigger
AFTER DELETE ON recommendations
FOR EACH ROW EXECUTE FUNCTION adjust_score_on_recommendation_delete();
```

## Row Level Security (RLS)

### Current Policies

All tables currently use permissive RLS for development:

```sql
-- Users
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (true);

-- Recommendations
CREATE POLICY "Recommendations are viewable by everyone" ON recommendations FOR SELECT USING (true);
CREATE POLICY "Anyone can create recommendations" ON recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own recommendations" ON recommendations FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own recommendations" ON recommendations FOR DELETE USING (true);

-- Tips
CREATE POLICY "Tips are viewable by everyone" ON tips FOR SELECT USING (true);
CREATE POLICY "Anyone can create tips" ON tips FOR INSERT WITH CHECK (true);
```

### Future RLS Improvements

For production, consider:

1. **User Authentication**: Restrict updates to authenticated users
2. **Ownership Checks**: Users can only modify their own data
3. **Tip Validation**: Ensure tip amounts match blockchain transactions

## Common Queries

### Get Curator Leaderboard

```sql
SELECT
  username,
  curator_score,
  (SELECT COUNT(*) FROM recommendations WHERE curator_fid = users.farcaster_fid) as track_count,
  (SELECT COUNT(*) FROM co_signs cs JOIN recommendations r ON cs.recommendation_id = r.id WHERE r.curator_fid = users.farcaster_fid) as total_cosigns,
  (SELECT COALESCE(SUM(amount_usd), 0) FROM tips WHERE curator_fid = users.farcaster_fid) as total_tips_usd
FROM users
WHERE curator_score > 0
ORDER BY curator_score DESC
LIMIT 10;
```

### Get Track with Full Details

```sql
SELECT
  r.*,
  u.username as curator_username,
  u.farcaster_pfp_url as curator_pfp,
  u.curator_score,
  r.co_sign_count,
  r.total_tips_usd,
  (SELECT COUNT(*) FROM tips WHERE recommendation_id = r.id) as tip_count
FROM recommendations r
JOIN users u ON r.curator_fid = u.farcaster_fid
WHERE r.id = 'track-uuid'
LIMIT 1;
```

### Get User's Co-signed Tracks

```sql
SELECT
  r.*,
  curator.username as curator_username,
  cs.created_at as cosigned_at
FROM co_signs cs
JOIN recommendations r ON cs.recommendation_id = r.id
JOIN users curator ON r.curator_fid = curator.farcaster_fid
WHERE cs.user_fid = 1001313
ORDER BY cs.created_at DESC;
```

## Migrations

All schema changes are managed via SQL migrations in `supabase/migrations/`:

```
001_initial_schema.sql          # Base tables
002_add_farcaster_fields.sql    # Farcaster integration
003_add_signer_columns.sql      # Legacy signer support
004_add_signer_confirmed_at.sql # Signer timestamps
005_add_music_fields.sql        # Track metadata
006_add_tips_table.sql          # USDC tipping
007_add_profile_fields.sql      # User profiles
008_add_wallet_address.sql      # Wallet capture
009_add_cosign_and_curator_score.sql  # Scoring system
```

To apply migrations:

```bash
# Via Supabase CLI
supabase db push

# Or manually via SQL editor in Supabase dashboard
```

## Backup & Recovery

### Backup Current Schema

```bash
# Export full schema
supabase db dump -f schema.sql

# Export data only
supabase db dump --data-only -f data.sql
```

### Restore from Backup

```bash
# Restore schema
psql $DATABASE_URL < schema.sql

# Restore data
psql $DATABASE_URL < data.sql
```

## Performance Considerations

### Indexes

Critical indexes for performance:
- `users(farcaster_fid)` - Fast user lookups
- `recommendations(created_at DESC)` - Feed pagination
- `recommendations(total_tips_usd DESC)` - Leaderboard sorting
- `co_signs(recommendation_id, user_fid)` - Co-sign checks

### Denormalization

Denormalized fields for speed:
- `recommendations.co_sign_count` - Avoid COUNT queries
- `recommendations.total_tips_usd` - Avoid SUM queries
- `users.curator_score` - Fast leaderboard queries

Trade-off: Must maintain consistency via triggers

### Query Optimization Tips

1. **Use indexes**: Always filter by indexed columns first
2. **Limit results**: Use `LIMIT` for pagination
3. **Avoid N+1**: Use JOINs or IN clauses instead of multiple queries
4. **Cache aggregates**: Store counts/sums in denormalized columns

## Related Documentation

- [Curator Score System](./CURATOR_SCORE.md)
- [Tipping System](./TIPPING_FIX.md)
- [Query Patterns](./SUPABASE_QUERY_PATTERNS.md)
