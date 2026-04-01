-- 008_module_content_extensions.sql
-- Extend modules table with content fields and create unlock_next_module RPC

-- Add content and milestone fields to modules table
ALTER TABLE modules ADD COLUMN IF NOT EXISTS content_body TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;

-- Add status field to progress table for tracking module state
ALTER TABLE progress ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'locked' 
  CHECK (status IN ('locked', 'in_progress', 'completed', 'pending_review'));

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(user_id, status);

-- ============================================
-- unlock_next_module RPC
-- Called when a user completes a module to unlock the next one
-- ============================================
CREATE OR REPLACE FUNCTION unlock_next_module(
  p_user_id UUID,
  p_module_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_progress RECORD;
  v_current_module RECORD;
  v_next_module RECORD;
  v_course_id UUID;
  v_result JSONB;
BEGIN
  -- Verify the current module is completed
  SELECT * INTO v_current_progress
  FROM progress
  WHERE user_id = p_user_id AND module_id = p_module_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Progress record not found'
    );
  END IF;
  
  IF v_current_progress.status != 'completed' AND v_current_progress.completed != TRUE THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Current module is not completed'
    );
  END IF;
  
  -- Get current module details to find its position
  SELECT m.*, s.course_id, s.sort_order AS section_order
  INTO v_current_module
  FROM modules m
  JOIN sections s ON s.id = m.section_id
  WHERE m.id = p_module_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Module not found'
    );
  END IF;
  
  v_course_id := v_current_module.course_id;
  
  -- Find the next module in sequence
  -- First try to find next module in same section
  SELECT m.* INTO v_next_module
  FROM modules m
  WHERE m.section_id = v_current_module.section_id
    AND m.sort_order > v_current_module.sort_order
  ORDER BY m.sort_order ASC
  LIMIT 1;
  
  -- If no more modules in current section, find first module of next section
  IF NOT FOUND THEN
    SELECT m.* INTO v_next_module
    FROM modules m
    JOIN sections s ON s.id = m.section_id
    WHERE s.course_id = v_course_id
      AND s.sort_order > v_current_module.section_order
    ORDER BY s.sort_order ASC, m.sort_order ASC
    LIMIT 1;
  END IF;
  
  -- If no next module found, course is complete
  IF NOT FOUND THEN
    -- Mark course enrollment as completed
    UPDATE enrollments
    SET completed_at = NOW()
    WHERE user_id = p_user_id AND course_id = v_course_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Course completed! No more modules.',
      'course_completed', TRUE,
      'course_id', v_course_id
    );
  END IF;
  
  -- Upsert progress for the next module to 'in_progress'
  INSERT INTO progress (user_id, module_id, status, completed)
  VALUES (p_user_id, v_next_module.id, 'in_progress', FALSE)
  ON CONFLICT (user_id, module_id) 
  DO UPDATE SET 
    status = 'in_progress',
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'next_module_id', v_next_module.id,
    'next_module_title', v_next_module.title,
    'course_completed', FALSE
  );
END;
$$;

-- ============================================
-- mark_module_complete RPC
-- Marks a module as completed and optionally unlocks next
-- ============================================
CREATE OR REPLACE FUNCTION mark_module_complete(
  p_user_id UUID,
  p_module_id UUID,
  p_unlock_next BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module RECORD;
  v_result JSONB;
BEGIN
  -- Check if module is a milestone
  SELECT * INTO v_module FROM modules WHERE id = p_module_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Module not found');
  END IF;
  
  -- If milestone, don't allow direct completion (needs admin review)
  IF v_module.is_milestone = TRUE THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Milestone modules require submission and admin review'
    );
  END IF;
  
  -- Update progress to completed
  INSERT INTO progress (user_id, module_id, status, completed, completed_at)
  VALUES (p_user_id, p_module_id, 'completed', TRUE, NOW())
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET 
    status = 'completed',
    completed = TRUE,
    completed_at = NOW(),
    updated_at = NOW();
  
  -- Optionally unlock next module
  IF p_unlock_next THEN
    SELECT unlock_next_module(p_user_id, p_module_id) INTO v_result;
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Module completed',
      'next_module', v_result
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Module completed'
  );
END;
$$;

-- ============================================
-- get_course_progress RPC
-- Returns all modules for a course with user's progress status
-- ============================================
CREATE OR REPLACE FUNCTION get_course_progress(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'course_id', p_course_id,
    'total_modules', (
      SELECT COUNT(*) 
      FROM modules m 
      JOIN sections s ON s.id = m.section_id 
      WHERE s.course_id = p_course_id
    ),
    'completed_modules', (
      SELECT COUNT(*) 
      FROM progress p
      JOIN modules m ON m.id = p.module_id
      JOIN sections s ON s.id = m.section_id
      WHERE p.user_id = p_user_id 
        AND s.course_id = p_course_id 
        AND p.completed = TRUE
    ),
    'current_module', (
      SELECT jsonb_build_object('id', m.id, 'title', m.title)
      FROM progress p
      JOIN modules m ON m.id = p.module_id
      JOIN sections s ON s.id = m.section_id
      WHERE p.user_id = p_user_id 
        AND s.course_id = p_course_id 
        AND p.status = 'in_progress'
      LIMIT 1
    ),
    'modules', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'description', m.description,
          'module_type', m.module_type,
          'is_milestone', m.is_milestone,
          'sort_order', m.sort_order,
          'section_id', s.id,
          'section_title', s.title,
          'section_order', s.sort_order,
          'status', COALESCE(p.status, 'locked'),
          'completed', COALESCE(p.completed, FALSE),
          'completed_at', p.completed_at
        ) ORDER BY s.sort_order, m.sort_order
      )
      FROM modules m
      JOIN sections s ON s.id = m.section_id
      LEFT JOIN progress p ON p.module_id = m.id AND p.user_id = p_user_id
      WHERE s.course_id = p_course_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================
-- Initialize first module for new enrollment
-- Trigger to set first module to 'in_progress' when user enrolls
-- ============================================
CREATE OR REPLACE FUNCTION init_course_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_first_module RECORD;
BEGIN
  -- Find the first module of the course
  SELECT m.* INTO v_first_module
  FROM modules m
  JOIN sections s ON s.id = m.section_id
  WHERE s.course_id = NEW.course_id
  ORDER BY s.sort_order ASC, m.sort_order ASC
  LIMIT 1;
  
  IF FOUND THEN
    -- Create progress record for first module as 'in_progress'
    INSERT INTO progress (user_id, module_id, status, completed)
    VALUES (NEW.user_id, v_first_module.id, 'in_progress', FALSE)
    ON CONFLICT (user_id, module_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on enrollments
DROP TRIGGER IF EXISTS trigger_init_course_progress ON enrollments;
CREATE TRIGGER trigger_init_course_progress
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION init_course_progress();
