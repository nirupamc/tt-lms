-- Configure pg_cron to run anniversary email checks daily
-- This SQL should be run in the Supabase SQL Editor after deploying the Edge Function

-- First, enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily anniversary check at midnight UTC
SELECT cron.schedule(
  'anniversary-daily',
  '0 0 * * *', -- Every day at 00:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://wsueekkqtmykiqltxprc.supabase.co/functions/v1/anniversary-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- Unschedule if needed (for testing/updates)
-- SELECT cron.unschedule('anniversary-daily');

-- Manual test: Invoke the Edge Function immediately
-- SELECT net.http_post(
--   url := 'https://wsueekkqtmykiqltxprc.supabase.co/functions/v1/anniversary-cron',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer [YOUR_SERVICE_ROLE_KEY]'
--   ),
--   body := '{}'::jsonb
-- );

COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL - used for anniversary emails';
