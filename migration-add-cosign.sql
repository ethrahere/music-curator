-- ============================================================
--  Curio Reputation System v2
--  Adds co-signs, dynamic curator scoring, and safe triggers
-- ============================================================

-- 1️⃣  Co-signs table
CREATE TABLE IF NOT EXISTS co_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  user_fid INTEGER NOT NULL REFERENCES users(farcaster_fid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recommendation_id, user_fid)
);

CREATE INDEX IF NOT EXISTS idx_cosigns_recommendation ON co_signs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_cosigns_user ON co_signs(user_fid);

COMMENT ON TABLE co_signs IS 'Tracks user co-signs (free support) for music recommendations';

-- ------------------------------------------------------------

-- 2️⃣  Extend recommendations + users
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS co_sign_count INTEGER DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS curator_score BIGINT DEFAULT 0;

COMMENT ON COLUMN recommendations.co_sign_count IS 'Number of co-signs this recommendation has received';
COMMENT ON COLUMN users.curator_score IS 'Combined score: tips (5 pts/USDC) + co-signs (1 pt each)';

-- ------------------------------------------------------------

-- 3️⃣  Scoring configuration (for tunable weights)
CREATE TABLE IF NOT EXISTS scoring_config (
  id SERIAL PRIMARY KEY,
  points_per_cosign INTEGER DEFAULT 1,
  points_per_usdc INTEGER DEFAULT 5
);

INSERT INTO scoring_config DEFAULT VALUES
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------

-- 4️⃣  Trigger: update co_sign counts + curator scores
CREATE OR REPLACE FUNCTION update_cosign_count()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_curator_fid INTEGER;
BEGIN
  SELECT points_per_cosign INTO v_points FROM scoring_config LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    UPDATE recommendations
      SET co_sign_count = co_sign_count + 1
      WHERE id = NEW.recommendation_id;

    SELECT curator_fid INTO v_curator_fid
      FROM recommendations WHERE id = NEW.recommendation_id;

    UPDATE users
      SET curator_score = curator_score + v_points
      WHERE farcaster_fid = v_curator_fid;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE recommendations
      SET co_sign_count = GREATEST(co_sign_count - 1, 0)
      WHERE id = OLD.recommendation_id;

    SELECT curator_fid INTO v_curator_fid
      FROM recommendations WHERE id = OLD.recommendation_id;

    UPDATE users
      SET curator_score = GREATEST(curator_score - v_points, 0)
      WHERE farcaster_fid = v_curator_fid;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cosign_count_trigger ON co_signs;
CREATE TRIGGER cosign_count_trigger
AFTER INSERT OR DELETE ON co_signs
FOR EACH ROW EXECUTE FUNCTION update_cosign_count();

-- ------------------------------------------------------------

-- 5️⃣  Trigger: update score when tips are received
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

DROP TRIGGER IF EXISTS tip_score_trigger ON tips;
CREATE TRIGGER tip_score_trigger
AFTER INSERT ON tips
FOR EACH ROW EXECUTE FUNCTION update_curator_score_on_tip();

-- ------------------------------------------------------------

-- 6️⃣  Optional: when a recommendation is deleted, subtract its co-sign points
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

DROP TRIGGER IF EXISTS rec_delete_score_trigger ON recommendations;
CREATE TRIGGER rec_delete_score_trigger
AFTER DELETE ON recommendations
FOR EACH ROW EXECUTE FUNCTION adjust_score_on_recommendation_delete();

-- ------------------------------------------------------------

-- 7️⃣  Initialize curator scores for existing data
UPDATE users
SET curator_score = (
  COALESCE((
    SELECT COUNT(*) * (
      SELECT points_per_cosign FROM scoring_config LIMIT 1
    )
    FROM co_signs cs
    JOIN recommendations r ON cs.recommendation_id = r.id
    WHERE r.curator_fid = users.farcaster_fid
  ), 0)
  +
  COALESCE((
    SELECT ROUND(SUM(amount_usd * (
      SELECT points_per_usdc FROM scoring_config LIMIT 1
    )))
    FROM tips
    WHERE curator_fid = users.farcaster_fid
  ), 0)
);

-- ============================================================
-- ✅ Done! Curio Reputation System v2 installed.
-- ============================================================
