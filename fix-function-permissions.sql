-- Grant EXECUTE permissions to admin functions
-- Run this in Supabase SQL Editor

-- Grant permissions to authenticated users (includes admins)
GRANT EXECUTE ON FUNCTION get_all_user_time_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reviews() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Also grant to service_role for good measure
GRANT EXECUTE ON FUNCTION get_all_user_time_summary(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_pending_reviews() TO service_role;

-- Verify grants were applied (simplified query)
SELECT 
  proname as function_name,
  proacl as permissions
FROM pg_proc
WHERE proname IN (
  'get_all_user_time_summary',
  'get_pending_reviews',
  'is_admin'
)
ORDER BY proname;

-- Expected: Should show the function names with their ACL (access control list)
-- If proacl is NULL, the function has default permissions (public execute)
-- If proacl shows values, those are explicit grants
