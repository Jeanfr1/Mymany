# Manyjean

A private, single-admin Instagram automation app — a focused replacement for the
basic ManyChat features, for **your own** Instagram Business/Creator accounts.
It replies to keyword comments (private + optional public reply), reacts to story
replies and DMs, respects Instagram's 24-hour messaging window, and can send a
trackable link and a reminder.

Built to run at **$0/month** at low personal volume on Vercel Hobby + Supabase Free.

> Full platform/compliance decisions live in [`docs/DECISIONS.md`](docs/DECISIONS.md).
> What's tested and how: [`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## Stack

- **Next.js 16** (App Router, `proxy.ts`), **TypeScript strict**, **Tailwind v4**
- **Supabase** — Postgres, Auth (admin login), `pg_cron` + `pg_net` (scheduling), Vault
- **Zod** (input + env validation), **Vitest** (60 unit tests)
- **Vercel Hobby** hosting · Instagram API with Instagram Login **v25.0**

## How it works

1. A user comments a keyword → webhook → a **private reply** is sent (one per comment),
   inviting them to tap a quick reply.
2. When they actually reply/tap (a real inbound event), the **24h window opens** and the
   app sends the welcome/link and schedules a reminder — all re-checked at send time.
3. A tracked link (`/r/<code>`) records the click and can cancel the reminder.

Delivery is a durable queue drained every minute by **Supabase Cron** (Vercel Hobby cron
only runs once/day). A webhook also opportunistically drains after responding.

## Local development

```bash
cp .env.example .env.local   # fill in values (see below)
npm install
npm run dev                  # http://localhost:3000
npm run verify               # lint + typecheck + test + build
```

### Environment variables

See [`.env.example`](.env.example). Public: `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Secret (server only):**
`SUPABASE_SERVICE_ROLE_KEY`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`,
`INSTAGRAM_VERIFY_TOKEN`, `TOKEN_ENCRYPTION_KEY`, `INTERNAL_CRON_SECRET`, `ADMIN_EMAILS`.
Secrets are set in the Vercel dashboard, never committed.

Generate secrets:
```bash
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY (32 bytes)
openssl rand -hex 32      # INTERNAL_CRON_SECRET
openssl rand -hex 24      # INSTAGRAM_VERIFY_TOKEN
```

## Database

Versioned SQL migrations in [`supabase/migrations/`](supabase/migrations). Tables:
`instagram_accounts`, `automations`, `followups`, `contacts`, `events`, `queue`,
`tracking_links`, `click_events`, `oauth_states`. RLS is enabled deny-all on every table;
all access is server-side via the service role.

## Key routes

| Route | Purpose |
|---|---|
| `/dashboard/*` | Admin UI (auth-gated) |
| `/api/oauth/start` · `/callback` | Connect Instagram |
| `/api/webhook` | Meta webhook (HMAC-verified) |
| `/api/internal/queue/drain` | Queue worker (cron, secret-gated) |
| `/api/internal/tokens/refresh` | Token refresh (cron, secret-gated) |
| `/r/[code]` | Trackable redirect |
| `/api/health` | Health check |
| `/privacy` · `/data-deletion` · `/terms` | Legal |

## Docs

- [`docs/DECISIONS.md`](docs/DECISIONS.md) — audit & architecture decisions
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md) — test coverage & live checks
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploy checklist *(added at deploy)*
- [`docs/META_SETUP.md`](docs/META_SETUP.md) — step-by-step Meta configuration *(added at setup)*
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — operations & recovery *(added at deploy)*
