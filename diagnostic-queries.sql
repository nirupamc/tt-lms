-- DIAGNOSTIC STEP 1: Verify database rows
-- Run these queries in Supabase SQL Editor

-- Query 1: Check profiles table
SELECT id, email, role, join_date
FROM profiles
WHERE email = 'admin@tantechllc.com';

-- Query 2: Check auth.users table
SELECT id, email 
FROM auth.users 
WHERE email = 'admin@tantechllc.com';

-- Query 3: Verify UUID match between both tables
SELECT 
  p.id as profile_id,
  p.email as profile_email,
  p.role,
  au.id as auth_id,
  au.email as auth_email,
  CASE 
    WHEN p.id = au.id THEN '✅ UUIDs MATCH'
    ELSE '❌ UUID MISMATCH'
  END as uuid_status
FROM profiles p
FULL OUTER JOIN auth.users au ON p.email = au.email
WHERE p.email = 'admin@tantechllc.com' OR au.email = 'admin@tantechllc.com';

-- DIAGNOSTIC STEP 4: Check RLS policies
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies
WHERE tablename = 'profiles';
