# DEPLOYMENT.md — checklist

Ordered steps to go from repo → live. Secrets are **always** entered in the
Vercel/Supabase dashboards, never in chat and never committed.

## 0. Prereqs
- Supabase project **manyjean** (`tykrnuglnunvstlljlzf`) — already created, migrations applied.
- Vercel team **jeanfr1's projects** — already connected.

## 1. Get the code to Vercel
Two options:
- **A. GitHub → Vercel (recommended, gives CI/CD):** create a GitHub repo, push
  `main`, then "Add New Project" in Vercel and import it.
- **B. Direct file deploy:** deploy the file tree straight to Vercel (no git).

Framework auto-detects as Next.js. Build command `next build`, install `npm ci`.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)
Set for **Production** (and Preview if used). Generate secrets yourself and paste
directly into Vercel:

| Variable | Value | Secret? |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | your `https://<app>.vercel.app` | no |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tykrnuglnunvstlljlzf.supabase.co` | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | **yes** |
| `INSTAGRAM_APP_ID` | from Meta app (set during Meta setup) | no |
| `INSTAGRAM_APP_SECRET` | from Meta app | **yes** |
| `INSTAGRAM_VERIFY_TOKEN` | `openssl rand -hex 24` | **yes** |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` (must be 32 bytes) | **yes** |
| `INTERNAL_CRON_SECRET` | `openssl rand -hex 32` | **yes** |
| `ADMIN_EMAILS` | your admin email(s), comma-separated | no |

`NEXT_PUBLIC_*` are build-time inlined → **redeploy** after changing them.
Instagram values can be added during Meta setup, then redeploy.

## 3. Supabase Auth (dashboard → Authentication)
- Add your admin email as a user (Authentication → Users → Add user), or allow the
  first magic-link sign-in for an allowlisted email.
- **Disable public sign-ups** (Authentication → Providers/Sign-in → disable new
  user sign-ups) so only allowlisted admins exist.
- Add `https://<app>.vercel.app/**` to the allowed redirect URLs (Auth → URL config).

## 4. Supabase Cron (after the app URL + cron secret exist)
Store two Vault secrets (Supabase → Project Settings → Vault, or SQL editor), then
schedule the jobs. See `supabase/cron/setup_cron.sql`. This drains the queue every
minute and refreshes tokens daily. (Vercel Hobby cron only runs once/day — see
DECISIONS §11/§12 — so scheduling lives in Supabase.)

## 5. Meta app configuration
Follow `docs/META_SETUP.md` (created during the guided setup). You'll register:
- OAuth redirect URI: `https://<app>.vercel.app/api/oauth/callback`
- Webhook callback URL: `https://<app>.vercel.app/api/webhook` + the verify token
- Webhook fields: `comments`, `messages`
- Privacy URL: `https://<app>.vercel.app/privacy`
- Data deletion URL: `https://<app>.vercel.app/data-deletion`

## 6. Post-deploy verification
- Visit `https://<app>.vercel.app/api/health` → `{ ok: true }`.
- Sign in at `/login` with your admin email (magic link).
- Connect Instagram (Connection tab) → Diagnostics → Run connection test.
- Run the acceptance test (`docs/ACCEPTANCE.md`).
