-- Manual Admin Setup Script
-- Run this in Supabase SQL Editor to set up admin access properly

-- STEP 1: Pick which email to use (change this if needed)
-- Using admin@tantechllc.com by default (the one with 'a')

-- STEP 2: Ensure profile exists with admin role
INSERT INTO profiles (
  id, 
  email, 
  full_name, 
  role, 
  join_date
)
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  CURRENT_DATE
FROM auth.users
WHERE email = 'admin@tantechllc.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  email = EXCLUDED.email;

-- STEP 3: Verify the setup
SELECT 
  au.id,
  au.email as auth_email,
  au.email_confirmed_at,
  p.email as profile_email,
  p.role,
  p.full_name
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email = 'admin@tantechllc.com';

-- Expected output:
-- - auth_email and profile_email should match
-- - role should be 'admin'
-- - email_confirmed_at should NOT be null

-- STEP 4: If you want to use the OTHER email instead (admin@tntechllc.com)
-- Uncomment and run this instead:

/*
INSERT INTO profiles (
  id, 
  email, 
  full_name, 
  role, 
  join_date
)
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  CURRENT_DATE
FROM auth.users
WHERE email = 'admin@tntechllc.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  email = EXCLUDED.email;

-- Verify
SELECT 
  au.id,
  au.email as auth_email,
  au.email_confirmed_at,
  p.email as profile_email,
  p.role,
  p.full_name
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email = 'admin@tntechllc.com';
*/

-- STEP 5: Clean up duplicate (optional)
-- If you want to delete the unused admin account, uncomment ONE of these:

-- Delete admin@tantechllc.com (with 'a'):
-- DELETE FROM auth.users WHERE email = 'admin@tantechllc.com';

-- Delete admin@tntechllc.com (without 'a'):
-- DELETE FROM auth.users WHERE email = 'admin@tntechllc.com';
