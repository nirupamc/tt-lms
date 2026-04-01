-- Soft Delete Implementation for Courses and Modules
-- Uses archived_at timestamp for soft deletes + restore functionality

-- Add archived_at timestamp to track when items were archived
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for filtering archived items
CREATE INDEX IF NOT EXISTS idx_courses_archived 
ON courses(archived_at) WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_modules_archived 
ON modules(archived_at) WHERE archived_at IS NOT NULL;

-- Function to soft delete a course
CREATE OR REPLACE FUNCTION soft_delete_course(p_course_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  affected_modules INTEGER := 0;
  course_title TEXT;
BEGIN
  -- Get course title for response
  SELECT title INTO course_title FROM courses WHERE id = p_course_id;
  
  IF course_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Course not found'
    );
  END IF;

  -- Soft delete the course (set archived_at)
  UPDATE courses 
  SET archived_at = NOW()
  WHERE id = p_course_id;

  -- Also soft delete all modules in sections of this course
  UPDATE modules 
  SET archived_at = NOW()
  FROM sections s
  WHERE modules.section_id = s.id 
    AND s.course_id = p_course_id
    AND modules.archived_at IS NULL;
  
  GET DIAGNOSTICS affected_modules = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'course_id', p_course_id,
    'course_title', course_title,
    'archived_modules', affected_modules,
    'archived_at', NOW()
  );
END;
$$;

-- Function to restore a course
CREATE OR REPLACE FUNCTION restore_course(p_course_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  affected_modules INTEGER := 0;
  course_title TEXT;
BEGIN
  -- Get course title for response
  SELECT title INTO course_title FROM courses WHERE id = p_course_id;
  
  IF course_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Course not found'
    );
  END IF;

  -- Restore the course (clear archived_at)
  UPDATE courses 
  SET archived_at = NULL
  WHERE id = p_course_id;

  -- Also restore all modules in sections of this course
  UPDATE modules 
  SET archived_at = NULL
  FROM sections s
  WHERE modules.section_id = s.id 
    AND s.course_id = p_course_id
    AND modules.archived_at IS NOT NULL;
  
  GET DIAGNOSTICS affected_modules = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'course_id', p_course_id,
    'course_title', course_title,
    'restored_modules', affected_modules,
    'restored_at', NOW()
  );
END;
$$;

-- Function to soft delete a single module
CREATE OR REPLACE FUNCTION soft_delete_module(p_module_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  module_title TEXT;
  course_id UUID;
BEGIN
  -- Get module title and course for response
  SELECT m.title, s.course_id INTO module_title, course_id
  FROM modules m
  JOIN sections s ON s.id = m.section_id
  WHERE m.id = p_module_id;
  
  IF module_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Module not found'
    );
  END IF;

  -- Soft delete the module
  UPDATE modules 
  SET archived_at = NOW()
  WHERE id = p_module_id;

  RETURN jsonb_build_object(
    'success', true,
    'module_id', p_module_id,
    'module_title', module_title,
    'course_id', course_id,
    'archived_at', NOW()
  );
END;
$$;

-- Function to restore a single module
CREATE OR REPLACE FUNCTION restore_module(p_module_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  module_title TEXT;
  course_id UUID;
BEGIN
  -- Get module title and course for response
  SELECT m.title, s.course_id INTO module_title, course_id
  FROM modules m
  JOIN sections s ON s.id = m.section_id
  WHERE m.id = p_module_id;
  
  IF module_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Module not found'
    );
  END IF;

  -- Restore the module
  UPDATE modules 
  SET archived_at = NULL
  WHERE id = p_module_id;

  RETURN jsonb_build_object(
    'success', true,
    'module_id', p_module_id,
    'module_title', module_title,
    'course_id', course_id,
    'restored_at', NOW()
  );
END;
$$;

-- Function to get archived courses and modules for admin
CREATE OR REPLACE FUNCTION get_archived_items()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  archived_courses JSONB;
  archived_modules JSONB;
BEGIN
  -- Get archived courses
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'description', description,
      'skill_tag', skill_tag,
      'archived_at', archived_at,
      'total_sections', (
        SELECT COUNT(*) FROM sections WHERE course_id = courses.id
      ),
      'total_modules', (
        SELECT COUNT(*) 
        FROM modules m 
        JOIN sections s ON s.id = m.section_id 
        WHERE s.course_id = courses.id
      )
    )
  ) INTO archived_courses
  FROM courses 
  WHERE archived_at IS NOT NULL
  ORDER BY archived_at DESC;

  -- Get archived modules (not including those in archived courses)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'title', m.title,
      'course_title', c.title,
      'course_id', c.id,
      'section_title', s.title,
      'archived_at', m.archived_at
    )
  ) INTO archived_modules
  FROM modules m
  JOIN sections s ON s.id = m.section_id
  JOIN courses c ON c.id = s.course_id
  WHERE m.archived_at IS NOT NULL 
    AND c.archived_at IS NULL  -- Exclude modules from archived courses
  ORDER BY m.archived_at DESC;

  RETURN jsonb_build_object(
    'courses', COALESCE(archived_courses, '[]'::jsonb),
    'modules', COALESCE(archived_modules, '[]'::jsonb),
    'total_archived_courses', COALESCE(jsonb_array_length(archived_courses), 0),
    'total_archived_modules', COALESCE(jsonb_array_length(archived_modules), 0)
  );
END;
$$;

-- Grant execute permissions to authenticated users (admin will use service role)
GRANT EXECUTE ON FUNCTION soft_delete_course(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_course(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_module(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_module(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_archived_items() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION soft_delete_course(UUID) IS 'Soft deletes a course by setting archived_at timestamp';
COMMENT ON FUNCTION restore_course(UUID) IS 'Restores an archived course by clearing archived_at timestamp';
COMMENT ON FUNCTION soft_delete_module(UUID) IS 'Soft deletes a module by setting archived_at timestamp';
COMMENT ON FUNCTION restore_module(UUID) IS 'Restores an archived module by clearing archived_at timestamp';
COMMENT ON FUNCTION get_archived_items() IS 'Returns all archived courses and modules for admin management';

-- Update existing RLS policies to exclude archived items from normal queries
-- This ensures archived courses/modules don't appear in regular listings

-- Drop existing course policies if they exist
DROP POLICY IF EXISTS "Employees can view published courses" ON courses;
DROP POLICY IF EXISTS "Admin can manage all courses" ON courses;

-- Create updated policies that exclude archived items for employees
CREATE POLICY "Employees can view published courses" ON courses
FOR SELECT TO authenticated
USING (archived_at IS NULL);

CREATE POLICY "Admin can manage all courses" ON courses
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Update module policies similarly
DROP POLICY IF EXISTS "Employees can view modules from published courses" ON modules;
DROP POLICY IF EXISTS "Admin can manage all modules" ON modules;

CREATE POLICY "Employees can view modules from published courses" ON modules
FOR SELECT TO authenticated
USING (
  archived_at IS NULL AND 
  EXISTS (
    SELECT 1 FROM sections s 
    JOIN courses c ON c.id = s.course_id 
    WHERE s.id = modules.section_id 
    AND c.archived_at IS NULL
  )
);

CREATE POLICY "Admin can manage all modules" ON modules
FOR ALL TO service_role
USING (true)
WITH CHECK (true);