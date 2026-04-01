-- Check which RPC functions exist in the database
-- Run this in Supabase SQL Editor to see what's missing

SELECT 
  proname as function_name,
  prokind as function_type,
  prosrc as function_body_preview
FROM pg_proc
WHERE proname IN (
  'get_all_user_time_summary',
  'get_pending_reviews',
  'get_user_time_summary',
  'start_session',
  'end_session',
  'is_admin'
)
ORDER BY proname;

-- Expected: Should return 6 rows (one for each function)
-- If any are missing, those migrations weren't run

-- Also check RLS policies on key tables
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual::text LIKE '%is_admin()%' THEN '✅ Uses is_admin()'
    WHEN qual::text LIKE '%role = ''admin''%' THEN '✅ Direct role check'
    WHEN qual::text LIKE '%auth.uid()%' THEN '✅ User ownership check'
    ELSE '⚠️ Other'
  END as policy_type
FROM pg_policies
WHERE tablename IN ('courses', 'sections', 'modules', 'profiles', 'milestone_submissions')
ORDER BY tablename, policyname;

-- This will show which tables have RLS policies set up
