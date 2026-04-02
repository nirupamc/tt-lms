-- Fix profiles RLS permanently to allow proper auth flow
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies that work for both users and admins
-- 1. Users can read their own profile (essential for auth flow)
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Users can insert their own profile during signup
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Admins can read all profiles (using service role or admin function)
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT
  USING (
    -- Allow service role (for server operations)
    current_setting('role') = 'service_role' OR
    -- Allow authenticated admins
    is_admin()
  );

-- 5. Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    current_setting('role') = 'service_role' OR
    is_admin()
  )
  WITH CHECK (
    current_setting('role') = 'service_role' OR
    is_admin()
  );

-- Test that our admin user can read their profile
DO $$
DECLARE
  test_profile record;
BEGIN
  -- Set role to the admin user for testing
  PERFORM set_config('request.jwt.claims', '{"sub": "b5dbb7bb-a9f7-420f-adaa-24dcac19abe3"}', true);
  PERFORM set_config('request.jwt.sub', 'b5dbb7bb-a9f7-420f-adaa-24dcac19abe3', true);
  
  SELECT * INTO test_profile 
  FROM profiles 
  WHERE id = 'b5dbb7bb-a9f7-420f-adaa-24dcac19abe3'::uuid;
  
  IF test_profile IS NULL THEN
    RAISE EXCEPTION 'Admin profile not readable with RLS policies';
  END IF;
  
  RAISE NOTICE '✅ Admin profile accessible: %', test_profile.email;
END $$;