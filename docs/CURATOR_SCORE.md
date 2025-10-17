# Curator Score System

## Overview

The Curator Score is a reputation metric that measures a curator's influence and quality based on community engagement with their music recommendations.

## Score Calculation

### Current Formula

```
Curator Score = (Co-signs × 1) + (Tips in USDC × 5)
```

### Components

1. **Co-signs** (1 point each)
   - Free way for users to show appreciation
   - Users can co-sign any track once
   - Each co-sign adds 1 point to the curator's score

2. **Tips** (5 points per $1 USD)
   - Monetary appreciation sent in USDC on Base
   - Each $1 USDC tipped adds 5 points
   - Example: $10 tip = 50 points

### Example Calculations

| Co-signs | Tips (USD) | Calculation | Total Score |
|----------|------------|-------------|-------------|
| 10       | $5.00      | (10 × 1) + (5 × 5) | 35 |
| 50       | $20.00     | (50 × 1) + (20 × 5) | 150 |
| 100      | $50.00     | (100 × 1) + (50 × 5) | 350 |

## Implementation

### Database Architecture

#### Tables

**`scoring_config`** - Configuration table for tunable weights
```sql
CREATE TABLE scoring_config (
  id SERIAL PRIMARY KEY,
  points_per_cosign INTEGER DEFAULT 1,
  points_per_usdc INTEGER DEFAULT 5
);
```

**`users.curator_score`** - Denormalized score column
```sql
ALTER TABLE users
  ADD COLUMN curator_score BIGINT DEFAULT 0;
```

### Automatic Updates via Triggers

The score is automatically maintained by PostgreSQL triggers:

#### On Co-sign
```sql
-- When a co-sign is added/removed
CREATE TRIGGER cosign_count_trigger
AFTER INSERT OR DELETE ON co_signs
FOR EACH ROW EXECUTE FUNCTION update_cosign_count();
```

#### On Tip
```sql
-- When a tip is received
CREATE TRIGGER tip_score_trigger
AFTER INSERT ON tips
FOR EACH ROW EXECUTE FUNCTION update_curator_score_on_tip();
```

#### On Recommendation Delete
```sql
-- When a recommendation is deleted
CREATE TRIGGER rec_delete_score_trigger
AFTER DELETE ON recommendations
FOR EACH ROW EXECUTE FUNCTION adjust_score_on_recommendation_delete();
```

### Application Code

Scoring constants are centralized in `lib/curator-score.ts`:

```typescript
export const CURATOR_SCORE_CONFIG = {
  POINTS_PER_COSIGN: 1,
  POINTS_PER_USDC: 5,
} as const;
```

## Updating Score Weights

To change how scores are calculated:

### Option 1: Update Database Config (Recommended)

Update the `scoring_config` table directly:

```sql
-- Update co-sign weight to 2 points
UPDATE scoring_config SET points_per_cosign = 2;

-- Update tip weight to 10 points per USDC
UPDATE scoring_config SET points_per_usdc = 10;
```

Then recalculate all existing scores:

```sql
-- Recalculate all curator scores based on new weights
UPDATE users
SET curator_score = (
  COALESCE((
    SELECT COUNT(*) * (SELECT points_per_cosign FROM scoring_config LIMIT 1)
    FROM co_signs cs
    JOIN recommendations r ON cs.recommendation_id = r.id
    WHERE r.curator_fid = users.farcaster_fid
  ), 0)
  +
  COALESCE((
    SELECT ROUND(SUM(amount_usd * (SELECT points_per_usdc FROM scoring_config LIMIT 1)))
    FROM tips
    WHERE curator_fid = users.farcaster_fid
  ), 0)
);
```

### Option 2: Update Application Constants

Update constants in `lib/curator-score.ts`:

```typescript
export const CURATOR_SCORE_CONFIG = {
  POINTS_PER_COSIGN: 2,  // Changed from 1
  POINTS_PER_USDC: 10,   // Changed from 5
} as const;
```

**Note:** This only affects new calculations. You must also update the database config for triggers to use new weights.

## Query Examples

### Get Top Curators by Score

```sql
SELECT
  username,
  curator_score,
  (SELECT COUNT(*) FROM recommendations WHERE curator_fid = users.farcaster_fid) as track_count
FROM users
WHERE curator_score > 0
ORDER BY curator_score DESC
LIMIT 10;
```

### Get Score Breakdown for a User

```sql
SELECT
  u.username,
  u.curator_score,
  (
    SELECT COUNT(*)
    FROM co_signs cs
    JOIN recommendations r ON cs.recommendation_id = r.id
    WHERE r.curator_fid = u.farcaster_fid
  ) as total_cosigns,
  (
    SELECT COALESCE(SUM(amount_usd), 0)
    FROM tips
    WHERE curator_fid = u.farcaster_fid
  ) as total_tips_usd
FROM users u
WHERE u.username = 'ethra';
```

## Design Rationale

### Why 5 points per USDC?

Tips require financial commitment, making them a stronger signal of appreciation than free co-signs. The 5:1 ratio ensures that tipping has meaningful impact on curator score while keeping co-signs relevant.

### Why denormalize the score?

Storing the score in `users.curator_score` rather than calculating it on-demand provides:
- Fast queries for leaderboards
- Efficient sorting
- Reduced database load

The trade-off is maintaining consistency via triggers, which PostgreSQL handles reliably.

### Why use triggers instead of application code?

Triggers ensure score updates happen atomically with the underlying data changes, preventing:
- Race conditions
- Missed updates
- Inconsistent state

The score is always accurate, even if updates come from database migrations, manual SQL, or external tools.

## Monitoring

### Check Scoring Config

```sql
SELECT * FROM scoring_config;
```

### Verify Score Accuracy

```sql
-- Compare stored score vs calculated score
SELECT
  u.username,
  u.curator_score as stored_score,
  (
    COALESCE((
      SELECT COUNT(*) * (SELECT points_per_cosign FROM scoring_config LIMIT 1)
      FROM co_signs cs
      JOIN recommendations r ON cs.recommendation_id = r.id
      WHERE r.curator_fid = u.farcaster_fid
    ), 0)
    +
    COALESCE((
      SELECT ROUND(SUM(amount_usd * (SELECT points_per_usdc FROM scoring_config LIMIT 1)))
      FROM tips
      WHERE curator_fid = u.farcaster_fid
    ), 0)
  ) as calculated_score
FROM users u
WHERE u.curator_score != (
  -- same calculation as above
  0
)
LIMIT 10;
```

## Future Enhancements

Possible additions to the scoring system:

1. **Time Decay** - Older co-signs/tips worth less
2. **Velocity Bonus** - Reward curators who get early engagement
3. **Discovery Bonus** - Extra points for sharing tracks before they're popular
4. **Diversity Bonus** - Reward curators who share varied genres
5. **Consistency Bonus** - Reward regular posting activity
6. **Quality Multiplier** - Tracks with higher engagement worth more points

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [Tipping System](./TIPPING_SYSTEM.md)
- [Co-sign Feature](./COSIGN_FEATURE.md)
