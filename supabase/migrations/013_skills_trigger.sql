-- Skills Badge Engine: Auto-award skill badges when courses are completed

-- Function to check and award skill badge when a module is completed
CREATE OR REPLACE FUNCTION award_skill_on_course_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id UUID;
  v_skill_tag TEXT;
  v_total_modules INTEGER;
  v_completed_modules INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the course_id for this module
    SELECT s.course_id INTO v_course_id
    FROM modules m
    JOIN sections s ON s.id = m.section_id
    WHERE m.id = NEW.module_id;

    IF v_course_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get the skill_tag for this course
    SELECT skill_tag INTO v_skill_tag
    FROM courses
    WHERE id = v_course_id;

    IF v_skill_tag IS NULL OR v_skill_tag = '' THEN
      RETURN NEW;
    END IF;

    -- Count total modules in the course
    SELECT COUNT(m.id) INTO v_total_modules
    FROM modules m
    JOIN sections s ON s.id = m.section_id
    WHERE s.course_id = v_course_id;

    -- Count completed modules for this user in this course
    SELECT COUNT(p.id) INTO v_completed_modules
    FROM progress p
    JOIN modules m ON m.id = p.module_id
    JOIN sections s ON s.id = m.section_id
    WHERE s.course_id = v_course_id
      AND p.user_id = NEW.user_id
      AND p.status = 'completed'
      AND p.completed = true;

    -- If all modules are completed, award the skill badge
    IF v_completed_modules >= v_total_modules THEN
      INSERT INTO skills_earned (user_id, skill_tag, earned_at)
      VALUES (NEW.user_id, v_skill_tag, NOW())
      ON CONFLICT (user_id, skill_tag) DO NOTHING;

      RAISE NOTICE 'Skill badge awarded: % for user %', v_skill_tag, NEW.user_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on progress table
DROP TRIGGER IF EXISTS trigger_award_skill_on_completion ON progress;

CREATE TRIGGER trigger_award_skill_on_completion
  AFTER UPDATE ON progress
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION award_skill_on_course_completion();

COMMENT ON FUNCTION award_skill_on_course_completion() IS 'Auto-awards skill badges when all modules in a course are completed';
COMMENT ON TRIGGER trigger_award_skill_on_completion ON progress IS 'Triggers skill badge award on module completion';
