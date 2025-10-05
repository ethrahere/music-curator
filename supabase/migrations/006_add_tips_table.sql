-- Modify existing tips table to add USDC tracking
-- Note: Tips table already exists from 001_initial_schema.sql

-- Add USDC amount column (keeping existing INTEGER amount for backwards compatibility)
ALTER TABLE tips
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS transaction_hash TEXT;

-- Add constraint to ensure amount_usd is positive when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tips_amount_usd_positive'
  ) THEN
    ALTER TABLE tips ADD CONSTRAINT tips_amount_usd_positive CHECK (amount_usd IS NULL OR amount_usd > 0);
  END IF;
END $$;

-- Add tip tracking columns to recommendations table
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS total_tips_usd DECIMAL(10, 2) DEFAULT 0;

-- Add notification token to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_token TEXT;

-- Create index for USDC tip sorting
CREATE INDEX IF NOT EXISTS idx_recommendations_total_tips_usd ON recommendations(total_tips_usd DESC);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN tips.amount_usd IS 'Tip amount in USDC (decimal format, sent via Farcaster SDK)';
COMMENT ON COLUMN tips.transaction_hash IS 'Base blockchain transaction hash from Farcaster sendToken';
COMMENT ON COLUMN recommendations.total_tips_usd IS 'Total USD value of all tips received';
COMMENT ON COLUMN users.notification_token IS 'Farcaster notification token for push notifications';
