-- Add bio field to users table for profile page
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add followers tracking (for future use)
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_address TEXT NOT NULL,
  following_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (follower_address) REFERENCES users(address) ON DELETE CASCADE,
  FOREIGN KEY (following_address) REFERENCES users(address) ON DELETE CASCADE,
  UNIQUE (follower_address, following_address)
);

-- Create indexes for followers
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_address);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_address);

-- Enable RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_follows
CREATE POLICY "User follows are viewable by everyone"
  ON user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  USING (true);

-- Add comment
COMMENT ON COLUMN users.bio IS 'User biography/description for profile page (max 200 chars)';
COMMENT ON TABLE user_follows IS 'Tracks follower/following relationships between users';
