# DECISIONS.md — Architecture & Compliance Audit

> Single-tenant Instagram automation for **my own** Instagram account(s).
> This file is the source of truth for every platform fact and design decision.
> **Legend for honesty (per project rules):**
> ✅ Verified against official docs · 🔎 Inferred / needs live test · ⚠️ Risk / open question

Last audited: **2026-07-25**.

---

## 0. Product scope (confirmed with owner)

- **Use type:** Personal, non-commercial. All automated accounts belong to the owner.
- **Multiplicity:** Owner wants to automate **more than one of their own** Instagram accounts.
  → We model connected accounts as a table (`instagram_accounts`), not a single hardcoded row.
  → Still **single-admin** (only the owner logs into the dashboard) and **single-tenant** (one owner).
- **Hosting address:** Start on the free `*.vercel.app` URL; custom domain optional later.
- **Out of scope for v1:** billing, multi-customer/agency, white-label, marketplace, affiliates,
  cold-audience messaging, contact-list imports.

---

## 1. Instagram Platform API version

- **Chosen version: `v25.0`** ✅
  Verified from the official Meta doc *"Send Messages using the Instagram API with Instagram Login"*,
  whose endpoint examples use `https://graph.instagram.com/v25.0/<IG_ID>/messages`.
  (Third-party blogs disagreed — one said v22.0 — so we trusted the official page, not the blogs.)
- **API product: "Instagram API with Instagram Login"** ✅ (not the legacy "Facebook Login for Business"
  / Instagram Graph API via a Facebook Page). This path does **not require a linked Facebook Page**
  for messaging + comments on an Instagram Business/Creator account.
- **Version pinning:** stored once in `src/lib/instagram/config.ts` as `IG_API_VERSION`. Never hard-code
  the version string anywhere else. Re-audit before bumping.

---

## 2. Confirmed hosts & endpoints ✅

Base host: **`https://graph.instagram.com`** (Instagram-Login flavor).

| Purpose | Method | Path |
|---|---|---|
| OAuth authorize (user redirect) | GET | `https://www.instagram.com/oauth/authorize` |
| Exchange code → short-lived token | POST | `https://api.instagram.com/oauth/access_token` |
| Short-lived → long-lived token (60 days) | GET | `https://graph.instagram.com/access_token?grant_type=ig_exchange_token` |
| Refresh long-lived token | GET | `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` |
| Connected account profile | GET | `https://graph.instagram.com/v25.0/me?fields=user_id,username,name,profile_picture_url,account_type` |
| List my media | GET | `https://graph.instagram.com/v25.0/me/media` |
| Send message / private reply | POST | `https://graph.instagram.com/v25.0/<IG_ID>/messages` |
| Reply publicly to a comment | POST | `https://graph.instagram.com/v25.0/<COMMENT_ID>/replies` |
| Subscribe webhook fields for the account | POST | `https://graph.instagram.com/v25.0/<IG_ID>/subscribed_apps` |

🔎 Exact query params/field lists for each are validated at implementation time against the live docs and
a real call; any deviation gets corrected in code and noted here.

---

## 3. Required permissions (scopes) ✅

- `instagram_business_basic` — profile + media (required baseline).
- `instagram_business_manage_messages` — read/send DMs, private replies, respond to messaging webhooks.
- `instagram_business_manage_comments` — read comments, public replies, private replies to comments.

We request **only** these three. No `instagram_business_content_publish` (we don't publish posts).

---

## 4. Webhook format ✅ / 🔎

- **Verification (GET):** Meta sends `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`.
  We compare `hub.verify_token` to our secret using **constant-time** comparison and echo `hub.challenge`.
- **Events (POST):**
  - Header **`X-Hub-Signature-256: sha256=<hmac>`**, HMAC-SHA256 of the **raw body** keyed with the **App Secret**.
  - We must read the raw body *before* JSON parsing (Next.js Node runtime, `await req.text()`), validate the
    signature with constant-time compare, and only then parse.
  - Top-level shape: `{ object: "instagram", entry: [ { id, time, changes?[], messaging?[] } ] }`.
    - **Comments** arrive under `entry[].changes[]` with `field: "comments"`.
    - **Messages / story replies / quick replies / postbacks** arrive under `entry[].messaging[]`.
  - 🔎 Field-level JSON paths vary and include optional fields — parsers are **tolerant** (see §8) and
    covered by fixtures. Unknown events are stored as `unsupported`, never dropped.
- **Subscribed fields:** at minimum `comments`, `messages`. `messaging_postbacks`, `message_reactions`,
  and story-reply delivery are validated live; we subscribe to what the app's webhook config exposes.

---

## 5. Messaging-window rules ✅ (Meta-enforced — we never try to bypass)

- **24-hour standard window:** once an IG user sends an inbound message to the account, the app has **24h**
  to send standard messages freely. Each new inbound message **resets** the 24h clock.
- **A private reply does NOT open a messaging window.** It is a one-shot reply to a comment. The window
  opens only when the user actually **sends an inbound message** (e.g., taps our quick reply and replies).
  → This is why the first private reply must invite an inbound action ("Send me the link"), and follow-ups
  are scheduled **only after a real inbound event**, re-checked at send time.
- **Human-agent tag** extends the window to **7 days** for human-in-the-loop replies. ⚠️ Automated sending
  under this tag has policy conditions; v1 treats it as **off by default** and only sends within the plain
  24h window unless explicitly enabled and justified.

---

## 6. Private-reply restrictions ✅

- **One private reply per comment, ever** (Meta-enforced). We dedupe by `(comment_id, automation_id)` and
  never attempt a second private reply to the same comment.
- Private reply to a comment is allowed for comments up to **7 days** old. 🔎 We still send promptly and
  record Meta's response; if Meta rejects (too old / already replied), we mark the job `skipped` with reason.
- Public reply to a comment (`/<comment_id>/replies`) is separate and optional; we randomize from configured
  variations and never publish if the automation was disabled before sending.

---

## 7. Limits — documented vs unknown

- **App-level Graph calls:** ~**200 calls/hour/app** is widely cited 🔎 (platform rate limiting is dynamic and
  header-driven). We **do not** hard-code "200 messages/hour" as a messaging limit.
- **Send pacing:** all pacing values (messages/sec, batch size, internal hourly ceiling, max attempts, claim
  timeout) are **our own conservative operational settings**, clearly labeled as such in the dashboard —
  distinct from any official Meta limit. We honor `429` + rate-limit headers with exponential backoff + jitter.
- **`pg_net`** reliably executes up to ~200 req/s (Supabase) — far above our need.

---

## 8. Parser strategy ✅

- No single rigid JSON path. Each event type has a tolerant parser that treats optional fields as optional and
  returns a normalized internal event, with sanitized fixtures + unit tests for: comment, story reply, DM,
  quick reply, postback, duplicate, unknown.

---

## 9. App Review / Access levels ✅ / ⚠️

- **Standard Access** is available by default and is enough for **the app owner's own connected accounts**
  where those accounts have a **role on the app** (owner/admin/tester).
- **Advanced Access** (public users who have no role) requires **App Review** and, for business features,
  **Business Verification**. ⚠️ Because all our accounts are the owner's own and added as **testers/owners**,
  we target **Standard Access** and aim to avoid full App Review for v1.
- 🔎 We confirm empirically that each of the owner's accounts receives events once added with a role and the
  token is authorized. If Meta requires review for a specific field, we surface that instead of guessing.

---

## 10. Development Mode vs Live Mode ✅ / 🔎

- We do **not** claim "Dev Mode never receives events." In Development Mode, the app **can** exercise
  Instagram features for **users who have a role on the app** (owner/admin/tester) — which covers our use case.
- 🔎 Whether we must flip to **Live Mode** depends on the current dashboard; determined during Meta setup (§16
  of the brief). Switching to Live may require the privacy-policy URL + data-deletion callback (both provided).

---

## 11. Free-plan costs & restrictions

### Vercel — **Hobby (free)** ✅ / ⚠️
- **Allowed for us:** Hobby is **non-commercial personal use only**. Our use qualifies. ✅
- **⚠️ Decisive constraint:** Hobby **Cron Jobs run at most once per day** (any sub-daily schedule fails at
  deploy). Timing only guaranteed within the hour. → **Vercel Cron cannot drive our per-minute queue drain.**
- Serverless functions, bandwidth, and build minutes are within free limits for personal volume.

### Supabase — **Free** ✅ / ⚠️
- 500 MB database, 1 GB storage, 5 GB egress, up to **2 active projects**, 7-day log retention. ✅ sufficient.
- **⚠️ Auto-pause after 7 days of no activity.** Our own cron pinging the DB (via `pg_net` or an external
  pinger) keeps the project warm; documented in RECOVERY.
- **`pg_cron` / `pg_net` on Free:** sources conflict (one says enabled on all plans; one says the background
  worker is Pro-gated). ⚠️ **We verify empirically on the created project** (try to enable both, schedule a
  1-minute job, confirm it fires). See §12 for the decided fallback.

### Overall
- **No promise of zero cost.** Realistic expectation: **$0/month** at low personal volume on Hobby + Free.
  If volume grows or commercial use begins, revisit (Vercel Pro ~$20/mo, Supabase Pro ~$25/mo).

---

## 12. Scheduling decision (the key architectural choice) ✅

- **Primary:** **Supabase Cron via `pg_cron` + `pg_net`**, calling our protected internal endpoints:
  - `POST /api/internal/queue/drain` — every **1 minute**.
  - `POST /api/internal/tokens/refresh` — daily (safe interval before 60-day token expiry).
- **⚠️ Contingency if `pg_cron`/`pg_net` are not reliable on Free:** switch the trigger to a **free external
  cron** (e.g. `cron-job.org`) hitting the same secured `drain` endpoint every minute. The endpoint is
  scheduler-agnostic (protected by `INTERNAL_CRON_SECRET`), so this is a config change, not a code change.
- The HTTP-call secret is **never** stored in a committed migration. On Supabase it lives in **Vault** and is
  read at job runtime; otherwise it lives only in the external scheduler's config.
- **Opportunistic drain** after webhook receipt is a *best-effort accelerator only*. Cron is the durable
  recovery mechanism. Neither is the sole delivery path.
- **Time zones:** all schedules + DB timestamps in **UTC** (`timestamptz`); dashboard renders in
  `America/Sao_Paulo`.

---

## 13. Incompatibilities found in the brief (resolved)

1. **Brief §7.1 `config` as a single active configuration** vs. owner wanting multiple own accounts.
   → **Resolved:** replaced single `config` row with an **`instagram_accounts`** table (one row per connected
   account). All downstream tables carry `instagram_account_id`. Still single-admin/single-tenant.
2. **Brief §13 leans on Cron but doesn't state Vercel Hobby's once-per-day cap.**
   → **Resolved:** scheduling authority is **Supabase Cron**, with external-cron fallback (§12).
3. **Brief §12 "200 messages/hour" caution.** → Honored: treated as **internal, adjustable** setting, labeled
   as such; not presented as an official Meta limit.
4. **Brief §5 mentions `proxy.ts`.** ✅ Correct for **Next.js 16** (middleware file was renamed to `proxy.ts`).
   Auth is enforced in Server Components/Actions/Route Handlers too — `proxy.ts` is not the only guard.

---

## 14. Token storage decision ✅

- **Chosen: server-side AES-256-GCM encryption** of the Instagram access token before storing in Postgres.
  - Key: `TOKEN_ENCRYPTION_KEY` (32 bytes, base64) lives **only** in Vercel env vars — never in the DB, repo,
    or logs. Per-record random 12-byte IV; auth tag stored alongside ciphertext.
  - **Why over Supabase Vault:** the app already runs trusted server code on Vercel with a KMS-style env
    secret; app-layer AES-GCM keeps encryption keys **out of the database** entirely (defense in depth even if
    the DB is exposed) and is portable across hosts. Vault remains the store for the **cron HTTP secret** on
    the DB side (§12), where the caller is Postgres itself.
- Tokens are never logged; only masked prefixes (e.g. `IGQV…abcd`) appear in diagnostics.

---

## 15. Chosen stack (final) ✅

- **Next.js 16.2.11** (App Router, `proxy.ts`, async `cookies()/headers()/params/searchParams`).
- **TypeScript strict**, **Tailwind v4**, **Zod v4** (input + env validation), **Vitest v4** (unit tests).
- **Supabase**: Postgres + Auth (dashboard protection) + `pg_cron`/`pg_net` (scheduling) + Vault (cron secret).
- **Node.js runtime** for all crypto/raw-body/webhook/Instagram routes (Edge is unsuitable for HMAC + raw body).
- **Vercel Hobby** hosting; **GitHub** for source; **git** locally.

---

## 16. Open items to validate live (tracked, not assumed)

- [ ] `pg_cron` + `pg_net` actually schedule & fire a 1-min job on the created **Free** project (else fallback §12).
- [ ] Exact webhook field availability (`messaging_postbacks`, story replies) in the app's webhook config.
- [ ] Whether Live Mode is required for the owner's tester accounts to receive events, or Dev Mode suffices.
- [ ] Real payload shapes for story reply vs quick reply vs postback → freeze fixtures from sanitized live data.
- [ ] Long-lived token refresh window behavior (refresh only valid after token is ≥24h old).
