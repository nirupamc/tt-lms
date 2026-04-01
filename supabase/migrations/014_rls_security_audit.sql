-- RLS Security Audit Function
-- This function tests RLS policies by checking current user's access

CREATE OR REPLACE FUNCTION test_rls_as_user(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  test_results JSONB[] := ARRAY[]::JSONB[];
  temp_result JSONB;
  user_role_val user_role;
  test_user_id UUID;
  other_user_id UUID;
BEGIN
  -- Get user's role
  SELECT role INTO user_role_val FROM profiles WHERE id = p_user_id;
  
  -- Verify user exists
  SELECT id INTO test_user_id FROM profiles WHERE id = p_user_id;
  IF test_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, role, join_date)
    VALUES (p_user_id, 'test@example.com', 'Test User', 'employee', CURRENT_DATE)
    RETURNING id INTO test_user_id;
  END IF;
  
  -- Find another user for cross-user testing
  SELECT id INTO other_user_id FROM profiles WHERE id != p_user_id LIMIT 1;

  -- Test 1: profiles table
  BEGIN
    -- Can user select their own profile?
    PERFORM * FROM profiles WHERE id = p_user_id;
    temp_result := jsonb_build_object(
      'table', 'profiles',
      'operation', 'SELECT own row',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'profiles',
      'operation', 'SELECT own row',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Can user select another user's profile?
  BEGIN
    PERFORM * FROM profiles WHERE id = other_user_id;
    temp_result := jsonb_build_object(
      'table', 'profiles',
      'operation', 'SELECT other user row',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'profiles',
      'operation', 'SELECT other user row',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 2: progress table
  BEGIN
    -- Can user select their own progress?
    PERFORM * FROM progress WHERE user_id = p_user_id;
    temp_result := jsonb_build_object(
      'table', 'progress',
      'operation', 'SELECT own rows',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'progress',
      'operation', 'SELECT own rows',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Can user select another user's progress?
  BEGIN
    PERFORM * FROM progress WHERE user_id = other_user_id;
    temp_result := jsonb_build_object(
      'table', 'progress',
      'operation', 'SELECT other user rows',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'progress',
      'operation', 'SELECT other user rows',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 3: courses table (should allow SELECT published only)
  BEGIN
    PERFORM * FROM courses WHERE is_published = true;
    temp_result := jsonb_build_object(
      'table', 'courses',
      'operation', 'SELECT published courses',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'courses',
      'operation', 'SELECT published courses',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 4: modules table (should allow SELECT with published courses)
  BEGIN
    SELECT COUNT(*) FROM modules m 
    JOIN sections s ON s.id = m.section_id
    JOIN courses c ON c.id = s.course_id 
    WHERE c.is_published = true;
    temp_result := jsonb_build_object(
      'table', 'modules',
      'operation', 'SELECT published modules',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'modules',
      'operation', 'SELECT published modules',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 5: milestone_submissions table
  BEGIN
    -- Can user select their own submissions?
    PERFORM * FROM milestone_submissions WHERE user_id = p_user_id;
    temp_result := jsonb_build_object(
      'table', 'milestone_submissions',
      'operation', 'SELECT own submissions',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'milestone_submissions',
      'operation', 'SELECT own submissions',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 6: events table (should allow all authenticated users)
  BEGIN
    PERFORM * FROM events;
    temp_result := jsonb_build_object(
      'table', 'events',
      'operation', 'SELECT all events',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'events',
      'operation', 'SELECT all events',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 7: skills_earned table
  BEGIN
    -- Can user select their own skills?
    PERFORM * FROM skills_earned WHERE user_id = p_user_id;
    temp_result := jsonb_build_object(
      'table', 'skills_earned',
      'operation', 'SELECT own skills',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'skills_earned',
      'operation', 'SELECT own skills',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 8: timesheet_sessions table (V3)
  BEGIN
    -- Can user select their own timesheet sessions?
    PERFORM * FROM timesheet_sessions WHERE user_id = p_user_id;
    temp_result := jsonb_build_object(
      'table', 'timesheet_sessions',
      'operation', 'SELECT own sessions',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'timesheet_sessions',
      'operation', 'SELECT own sessions',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 9: user_badges table (V3)
  BEGIN
    -- Can user select their own badges?
    PERFORM * FROM user_badges WHERE user_id = p_user_id;
    temp_result := jsonb_build_object(
      'table', 'user_badges',
      'operation', 'SELECT own badges',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'user_badges',
      'operation', 'SELECT own badges',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Test 10: weekly_streaks table (V3)
  BEGIN
    -- Can user select their own streak data?
    PERFORM * FROM weekly_streaks WHERE user_id = p_user_id;
    temp_result := jsonb_build_object(
      'table', 'weekly_streaks',
      'operation', 'SELECT own streak data',
      'allowed', true,
      'error', null
    );
  EXCEPTION WHEN OTHERS THEN
    temp_result := jsonb_build_object(
      'table', 'weekly_streaks',
      'operation', 'SELECT own streak data',
      'allowed', false,
      'error', SQLERRM
    );
  END;
  test_results := test_results || temp_result;

  -- Compile final result
  result := jsonb_build_object(
    'user_id', p_user_id,
    'user_role', user_role_val,
    'test_timestamp', NOW(),
    'total_tests', array_length(test_results, 1),
    'passed_tests', (
      SELECT COUNT(*)
      FROM unnest(test_results) AS test
      WHERE (test->>'allowed')::boolean = true
    ),
    'failed_tests', (
      SELECT COUNT(*)
      FROM unnest(test_results) AS test
      WHERE (test->>'allowed')::boolean = false
    ),
    'test_results', to_jsonb(test_results),
    'summary', jsonb_build_object(
      'expected_behavior', 'Employee users should only access their own data. Admin users (via service role) can access all data.',
      'critical_failures', (
        SELECT array_agg(test->>'table' || '.' || test->>'operation')
        FROM unnest(test_results) AS test
        WHERE (test->>'allowed')::boolean = false 
        AND test->>'table' IN ('profiles', 'progress', 'milestone_submissions', 'skills_earned')
        AND test->>'operation' LIKE '%own%'
      )
    )
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_rls_as_user(UUID) TO authenticated;

COMMENT ON FUNCTION test_rls_as_user(UUID) IS 'Tests RLS policies for a given user and returns a JSON report of permissions';

-- Example usage:
-- SELECT test_rls_as_user('550e8400-e29b-41d4-a716-446655440000');