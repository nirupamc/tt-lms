-- 006_timesheet_targets.sql
-- V3: Automatic timesheet tracking and weekly targets

-- Timesheet sessions - automatic tracking
CREATE TABLE timesheet_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  -- Generated column: duration in seconds (NULL if session not ended)
  duration_seconds INT GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INT
      ELSE NULL
    END
  ) STORED,
  -- Session date for daily aggregation
  session_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Indexes for efficient timesheet queries
CREATE INDEX idx_timesheet_user_date ON timesheet_sessions(user_id, session_date);
CREATE INDEX idx_timesheet_date ON timesheet_sessions(session_date);
CREATE INDEX idx_timesheet_user_started ON timesheet_sessions(user_id, started_at);

-- Weekly time targets
CREATE TABLE time_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL user_id = global default target
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_hours_target NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- One target per user (or one global if user_id is NULL)
  CONSTRAINT unique_user_target UNIQUE(user_id)
);

CREATE INDEX idx_time_targets_user ON time_targets(user_id);

-- Enable RLS
ALTER TABLE timesheet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_targets ENABLE ROW LEVEL SECURITY;

-- Timesheet: employees see only their own rows
CREATE POLICY "Users view own timesheet"
  ON timesheet_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions (via RPC, not direct)
CREATE POLICY "Users insert own sessions"
  ON timesheet_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own open sessions (to set ended_at)
CREATE POLICY "Users update own sessions"
  ON timesheet_sessions FOR UPDATE
  USING (auth.uid() = user_id AND ended_at IS NULL);

-- Admins can view all timesheet data
CREATE POLICY "Admins view all timesheets"
  ON timesheet_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Time targets: employees can view their own and global
CREATE POLICY "Users view own and global targets"
  ON time_targets FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Admins can manage all targets
CREATE POLICY "Admins manage targets"
  ON time_targets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================
-- RPCs for timesheet engine
-- ============================================

-- Start a new session (called on auth/visibility)
CREATE OR REPLACE FUNCTION start_session(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- End any existing open sessions for this user
  UPDATE timesheet_sessions
  SET ended_at = NOW()
  WHERE user_id = p_user_id AND ended_at IS NULL;
  
  -- Create new session
  INSERT INTO timesheet_sessions (user_id, started_at, session_date)
  VALUES (p_user_id, NOW(), CURRENT_DATE)
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- End a session (called on visibilitychange hidden / beforeunload)
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_duration INT;
BEGIN
  -- Update session end time
  UPDATE timesheet_sessions
  SET ended_at = NOW()
  WHERE id = p_session_id AND ended_at IS NULL
  RETURNING duration_seconds INTO v_duration;
  
  -- Delete if session was too short (< 30 seconds)
  IF v_duration IS NOT NULL AND v_duration < 30 THEN
    DELETE FROM timesheet_sessions WHERE id = p_session_id;
    RETURN FALSE;
  END IF;
  
  RETURN v_duration IS NOT NULL;
END;
$$;

-- Get user time summary for dashboard
CREATE OR REPLACE FUNCTION get_user_time_summary(
  p_user_id UUID,
  p_period TEXT DEFAULT 'week' -- 'day', 'week', 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_target NUMERIC;
  v_weekly_total NUMERIC;
  v_start_of_week DATE;
BEGIN
  -- Get target (per-user or global fallback)
  SELECT COALESCE(
    (SELECT weekly_hours_target FROM time_targets WHERE user_id = p_user_id),
    (SELECT weekly_hours_target FROM time_targets WHERE user_id IS NULL),
    5.0 -- default fallback
  ) INTO v_target;
  
  -- Calculate start of current ISO week (Monday)
  v_start_of_week := date_trunc('week', CURRENT_DATE)::DATE;
  
  -- Get weekly total in hours
  SELECT COALESCE(SUM(duration_seconds) / 3600.0, 0)
  INTO v_weekly_total
  FROM timesheet_sessions
  WHERE user_id = p_user_id
    AND session_date >= v_start_of_week
    AND ended_at IS NOT NULL;
  
  -- Build result
  SELECT jsonb_build_object(
    'daily', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', day_date,
        'hours', COALESCE(day_hours, 0)
      ) ORDER BY day_date)
      FROM (
        SELECT 
          d::DATE AS day_date,
          SUM(ts.duration_seconds) / 3600.0 AS day_hours
        FROM generate_series(
          v_start_of_week,
          v_start_of_week + INTERVAL '6 days',
          INTERVAL '1 day'
        ) AS d
        LEFT JOIN timesheet_sessions ts ON ts.session_date = d::DATE 
          AND ts.user_id = p_user_id
          AND ts.ended_at IS NOT NULL
        GROUP BY d::DATE
      ) daily_data
    ),
    'weekly_total', ROUND(v_weekly_total::NUMERIC, 2),
    'target_hours', v_target,
    'target_met_this_week', v_weekly_total >= v_target,
    'target_percent', LEAST(ROUND((v_weekly_total / v_target * 100)::NUMERIC, 1), 100)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
