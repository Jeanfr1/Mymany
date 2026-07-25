-- setup_cron.sql — Supabase Cron scheduling for Manyjean (DECISIONS §12).
-- Run in the Supabase SQL editor AFTER the app is deployed and the Vault secrets
-- below exist. Uses pg_cron + pg_net (both enabled). NEVER commit real secret values.
--
-- The cron secret must EQUAL the app's INTERNAL_CRON_SECRET (set in Vercel).
-- Store it, and the app URL, in Vault so this script contains no secrets:
--
--   select vault.create_secret('<PASTE INTERNAL_CRON_SECRET>', 'manyjean_cron_secret');
--   select vault.create_secret('https://<your-app>.vercel.app', 'manyjean_app_url');
--
-- (Re-running create_secret errors if the name exists; use vault.update_secret to change.)

-- Drain the outbound queue every minute (durable delivery).
select cron.schedule(
  'manyjean-drain',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'manyjean_app_url')
             || '/api/internal/queue/drain',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' ||
          (select decrypted_secret from vault.decrypted_secrets where name = 'manyjean_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);

-- Refresh long-lived tokens daily at 06:00 UTC (well before 60-day expiry).
select cron.schedule(
  'manyjean-token-refresh',
  '0 6 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'manyjean_app_url')
             || '/api/internal/tokens/refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' ||
          (select decrypted_secret from vault.decrypted_secrets where name = 'manyjean_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);

-- To inspect / manage:
--   select jobid, jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 20;
--   select cron.unschedule('manyjean-drain');
