-- Create cron_logs table for tracking anniversary email execution

CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  month_number INTEGER,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_executed ON cron_logs(job_name, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_user ON cron_logs(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_status ON cron_logs(status, executed_at DESC);

-- RLS: Only admins can view logs
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all cron logs" ON cron_logs;

CREATE POLICY "Admins can view all cron logs"
  ON cron_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE cron_logs IS 'Logs for scheduled cron job executions (anniversary emails, etc)';
