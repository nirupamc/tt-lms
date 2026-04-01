-- Database triggers for automatic badge awarding
-- Migration 019: Badge awarding triggers

-- Helper function to award a badge to a user
CREATE OR REPLACE FUNCTION award_badge_to_user(
  p_user_id UUID,
  p_badge_slug TEXT,
  p_context_json JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_id, awarded_at, context_json)
  SELECT 
    p_user_id,
    ib.id,
    NOW(),
    p_context_json
  FROM incentive_badges ib
  WHERE ib.slug = p_badge_slug
  ON CONFLICT (user_id, badge_id) DO NOTHING; -- Prevent duplicate awards for one-time badges
END;
$$;

-- 1. FIRST STEP BADGE: First completed module
CREATE OR REPLACE FUNCTION trigger_first_step_badge()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  first_completion BOOLEAN;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if this is the user's first completed module
    SELECT NOT EXISTS(
      SELECT 1 FROM progress 
      WHERE user_id = NEW.user_id 
      AND status = 'completed' 
      AND id != NEW.id
    ) INTO first_completion;
    
    IF first_completion THEN
      PERFORM award_badge_to_user(NEW.user_id, 'first-step');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_first_step_after_progress_update
  AFTER INSERT OR UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_first_step_badge();

-- 2. COURSE COMPLETER BADGE: All modules in course completed
CREATE OR REPLACE FUNCTION trigger_course_completer_badge()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  course_skill_tag TEXT;
  course_complete BOOLEAN;
  badge_slug TEXT;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the course's skill_tag for this module
    SELECT c.skill_tag INTO course_skill_tag
    FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE m.id = NEW.module_id;
    
    -- Skip if course has no skill_tag
    IF course_skill_tag IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if all modules in this course are now completed by this user
    SELECT NOT EXISTS(
      SELECT 1 
      FROM modules m
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN progress p ON p.module_id = m.id AND p.user_id = NEW.user_id
      WHERE c.skill_tag = course_skill_tag
      AND c.is_published = true
      AND (p.status IS NULL OR p.status != 'completed')
    ) INTO course_complete;
    
    IF course_complete THEN
      badge_slug := LOWER(course_skill_tag) || '-expert';
      PERFORM award_badge_to_user(
        NEW.user_id, 
        badge_slug, 
        jsonb_build_object('skill_tag', course_skill_tag)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_course_completer_after_progress_update
  AFTER INSERT OR UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_course_completer_badge();

-- 3. QUIZ ACE BADGE: Perfect quiz score
CREATE OR REPLACE FUNCTION trigger_quiz_ace_badge()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Award Quiz Ace for perfect scores
  IF NEW.score_percent = 100 THEN
    PERFORM award_badge_to_user(
      NEW.user_id, 
      'quiz-ace',
      jsonb_build_object('quiz_score', NEW.score_percent, 'module_id', NEW.module_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_quiz_ace_after_quiz_attempt
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_quiz_ace_badge();

-- 4. SPEED LEARNER BADGE: Module completed in under 10 minutes
CREATE OR REPLACE FUNCTION trigger_speed_learner_badge()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  completion_duration INTERVAL;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    completion_duration := NEW.completed_at - NEW.started_at;
    
    -- Award Speed Learner if completed in under 10 minutes
    IF completion_duration < INTERVAL '10 minutes' THEN
      PERFORM award_badge_to_user(
        NEW.user_id, 
        'speed-learner',
        jsonb_build_object(
          'duration_minutes', EXTRACT(EPOCH FROM completion_duration) / 60,
          'module_id', NEW.module_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_speed_learner_after_progress_update
  AFTER INSERT OR UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_speed_learner_badge();

-- 5. EARLY BIRD BADGE: Learning session started before 8 AM
CREATE OR REPLACE FUNCTION trigger_early_bird_badge()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  user_tz TEXT;
  local_hour INTEGER;
  already_has_badge BOOLEAN;
BEGIN
  -- Get user's timezone
  SELECT timezone INTO user_tz
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Calculate local hour
  local_hour := EXTRACT(HOUR FROM (NEW.started_at AT TIME ZONE COALESCE(user_tz, 'UTC')));
  
  -- Check if user already has Early Bird badge (award only once)
  SELECT EXISTS(
    SELECT 1 FROM user_badges ub
    JOIN incentive_badges ib ON ub.badge_id = ib.id
    WHERE ub.user_id = NEW.user_id AND ib.slug = 'early-bird'
  ) INTO already_has_badge;
  
  -- Award Early Bird if session started before 8 AM and user doesn't have it yet
  IF local_hour < 8 AND NOT already_has_badge THEN
    PERFORM award_badge_to_user(
      NEW.user_id, 
      'early-bird',
      jsonb_build_object(
        'session_hour', local_hour,
        'user_timezone', COALESCE(user_tz, 'UTC')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_early_bird_after_session_start
  AFTER INSERT ON timesheet_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_early_bird_badge();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_badge_to_user(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_first_step_badge() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_course_completer_badge() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_quiz_ace_badge() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_speed_learner_badge() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_early_bird_badge() TO authenticated;