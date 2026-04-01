-- 007_badges_streaks.sql
-- V3: Incentive badges and weekly streaks

-- Badge definitions
CREATE TABLE incentive_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT,
  tier badge_tier NOT NULL,
  badge_type badge_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_badges_type ON incentive_badges(badge_type);
CREATE INDEX idx_badges_tier ON incentive_badges(tier);

-- User earned badges
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES incentive_badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Context for how badge was earned (e.g., {streak_weeks: 4})
  context_json JSONB
);

-- Note: Unique constraint for one-time badges is handled by application logic
-- (streaks can be duplicated, other badges are one-time via ON CONFLICT DO NOTHING in triggers)

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_awarded ON user_badges(awarded_at);

-- Weekly streaks tracking
CREATE TABLE weekly_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0 NOT NULL,
  longest_streak INT DEFAULT 0 NOT NULL,
  -- ISO week format: 'YYYY-Www' (e.g., '2024-W15')
  last_target_met_week TEXT
);

-- Enable RLS
ALTER TABLE incentive_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_streaks ENABLE ROW LEVEL SECURITY;

-- Badges: all authenticated users can view badge definitions
DROP POLICY IF EXISTS "All users view badges" ON incentive_badges;
CREATE POLICY "All users view badges"
  ON incentive_badges FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins manage badge definitions
DROP POLICY IF EXISTS "Admins manage badges" ON incentive_badges;
CREATE POLICY "Admins manage badges"
  ON incentive_badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- User badges: users see own, admins see all
DROP POLICY IF EXISTS "Users view own badges" ON user_badges;
CREATE POLICY "Users view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all user badges" ON user_badges;
CREATE POLICY "Admins view all user badges"
  ON user_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only system/admin can award badges
DROP POLICY IF EXISTS "Admins award badges" ON user_badges;
CREATE POLICY "Admins award badges"
  ON user_badges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Weekly streaks: users see own, admins see all
DROP POLICY IF EXISTS "Users view own streaks" ON weekly_streaks;
CREATE POLICY "Users view own streaks"
  ON weekly_streaks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all streaks" ON weekly_streaks;
CREATE POLICY "Admins view all streaks"
  ON weekly_streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================
-- Seed default badges
-- ============================================
INSERT INTO incentive_badges (slug, label, description, icon_emoji, tier, badge_type) VALUES
  -- Time streak badges
  ('week-warrior', 'Week Warrior', 'Met your weekly learning target for 1 week', '🏆', 'bronze', 'time_streak'),
  ('month-master', 'Month Master', 'Met your weekly learning target for 4 consecutive weeks', '🥈', 'silver', 'time_streak'),
  ('gold-learner', 'Gold Learner', 'Met your weekly learning target for 8 consecutive weeks', '🥇', 'gold', 'time_streak'),
  ('platinum-scholar', 'Platinum Scholar', 'Met your weekly learning target for 16 consecutive weeks', '💎', 'platinum', 'time_streak'),
  
  -- Module completion
  ('first-step', 'First Step', 'Completed your first learning module', '👣', 'bronze', 'module_complete'),
  
  -- Course completion (examples)
  ('communication-certified', 'Communication Certified', 'Completed a communication course', '💬', 'silver', 'course_complete'),
  ('leadership-certified', 'Leadership Certified', 'Completed a leadership course', '👑', 'silver', 'course_complete'),
  ('technical-certified', 'Technical Certified', 'Completed a technical course', '⚙️', 'silver', 'course_complete'),
  
  -- Quiz achievements
  ('quiz-ace', 'Quiz Ace', 'Scored 100% on a quiz', '🎯', 'bronze', 'quiz_ace'),
  
  -- Speed achievements
  ('speed-learner', 'Speed Learner', 'Completed a module in under 10 minutes', '⚡', 'bronze', 'speed_learner'),
  
  -- Time-based
  ('early-bird', 'Early Bird', 'Started a learning session before 8 AM', '🌅', 'bronze', 'early_bird');

-- ============================================
-- pg_cron job for weekly target evaluation
-- Runs every Monday at 00:00 UTC
-- ============================================

-- Function to evaluate weekly targets and award badges
CREATE OR REPLACE FUNCTION evaluate_weekly_targets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_hours_worked NUMERIC;
  v_target NUMERIC;
  v_prev_week TEXT;
  v_badge_id UUID;
BEGIN
  -- Calculate previous ISO week string
  v_prev_week := to_char(CURRENT_DATE - INTERVAL '7 days', 'IYYY-"W"IW');
  
  -- Process each user with timesheet data from last week
  FOR v_user IN 
    SELECT DISTINCT ts.user_id, p.id as profile_id
    FROM timesheet_sessions ts
    JOIN profiles p ON p.id = ts.user_id
    WHERE ts.session_date >= (CURRENT_DATE - INTERVAL '7 days')
      AND ts.session_date < CURRENT_DATE
  LOOP
    -- Get user's target
    SELECT COALESCE(
      (SELECT weekly_hours_target FROM time_targets WHERE user_id = v_user.user_id),
      (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL),
      5.0
    ) INTO v_target;
    
    -- Calculate hours worked last week
    SELECT COALESCE(SUM(duration_seconds) / 3600.0, 0)
    INTO v_hours_worked
    FROM timesheet_sessions
    WHERE user_id = v_user.user_id
      AND session_date >= (CURRENT_DATE - INTERVAL '7 days')
      AND session_date < CURRENT_DATE
      AND ended_at IS NOT NULL;
    
    -- Ensure user has a streak record
    INSERT INTO weekly_streaks (user_id, current_streak, longest_streak)
    VALUES (v_user.user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    IF v_hours_worked >= v_target THEN
      -- Target met! Update streak
      UPDATE weekly_streaks
      SET 
        current_streak = CASE 
          WHEN last_target_met_week = to_char(CURRENT_DATE - INTERVAL '14 days', 'IYYY-"W"IW')
          THEN current_streak + 1
          ELSE 1
        END,
        longest_streak = GREATEST(longest_streak, 
          CASE 
            WHEN last_target_met_week = to_char(CURRENT_DATE - INTERVAL '14 days', 'IYYY-"W"IW')
            THEN current_streak + 1
            ELSE 1
          END
        ),
        last_target_met_week = v_prev_week
      WHERE user_id = v_user.user_id;
      
      -- Check and award streak badges
      -- 1 week: Week Warrior (bronze)
      SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'week-warrior';
      IF NOT EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_id = v_user.user_id AND badge_id = v_badge_id
      ) THEN
        INSERT INTO user_badges (user_id, badge_id, context_json)
        VALUES (v_user.user_id, v_badge_id, jsonb_build_object('streak_weeks', 1));
      END IF;
      
      -- 4 weeks: Month Master (silver)
      IF (SELECT current_streak FROM weekly_streaks WHERE user_id = v_user.user_id) >= 4 THEN
        SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'month-master';
        IF NOT EXISTS (
          SELECT 1 FROM user_badges 
          WHERE user_id = v_user.user_id AND badge_id = v_badge_id
        ) THEN
          INSERT INTO user_badges (user_id, badge_id, context_json)
          VALUES (v_user.user_id, v_badge_id, jsonb_build_object('streak_weeks', 4));
        END IF;
      END IF;
      
      -- 8 weeks: Gold Learner
      IF (SELECT current_streak FROM weekly_streaks WHERE user_id = v_user.user_id) >= 8 THEN
        SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'gold-learner';
        IF NOT EXISTS (
          SELECT 1 FROM user_badges 
          WHERE user_id = v_user.user_id AND badge_id = v_badge_id
        ) THEN
          INSERT INTO user_badges (user_id, badge_id, context_json)
          VALUES (v_user.user_id, v_badge_id, jsonb_build_object('streak_weeks', 8));
        END IF;
      END IF;
      
      -- 16 weeks: Platinum Scholar
      IF (SELECT current_streak FROM weekly_streaks WHERE user_id = v_user.user_id) >= 16 THEN
        SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'platinum-scholar';
        IF NOT EXISTS (
          SELECT 1 FROM user_badges 
          WHERE user_id = v_user.user_id AND badge_id = v_badge_id
        ) THEN
          INSERT INTO user_badges (user_id, badge_id, context_json)
          VALUES (v_user.user_id, v_badge_id, jsonb_build_object('streak_weeks', 16));
        END IF;
      END IF;
      
    ELSE
      -- Target not met, reset streak
      UPDATE weekly_streaks
      SET current_streak = 0
      WHERE user_id = v_user.user_id;
    END IF;
  END LOOP;
END;
$$;

-- Schedule the cron job (requires pg_cron extension)
-- Run every Monday at 00:00 UTC
-- Note: This needs to be run by a superuser after pg_cron is enabled
-- SELECT cron.schedule('weekly-target-evaluation', '0 0 * * 1', 'SELECT evaluate_weekly_targets()');

-- ============================================
-- Triggers for other badge types
-- ============================================

-- Trigger: Award 'First Step' badge on first module completion
CREATE OR REPLACE FUNCTION award_first_module_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge_id UUID;
  v_count INT;
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    -- Check if this is user's first completed module
    SELECT COUNT(*) INTO v_count
    FROM progress
    WHERE user_id = NEW.user_id AND completed = TRUE AND id != NEW.id;
    
    IF v_count = 0 THEN
      SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'first-step';
      INSERT INTO user_badges (user_id, badge_id, context_json)
      VALUES (NEW.user_id, v_badge_id, jsonb_build_object('module_id', NEW.module_id))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_first_module_badge
  AFTER INSERT OR UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION award_first_module_badge();

-- Trigger: Award 'Quiz Ace' badge on 100% score
CREATE OR REPLACE FUNCTION award_quiz_ace_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge_id UUID;
BEGIN
  IF NEW.score = 100 THEN
    SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'quiz-ace';
    INSERT INTO user_badges (user_id, badge_id, context_json)
    VALUES (NEW.user_id, v_badge_id, jsonb_build_object('quiz_module_id', NEW.module_id, 'score', NEW.score))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_quiz_ace_badge
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION award_quiz_ace_badge();

-- Trigger: Award 'Speed Learner' badge for < 10 min completion
CREATE OR REPLACE FUNCTION award_speed_learner_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge_id UUID;
BEGIN
  IF NEW.completed = TRUE 
     AND (OLD.completed IS NULL OR OLD.completed = FALSE)
     AND NEW.time_spent_seconds IS NOT NULL 
     AND NEW.time_spent_seconds < 600 THEN
    SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'speed-learner';
    INSERT INTO user_badges (user_id, badge_id, context_json)
    VALUES (NEW.user_id, v_badge_id, jsonb_build_object(
      'module_id', NEW.module_id, 
      'time_seconds', NEW.time_spent_seconds
    ))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_speed_learner_badge
  AFTER INSERT OR UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION award_speed_learner_badge();

-- Trigger: Award 'Early Bird' badge for sessions starting before 8 AM
CREATE OR REPLACE FUNCTION award_early_bird_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge_id UUID;
  v_hour INT;
BEGIN
  -- Extract hour from started_at (user's local time would need timezone handling)
  v_hour := EXTRACT(HOUR FROM NEW.started_at);
  
  IF v_hour < 8 THEN
    SELECT id INTO v_badge_id FROM incentive_badges WHERE slug = 'early-bird';
    INSERT INTO user_badges (user_id, badge_id, context_json)
    VALUES (NEW.user_id, v_badge_id, jsonb_build_object(
      'session_started', NEW.started_at
    ))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_early_bird_badge
  AFTER INSERT ON timesheet_sessions
  FOR EACH ROW
  EXECUTE FUNCTION award_early_bird_badge();
