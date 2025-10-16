-- Add wallet_address column to users table for USDC tipping
-- This stores the primary wallet address from Farcaster SDK context
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Create index for faster wallet address lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Add comment explaining the column
COMMENT ON COLUMN users.wallet_address IS 'Primary wallet address from Farcaster for USDC tips. Captured from SDK context.client.walletAddress';
