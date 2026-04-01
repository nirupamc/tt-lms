-- Additional RPC functions for admin settings page
-- Migration 021: Admin settings RPCs

CREATE OR REPLACE FUNCTION get_badge_statistics()
RETURNS TABLE(
  id UUID,
  slug TEXT,
  label TEXT,
  description TEXT,
  icon_emoji TEXT,
  tier TEXT,
  badge_type TEXT,
  award_count BIGINT,
  percentage NUMERIC
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  total_employees INT;
BEGIN
  -- Get total number of employees
  SELECT COUNT(*) INTO total_employees
  FROM profiles
  WHERE role = 'employee';

  RETURN QUERY
  SELECT 
    ib.id,
    ib.slug,
    ib.label,
    ib.description,
    ib.icon_emoji,
    ib.tier::TEXT,
    ib.badge_type::TEXT,
    COUNT(ub.id) as award_count,
    CASE 
      WHEN total_employees > 0 THEN ROUND((COUNT(ub.id)::NUMERIC / total_employees * 100), 1)
      ELSE 0
    END as percentage
  FROM incentive_badges ib
  LEFT JOIN user_badges ub ON ib.id = ub.badge_id
  GROUP BY ib.id, ib.slug, ib.label, ib.description, ib.icon_emoji, ib.tier, ib.badge_type
  ORDER BY ib.tier DESC, ib.label;
END;
$$;

CREATE OR REPLACE FUNCTION get_monthly_leaderboard()
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  current_streak INT,
  longest_streak INT,
  monthly_hours NUMERIC
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH monthly_time AS (
    SELECT 
      p.id,
      COALESCE(
        SUM(
          CASE 
            WHEN ts.ended_at IS NOT NULL AND ts.started_at >= DATE_TRUNC('month', CURRENT_DATE)
            THEN EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at)) / 3600.0
            ELSE 0
          END
        ), 
        0
      ) as monthly_hours_calc
    FROM profiles p
    LEFT JOIN timesheet_sessions ts ON p.id = ts.user_id
    WHERE p.role = 'employee'
    GROUP BY p.id
  )
  SELECT 
    p.id,
    p.full_name,
    COALESCE(ws.current_streak, 0) as current_streak,
    COALESCE(ws.longest_streak, 0) as longest_streak,
    mt.monthly_hours_calc as monthly_hours
  FROM profiles p
  LEFT JOIN weekly_streaks ws ON p.id = ws.user_id
  LEFT JOIN monthly_time mt ON p.id = mt.id
  WHERE p.role = 'employee'
  ORDER BY ws.current_streak DESC NULLS LAST, mt.monthly_hours_calc DESC
  LIMIT 10;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_badge_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_leaderboard() TO authenticated;