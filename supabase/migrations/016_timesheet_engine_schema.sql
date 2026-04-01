-- Timesheet Engine Database Schema
-- Full timesheet tracking system with sessions, targets, and streaks

-- Clean up existing tables if they exist (idempotency for re-runs)
DROP TABLE IF EXISTS time_targets CASCADE;
DROP TABLE IF EXISTS timesheet_sessions CASCADE;
DROP TABLE IF EXISTS weekly_streaks CASCADE;

-- 1. timesheet_sessions table (V3 schema from master context)
CREATE TABLE IF NOT EXISTS timesheet_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. time_targets table (V3 schema from master context)
CREATE TABLE IF NOT EXISTS time_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = global default
  weekly_hours_target NUMERIC NOT NULL DEFAULT 5.0,
  created_by UUID REFERENCES profiles(id), -- nullable for system-created defaults
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: only one target per user (or one global if NULL)
  CONSTRAINT unique_user_target UNIQUE (user_id)
);

-- 3. weekly_streaks table (V3 schema from master context)
CREATE TABLE IF NOT EXISTS weekly_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_target_met_week TEXT, -- ISO week 'YYYY-Www'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes as specified
CREATE INDEX IF NOT EXISTS idx_timesheet_sessions_user_started 
ON timesheet_sessions(user_id, started_at);

CREATE INDEX IF NOT EXISTS idx_time_targets_user 
ON time_targets(user_id) WHERE user_id IS NOT NULL;

-- RLS Policies
ALTER TABLE timesheet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_streaks ENABLE ROW LEVEL SECURITY;

-- timesheet_sessions policies
CREATE POLICY "Employees can view their own sessions" ON timesheet_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Employees can insert their own sessions" ON timesheet_sessions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update ended_at on their own sessions" ON timesheet_sessions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all sessions" ON timesheet_sessions
FOR SELECT TO service_role
USING (true);

CREATE POLICY "Admin can manage all sessions" ON timesheet_sessions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- time_targets policies  
CREATE POLICY "Users can view their own targets" ON time_targets
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL); -- can see global default

CREATE POLICY "Admin can manage all targets" ON time_targets
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- weekly_streaks policies
CREATE POLICY "Users can view their own streaks" ON weekly_streaks
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all streaks" ON weekly_streaks
FOR SELECT TO service_role
USING (true);

CREATE POLICY "Admin can manage all streaks" ON weekly_streaks
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- RPC: start_session
CREATE OR REPLACE FUNCTION start_session(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Insert new session
  INSERT INTO timesheet_sessions (user_id, started_at, session_date)
  VALUES (p_user_id, NOW(), CURRENT_DATE)
  RETURNING id INTO session_id;
  
  RETURN session_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error and return null
  RAISE EXCEPTION 'Failed to start session for user %: %', p_user_id, SQLERRM;
END;
$$;

-- RPC: end_session
DROP FUNCTION IF EXISTS end_session(UUID);
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
  -- Update session with end time
  UPDATE timesheet_sessions 
  SET ended_at = NOW()
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

-- RPC: get_user_time_summary
DROP FUNCTION IF EXISTS get_user_time_summary(UUID, DATE, DATE);
CREATE OR REPLACE FUNCTION get_user_time_summary(
  p_user_id UUID, 
  p_from_date DATE, 
  p_to_date DATE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  daily_totals JSONB;
  weekly_total NUMERIC;
  monthly_total NUMERIC;
  target_hours NUMERIC;
  streak_data RECORD;
  current_week TEXT;
  target_met_this_week BOOLEAN;
BEGIN
  -- Get user's weekly target (or global default)
  SELECT COALESCE(
    (SELECT weekly_hours_target FROM time_targets WHERE user_id = p_user_id),
    (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL),
    5.0
  ) INTO target_hours;
  
  -- Get daily totals for the date range (compute date from started_at)
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', session_date,
      'hours', ROUND((total_seconds / 3600.0)::numeric, 2),
      'minutes', ROUND(((total_seconds % 3600) / 60.0)::numeric, 0),
      'total_seconds', total_seconds,
      'session_count', session_count
    ) ORDER BY session_date
  ) INTO daily_totals
  FROM (
    SELECT 
      DATE(ts.started_at) as session_date,
      COALESCE(SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::INTEGER), 0) as total_seconds,
      COUNT(*) as session_count
    FROM timesheet_sessions ts
    WHERE ts.user_id = p_user_id 
      AND DATE(ts.started_at) BETWEEN p_from_date AND p_to_date
      AND ts.ended_at IS NOT NULL
      AND ts.is_valid = true
    GROUP BY DATE(ts.started_at)
  ) daily_data;
  
  -- Calculate weekly total (current week)
  current_week := TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW');
  
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::INTEGER), 0) / 3600.0 INTO weekly_total
  FROM timesheet_sessions ts
  WHERE ts.user_id = p_user_id
    AND TO_CHAR(ts.started_at, 'IYYY-"W"IW') = current_week
    AND ts.ended_at IS NOT NULL
    AND ts.is_valid = true;
  
  -- Calculate monthly total (current month)  
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::INTEGER), 0) / 3600.0 INTO monthly_total
  FROM timesheet_sessions ts
  WHERE ts.user_id = p_user_id
    AND DATE_TRUNC('month', ts.started_at) = DATE_TRUNC('month', CURRENT_DATE)
    AND ts.ended_at IS NOT NULL
    AND ts.is_valid = true;
  
  -- Check if target is met this week
  target_met_this_week := weekly_total >= target_hours;
  
  -- Get streak information
  SELECT * INTO streak_data
  FROM weekly_streaks 
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'daily_totals', COALESCE(daily_totals, '[]'::jsonb),
    'weekly_total', ROUND(weekly_total::numeric, 2),
    'monthly_total', ROUND(monthly_total::numeric, 2),
    'target_hours', target_hours,
    'target_met_this_week', target_met_this_week,
    'current_week', current_week,
    'streak', CASE 
      WHEN streak_data.user_id IS NOT NULL THEN
        jsonb_build_object(
          'current_streak', streak_data.current_streak,
          'longest_streak', streak_data.longest_streak,
          'last_target_met_week', streak_data.last_target_met_week
        )
      ELSE
        jsonb_build_object(
          'current_streak', 0,
          'longest_streak', 0,
          'last_target_met_week', null
        )
    END
  );
END;
$$;

-- RPC: get_all_user_time_summary (admin version)
DROP FUNCTION IF EXISTS get_all_user_time_summary(DATE, DATE);
CREATE OR REPLACE FUNCTION get_all_user_time_summary(
  p_from_date DATE, 
  p_to_date DATE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  current_week TEXT;
  current_month_start DATE;
BEGIN
  current_week := TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW');
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'role', p.role,
      'this_week_hours', ROUND(COALESCE(week_data.total_seconds, 0) / 3600.0, 2),
      'this_month_hours', ROUND(COALESCE(month_data.total_seconds, 0) / 3600.0, 2),
      'target_hours', COALESCE(
        t.weekly_hours_target,
        (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL),
        5.0
      ),
      'target_met_this_week', COALESCE(week_data.total_seconds, 0) / 3600.0 >= COALESCE(
        t.weekly_hours_target,
        (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL),
        5.0
      ),
      'current_streak', COALESCE(s.current_streak, 0),
      'longest_streak', COALESCE(s.longest_streak, 0),
      'total_sessions', COALESCE(range_data.session_count, 0),
      'avg_daily_hours', CASE 
        WHEN range_data.active_days > 0 THEN 
          ROUND((COALESCE(range_data.total_seconds, 0) / 3600.0) / range_data.active_days, 2)
        ELSE 0 
      END
    )
  ) INTO result
  FROM profiles p
  LEFT JOIN time_targets t ON t.user_id = p.id
  LEFT JOIN weekly_streaks s ON s.user_id = p.id
  LEFT JOIN (
    -- This week data
    SELECT 
      ts.user_id,
      SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::INTEGER) as total_seconds
    FROM timesheet_sessions ts
    WHERE TO_CHAR(ts.started_at, 'IYYY-"W"IW') = current_week
      AND ts.ended_at IS NOT NULL
      AND ts.is_valid = true
    GROUP BY ts.user_id
  ) week_data ON week_data.user_id = p.id
  LEFT JOIN (
    -- This month data
    SELECT 
      ts.user_id,
      SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::INTEGER) as total_seconds
    FROM timesheet_sessions ts
    WHERE ts.started_at >= current_month_start
      AND ts.ended_at IS NOT NULL
      AND ts.is_valid = true
    GROUP BY ts.user_id
  ) month_data ON month_data.user_id = p.id
  LEFT JOIN (
    -- Date range data
    SELECT 
      ts.user_id,
      SUM(EXTRACT(EPOCH FROM (ts.ended_at - ts.started_at))::INTEGER) as total_seconds,
      COUNT(*) as session_count,
      COUNT(DISTINCT DATE(ts.started_at)) as active_days
    FROM timesheet_sessions ts
    WHERE DATE(ts.started_at) BETWEEN p_from_date AND p_to_date
      AND ts.ended_at IS NOT NULL
      AND ts.is_valid = true
    GROUP BY ts.user_id
  ) range_data ON range_data.user_id = p.id
  WHERE p.role = 'employee'
  ORDER BY p.full_name;
  
  RETURN jsonb_build_object(
    'users', COALESCE(result, '[]'::jsonb),
    'summary', jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM profiles WHERE role = 'employee'),
      'active_users', (SELECT COUNT(DISTINCT user_id) FROM timesheet_sessions 
                      WHERE DATE(started_at) BETWEEN p_from_date AND p_to_date 
                      AND ended_at IS NOT NULL AND is_valid = true),
      'date_range', jsonb_build_object(
        'from', p_from_date,
        'to', p_to_date
      )
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_time_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_user_time_summary(DATE, DATE) TO service_role;

-- Comments
COMMENT ON TABLE timesheet_sessions IS 'Automatic time tracking sessions for learners';
COMMENT ON TABLE time_targets IS 'Weekly hour targets per user (NULL user_id = global default)';  
COMMENT ON TABLE weekly_streaks IS 'Learning streak tracking for gamification';
COMMENT ON FUNCTION start_session(UUID) IS 'Starts a new timesheet session and returns session ID';
COMMENT ON FUNCTION end_session(UUID) IS 'Ends a timesheet session and marks short sessions as invalid';
COMMENT ON FUNCTION get_user_time_summary(UUID, DATE, DATE) IS 'Returns comprehensive time summary for a user';
COMMENT ON FUNCTION get_all_user_time_summary(DATE, DATE) IS 'Admin function: returns time summary for all users';

-- Insert global default target if not exists
INSERT INTO time_targets (user_id, weekly_hours_target, created_by)
SELECT 
  NULL, 
  5.0, 
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM time_targets WHERE user_id IS NULL);

-- Trigger to automatically create streak record for new users
CREATE OR REPLACE FUNCTION create_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO weekly_streaks (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_user_streak
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_streak();