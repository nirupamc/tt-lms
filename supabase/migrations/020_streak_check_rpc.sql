-- Additional RPC function for weekly streak cron
-- Migration 020: Streak check RPC

CREATE OR REPLACE FUNCTION get_employees_for_streak_check()
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  target_hours NUMERIC,
  current_streak INT,
  longest_streak INT,
  last_target_met_week TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    COALESCE(tt.weekly_hours_target, (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL LIMIT 1), 5.0) as target_hours,
    COALESCE(ws.current_streak, 0) as current_streak,
    COALESCE(ws.longest_streak, 0) as longest_streak,
    ws.last_target_met_week
  FROM profiles p
  LEFT JOIN time_targets tt ON p.id = tt.user_id
  LEFT JOIN weekly_streaks ws ON p.id = ws.user_id
  WHERE p.role = 'employee'
  ORDER BY p.full_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_employees_for_streak_check() TO service_role;