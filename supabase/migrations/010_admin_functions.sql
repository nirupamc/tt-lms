-- Admin RPC functions for employee monitoring and review queue

-- ============================================================================
-- get_all_employee_progress: Returns employee data with progress metrics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_all_employee_progress()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  join_date DATE,
  last_seen_at TIMESTAMPTZ,
  total_modules BIGINT,
  completed_modules BIGINT,
  percent_complete NUMERIC,
  current_module_id UUID,
  current_module_title TEXT,
  current_course_title TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_progress AS (
    SELECT 
      p.id AS user_id,
      p.full_name,
      p.email,
      p.join_date,
      p.last_seen_at,
      COUNT(prog.id) FILTER (WHERE prog.completed = true) AS completed_modules,
      COUNT(prog.id) AS total_modules,
      CASE 
        WHEN COUNT(prog.id) > 0 THEN 
          ROUND((COUNT(prog.id) FILTER (WHERE prog.completed = true)::NUMERIC / COUNT(prog.id)::NUMERIC) * 100, 1)
        ELSE 0
      END AS percent_complete,
      (
        SELECT prog2.module_id 
        FROM progress prog2
        WHERE prog2.user_id = p.id 
          AND prog2.status = 'in_progress'
        ORDER BY prog2.updated_at DESC
        LIMIT 1
      ) AS current_module_id
    FROM profiles p
    LEFT JOIN progress prog ON prog.user_id = p.id
    WHERE p.role = 'employee'
    GROUP BY p.id, p.full_name, p.email, p.join_date, p.last_seen_at
  )
  SELECT 
    up.user_id,
    up.full_name,
    up.email,
    up.join_date,
    up.last_seen_at,
    up.total_modules,
    up.completed_modules,
    up.percent_complete,
    up.current_module_id,
    m.title AS current_module_title,
    c.title AS current_course_title
  FROM user_progress up
  LEFT JOIN modules m ON m.id = up.current_module_id
  LEFT JOIN sections s ON s.id = m.section_id
  LEFT JOIN courses c ON c.id = s.course_id
  ORDER BY up.full_name;
END;
$$;

-- ============================================================================
-- get_pending_reviews: Returns pending milestone submissions with employee info
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_reviews()
RETURNS TABLE (
  submission_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  module_title TEXT,
  course_title TEXT,
  github_url TEXT,
  hosted_url TEXT,
  submitted_at TIMESTAMPTZ,
  user_id UUID,
  module_id UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id AS submission_id,
    p.full_name AS employee_name,
    p.email AS employee_email,
    m.title AS module_title,
    c.title AS course_title,
    ms.github_url,
    ms.hosted_url,
    ms.submitted_at,
    ms.user_id,
    ms.module_id
  FROM milestone_submissions ms
  JOIN profiles p ON p.id = ms.user_id
  JOIN modules m ON m.id = ms.module_id
  JOIN sections s ON s.id = m.section_id
  JOIN courses c ON c.id = s.course_id
  WHERE ms.status = 'pending'
  ORDER BY ms.submitted_at ASC;
END;
$$;

-- ============================================================================
-- get_reviewed_submissions: Returns approved/rejected submissions
-- ============================================================================
CREATE OR REPLACE FUNCTION get_reviewed_submissions(p_status submission_status)
RETURNS TABLE (
  submission_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  module_title TEXT,
  course_title TEXT,
  github_url TEXT,
  hosted_url TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewer_name TEXT,
  feedback TEXT,
  user_id UUID,
  module_id UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id AS submission_id,
    p.full_name AS employee_name,
    p.email AS employee_email,
    m.title AS module_title,
    c.title AS course_title,
    ms.github_url,
    ms.hosted_url,
    ms.submitted_at,
    ms.reviewed_at,
    reviewer.full_name AS reviewer_name,
    ms.feedback,
    ms.user_id,
    ms.module_id
  FROM milestone_submissions ms
  JOIN profiles p ON p.id = ms.user_id
  JOIN modules m ON m.id = ms.module_id
  JOIN sections s ON s.id = m.section_id
  JOIN courses c ON c.id = s.course_id
  LEFT JOIN profiles reviewer ON reviewer.id = ms.reviewed_by
  WHERE ms.status = p_status
  ORDER BY ms.reviewed_at DESC NULLS LAST, ms.submitted_at DESC;
END;
$$;

-- ============================================================================
-- approve_milestone_submission: Approve submission and unlock next module
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_milestone_submission(
  p_submission_id UUID,
  p_reviewer_id UUID,
  p_feedback TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_module_id UUID;
  v_next_module JSON;
BEGIN
  -- Get submission details
  SELECT user_id, module_id
  INTO v_user_id, v_module_id
  FROM milestone_submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- Update submission status
  UPDATE milestone_submissions
  SET 
    status = 'passed',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    feedback = p_feedback
  WHERE id = p_submission_id;

  -- Update progress to completed
  UPDATE progress
  SET 
    completed = true,
    status = 'completed',
    updated_at = NOW()
  WHERE user_id = v_user_id AND module_id = v_module_id;

  -- Unlock next module
  SELECT mark_module_complete(v_user_id, v_module_id)
  INTO v_next_module;

  RETURN json_build_object(
    'success', true,
    'next_module', v_next_module
  );
END;
$$;

-- ============================================================================
-- reject_milestone_submission: Reject submission with feedback
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_milestone_submission(
  p_submission_id UUID,
  p_reviewer_id UUID,
  p_feedback TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_module_id UUID;
BEGIN
  -- Get submission details
  SELECT user_id, module_id
  INTO v_user_id, v_module_id
  FROM milestone_submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- Update submission status
  UPDATE milestone_submissions
  SET 
    status = 'failed',
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    feedback = p_feedback
  WHERE id = p_submission_id;

  -- Keep progress as pending_review so user can resubmit
  UPDATE progress
  SET 
    status = 'in_progress',
    updated_at = NOW()
  WHERE user_id = v_user_id AND module_id = v_module_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Submission rejected. Employee can resubmit.'
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_all_employee_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reviews() TO authenticated;
GRANT EXECUTE ON FUNCTION get_reviewed_submissions(submission_status) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_milestone_submission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_milestone_submission(UUID, UUID, TEXT) TO authenticated;
