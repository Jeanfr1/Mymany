# VERIFICATION.md — what has been tested, and how

> Honesty ledger (per project rules). Distinguishes **unit-tested**, **verified
> live against the DB**, and **not yet exercised end-to-end** (needs Meta + real
> Instagram traffic, done in the acceptance test).

## Automated unit tests (60 passing) — `npm test`

| Area | File | Covers |
|---|---|---|
| Token crypto | `src/lib/crypto/token.test.ts` | AES-256-GCM round-trip, random IV, tamper rejection (GCM tag), malformed input, masking |
| Keyword matching | `src/lib/matching/match.test.ts` | normalization (lowercase/space/accents), exact, contains, any, accent option |
| Webhook signature | `src/lib/webhook/signature.test.ts` | valid sig, tampered body, wrong secret, missing/malformed, GET handshake |
| Webhook parsing | `src/lib/webhook/parse.test.ts` | comment, DM, story reply, quick reply, postback, echo flag, reactions=unsupported, malformed, **dedup hash stability** |
| Error classification | `src/lib/instagram/errors.test.ts` | retryable (429/5xx/codes) vs auth (190) vs permanent (100) |
| Backoff | `src/lib/worker/backoff.test.ts` | exponential growth, cap, jitter bounds, Retry-After parsing |
| URL safety | `src/lib/url.test.ts` | https-only, blocks javascript:/data:/file:, credentials, private/loopback hosts |
| OAuth URL | `src/lib/instagram/oauth.test.ts` | authorize URL params, redirect URI derivation |
| Internal auth | `src/lib/internal-auth.test.ts` | constant-time secret compare |
| Messaging window | `src/lib/repos/window.test.ts` | open/closed/expiry, 24h constant |

## Verified LIVE against the database (SQL, 2026-07-25)

Executed against the real Supabase project and cleaned up afterward:

- **Atomic queue claim** — `claim_queue_jobs` grabbed 2 due jobs, set `attempts=1`.
- **No double-claim** — a second immediate claim returned **0** (jobs are `sending`).
- **Abandoned-job recovery** — a job stuck in `sending` for 10 min was recovered and
  re-claimed (`attempts=2`) once past the 300s timeout.
- **OAuth state single-use** — first consume succeeded (1), second returned 0.
- **Dedup unique constraint** — duplicate `events.deduplication_hash` insert raised
  `unique_violation` (the app maps this to a silent duplicate skip).
- **Schema/RLS** — RLS enabled on all 9 tables (deny-all; service_role only);
  security advisor clean except accepted `pg_net`-in-public (cannot be relocated).
- **pg_cron + pg_net** — both installable and available on this Free project.

## Build gate — `npm run verify`

`eslint` ✓ · `tsc --noEmit` (strict) ✓ · `vitest run` (60) ✓ · `next build` ✓.

## NOT yet exercised (requires Meta app + real Instagram) — done in acceptance test

- Real OAuth round-trip (code → long-lived token → profile → subscribe).
- Real webhook delivery + signature from Meta.
- Real message/private-reply/public-reply sends and Meta responses.
- Real click on `/r/[code]` and reminder cancellation end-to-end.
- Supabase Cron actually firing the drain every minute in production.

These are covered by the acceptance test (`docs/ACCEPTANCE.md`, brief §22).
