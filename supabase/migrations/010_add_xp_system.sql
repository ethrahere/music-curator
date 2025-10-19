-- ============================================================
--  Curio XP System (Gamification)
--  Separate from curator_score for game-like rewards
-- ============================================================

-- 1️⃣  Add XP field to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS xp BIGINT DEFAULT 0;

COMMENT ON COLUMN users.xp IS 'Gamification points - separate from curator_score. Earned through shares, taste overlap, plays, etc.';

-- ------------------------------------------------------------

-- 2️⃣  Create curator_activity table to track XP-earning actions
CREATE TABLE IF NOT EXISTS curator_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_fid INTEGER NOT NULL REFERENCES users(farcaster_fid) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'share', 'taste_overlap', 'play', etc.
  xp_earned INTEGER NOT NULL,
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  metadata JSONB, -- For storing additional context like other curator's info
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curator_activity_fid ON curator_activity(curator_fid);
CREATE INDEX IF NOT EXISTS idx_curator_activity_type ON curator_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_curator_activity_track ON curator_activity(track_id);
CREATE INDEX IF NOT EXISTS idx_curator_activity_created_at ON curator_activity(created_at DESC);

COMMENT ON TABLE curator_activity IS 'Tracks all XP-earning activities for gamification';
COMMENT ON COLUMN curator_activity.activity_type IS 'Type of activity: share, taste_overlap, play, etc.';
COMMENT ON COLUMN curator_activity.metadata IS 'JSON data like {other_curator_fid, other_curator_username} for taste overlap';

-- ------------------------------------------------------------

-- 3️⃣  XP Configuration table (tunable rewards)
CREATE TABLE IF NOT EXISTS xp_config (
  id SERIAL PRIMARY KEY,
  xp_per_share INTEGER DEFAULT 10,
  xp_per_taste_overlap INTEGER DEFAULT 50,
  xp_per_play INTEGER DEFAULT 1,
  xp_per_cosign INTEGER DEFAULT 5
);

INSERT INTO xp_config DEFAULT VALUES
ON CONFLICT DO NOTHING;

COMMENT ON TABLE xp_config IS 'Configurable XP rewards for different activities';

-- ------------------------------------------------------------

-- 4️⃣  Trigger: automatically update user XP when activity is logged
CREATE OR REPLACE FUNCTION update_user_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add XP to user
    UPDATE users
      SET xp = xp + NEW.xp_earned
      WHERE farcaster_fid = NEW.curator_fid;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS curator_activity_xp_trigger ON curator_activity;
CREATE TRIGGER curator_activity_xp_trigger
AFTER INSERT ON curator_activity
FOR EACH ROW EXECUTE FUNCTION update_user_xp();

-- ------------------------------------------------------------

-- 5️⃣  Helper function: log activity and earn XP
CREATE OR REPLACE FUNCTION log_curator_activity(
  p_curator_fid INTEGER,
  p_activity_type TEXT,
  p_xp_earned INTEGER,
  p_recommendation_id UUID DEFAULT NULL,
  p_track_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO curator_activity (
    curator_fid,
    activity_type,
    xp_earned,
    recommendation_id,
    track_id,
    metadata
  ) VALUES (
    p_curator_fid,
    p_activity_type,
    p_xp_earned,
    p_recommendation_id,
    p_track_id,
    p_metadata
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_curator_activity IS 'Logs an activity and automatically awards XP to the curator';

-- ============================================================
-- ✅ Done! XP System installed.
-- ============================================================
