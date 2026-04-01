-- 023_fix_rls_recursion_and_timesheet.sql
-- CRITICAL FIX: Infinite recursion in profiles RLS + missing session_date column

-- ============================================================================
-- PART 1: FIX INFINITE RECURSION IN PROFILES RLS
-- ============================================================================

-- Problem: The existing admin policies query the profiles table INSIDE
-- a profiles table policy, creating infinite recursion:
-- "SELECT 1 FROM profiles WHERE profiles.id = auth.uid()" → infinite loop

-- Solution: Use a helper function with SECURITY DEFINER that bypasses RLS

-- Step 1: Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Get role directly without triggering RLS
  SELECT role INTO user_role_val
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN (user_role_val = 'admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

COMMENT ON FUNCTION is_admin() IS 'Returns true if current user has admin role. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- Step 2: Drop existing recursive admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Step 3: Recreate admin policies WITHOUT recursion
-- Uses the helper function which has SECURITY DEFINER (bypasses RLS)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- PART 2: FIX TIMESHEET_SESSIONS MISSING session_date COLUMN
-- ============================================================================

-- Problem: start_session() references session_date but column doesn't exist
-- Error: 'column "session_date" of relation "timesheet_sessions" does not exist'

-- Add session_date as a REGULAR column (not generated)
-- Set by start_session() RPC using CURRENT_DATE
-- (timestamptz::date conversion is not immutable due to timezone dependency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timesheet_sessions' 
    AND column_name = 'session_date'
  ) THEN
    ALTER TABLE timesheet_sessions
    ADD COLUMN session_date DATE;
  END IF;
END $$;

-- Add duration_seconds as a REGULAR column (not generated)
-- Computed and stored by end_session() RPC instead of generated column
-- (EXTRACT with EPOCH is not immutable, causes errors in generated columns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timesheet_sessions' 
    AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE timesheet_sessions
    ADD COLUMN duration_seconds INTEGER;
  END IF;
END $$;

-- Create the index specified in V3 schema
CREATE INDEX IF NOT EXISTS idx_timesheet_sessions_user_date 
ON timesheet_sessions(user_id, session_date);

-- ============================================================================
-- PART 3: UPDATE start_session AND end_session RPCs
-- ============================================================================

-- The RPC was trying to INSERT session_date as a generated column
-- Now it's a regular column, so we set it explicitly
CREATE OR REPLACE FUNCTION start_session(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Insert new session with explicit session_date
  INSERT INTO timesheet_sessions (user_id, started_at, session_date)
  VALUES (p_user_id, NOW(), CURRENT_DATE)
  RETURNING id INTO session_id;
  
  RETURN session_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error and return null
  RAISE EXCEPTION 'Failed to start session for user %: %', p_user_id, SQLERRM;
END;
$$;

-- Update end_session to compute and store duration_seconds
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  session_duration INTEGER;
  session_user_id UUID;
  session_started TIMESTAMPTZ;
BEGIN
  -- Update session with end time and compute duration
  UPDATE timesheet_sessions 
  SET ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  WHERE id = p_session_id 
    AND ended_at IS NULL
  RETURNING user_id, started_at, duration_seconds 
  INTO session_user_id, session_started, session_duration;
  
  -- Check if session was found and updated
  IF session_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session not found or already ended'
    );
  END IF;
  
  -- Mark sessions < 30 seconds as invalid
  IF session_duration < 30 THEN
    UPDATE timesheet_sessions 
    SET is_valid = false
    WHERE id = p_session_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'user_id', session_user_id,
    'duration_seconds', session_duration,
    'is_valid', CASE WHEN session_duration >= 30 THEN true ELSE false END
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ============================================================================
-- PART 4: VERIFICATION QUERIES (optional - for manual testing)
-- ============================================================================

-- To verify the fix works, you can run these in SQL Editor after migration:

-- Test 1: Verify is_admin() function works
-- SELECT is_admin(); -- Should return true for admin, false for employee

-- Test 2: Verify session_date is auto-generated (duration_seconds populated by end_session)
-- SELECT id, user_id, started_at, ended_at, session_date, duration_seconds, is_valid
-- FROM timesheet_sessions LIMIT 5;

-- Test 3: Verify admin can read all profiles without recursion
-- SELECT id, email, role FROM profiles; -- Should work for admin without error

-- Test 4: Verify employee can only read their own profile
-- SELECT * FROM profiles WHERE id = auth.uid(); -- Should work for employee

-- Migration complete: Fixed infinite recursion in profiles RLS + added session_date column
-- Note: Both session_date and duration_seconds are regular columns (not generated)
--       session_date is set by start_session() using CURRENT_DATE
--       duration_seconds is computed by end_session() RPC
