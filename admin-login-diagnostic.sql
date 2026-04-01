-- Admin Login Diagnostic Queries
-- Run these in Supabase SQL Editor to diagnose login issues

-- STEP 1: Check if admin user exists in auth.users
SELECT 
  id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email IN ('admin@tantechllc.com', 'admin@tntechllc.com')
ORDER BY email;

-- Expected: Should return 1 row with the admin email
-- If 0 rows: Admin user doesn't exist (need to create it)
-- If NULL in confirmed_at: Email not confirmed

-- STEP 2: Check if admin profile exists
SELECT 
  id,
  email,
  full_name,
  role,
  join_date,
  created_at
FROM profiles
WHERE email IN ('admin@tantechllc.com', 'admin@tntechllc.com')
ORDER BY email;

-- Expected: Should return 1 row with role = 'admin'
-- If 0 rows: Profile doesn't exist
-- If role = 'employee': Need to UPDATE to 'admin'

-- STEP 3: Verify UUID match between auth.users and profiles
SELECT 
  'auth.users' as source,
  au.id,
  au.email
FROM auth.users au
WHERE au.email IN ('admin@tantechllc.com', 'admin@tntechllc.com')

UNION ALL

SELECT 
  'profiles' as source,
  p.id,
  p.email
FROM profiles p
WHERE p.email IN ('admin@tantechllc.com', 'admin@tntechllc.com')

ORDER BY email, source;

-- Expected: Same UUID for both rows with same email
-- If UUIDs don't match: Data corruption issue

-- STEP 4: If admin user doesn't exist, uncomment and run this:
-- Note: This requires the correct admin email - check which one you're using

/*
-- Create admin user in auth.users (if missing)
-- You'll need to reset password via Supabase Auth UI after this

-- For admin@tantechllc.com:
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@tantechllc.com',
  crypt('Admin@Tantech23', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  NOW()
) RETURNING id, email;
*/

-- STEP 5: If profile exists but role is wrong:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@tantechllc.com';

-- STEP 6: Check for any disabled/banned users
SELECT 
  id,
  email,
  banned_until,
  deleted_at
FROM auth.users
WHERE email IN ('admin@tantechllc.com', 'admin@tntechllc.com');

-- Expected: banned_until and deleted_at should both be NULL
