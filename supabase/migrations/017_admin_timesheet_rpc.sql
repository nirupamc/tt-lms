-- Add missing RPC function for admin timesheet panel
CREATE OR REPLACE FUNCTION get_all_user_time_summary(
  p_from DATE,
  p_to DATE
) 
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  total_seconds BIGINT,
  target_hours NUMERIC,
  target_met_this_week BOOLEAN,
  current_streak INT
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    COALESCE(SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))), 0)::BIGINT as total_seconds,
    COALESCE(tt.weekly_hours_target, (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL LIMIT 1), 5.0) as target_hours,
    COALESCE(SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))), 0) >= 
      (COALESCE(tt.weekly_hours_target, (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL LIMIT 1), 5.0) * 3600) as target_met_this_week,
    COALESCE(ws.current_streak, 0) as current_streak
  FROM profiles p
  LEFT JOIN timesheet_sessions ts ON p.id = ts.user_id 
    AND ts.session_date >= p_from 
    AND ts.session_date <= p_to
    AND ts.ended_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at)) >= 30
  LEFT JOIN time_targets tt ON p.id = tt.user_id
  LEFT JOIN weekly_streaks ws ON p.id = ws.user_id
  WHERE p.role = 'employee'
  GROUP BY p.id, p.full_name, p.email, tt.weekly_hours_target, ws.current_streak
  ORDER BY p.full_name;
END;
$$;

-- Grant execute permission to authenticated users (admin will check RLS)
GRANT EXECUTE ON FUNCTION get_all_user_time_summary(DATE, DATE) TO authenticated;