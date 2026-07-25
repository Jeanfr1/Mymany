# RUNBOOK.md — operations & recovery

## Health & observability
- `GET /api/health` → `{ ok, db, ts }`.
- Dashboard **Overview**: connected accounts, active automations, pending/failed/
  skipped jobs, events (24h), last webhook.
- **Events** and **Queue** tabs: full history + errors. **Diagnostics**: env presence,
  live token/webhook check.
- Structured JSON logs in Vercel → Functions logs (no secrets).

## Common issues

**No events arriving**
- Diagnostics → Run connection test → check "Webhook subscribed".
- Verify Meta webhook callback URL + verify token; re-subscribe by reconnecting.
- Check the account has a role (owner/tester) on the Meta app.

**Jobs stuck / not sending**
- Check `cron.job_run_details` in Supabase for drain failures.
- Confirm `manyjean_app_url` + `manyjean_cron_secret` Vault secrets match Vercel.
- Manually drain: `POST /api/internal/queue/drain` with `Authorization: Bearer <secret>`.
- Jobs stuck in `sending` self-recover after 300s (see `claim_queue_jobs`).

**Messages skipped**
- `skip_reason` explains why: `window_closed` (no open 24h window — expected),
  `automation_inactive`, `account_disconnected`, `clicked_already`, `invalid_link_url`.

**Token expired / account disconnected**
- Connection tab shows status. Click **Reconnect** to re-run OAuth.
- Daily token refresh runs via cron; failures mark the account `expired`.

**Supabase project paused (Free tier, 7 days idle)**
- Resume in the Supabase dashboard. The per-minute cron ping normally keeps it warm.

## Recovery actions
- **Reprocess a failed/skipped job:** Queue tab → Reprocess (resets to pending).
- **Replay safety:** all sends are deduped by key; replaying a webhook creates no
  duplicate messages.
- **Rotate `INTERNAL_CRON_SECRET`:** update Vercel env + `vault.update_secret(
  'manyjean_cron_secret', '<new>')`; redeploy.
- **Rotate `TOKEN_ENCRYPTION_KEY`:** breaks existing encrypted tokens → reconnect all
  accounts after rotating. (No key-versioned re-encryption in v1.)

## Cron management (Supabase SQL editor)
```sql
select jobid, jobname, schedule, active from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
select cron.unschedule('manyjean-drain');
```
