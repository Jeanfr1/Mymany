# SECURITY.md — checklist

## Secrets
- [x] Access tokens stored **AES-256-GCM encrypted**; key (`TOKEN_ENCRYPTION_KEY`)
      only in Vercel env, never in DB/repo/logs.
- [x] Service role key server-only; never sent to the browser; not exposed by tooling.
- [x] Logger redacts secret-looking keys; tokens only ever logged masked.
- [x] `.env*` gitignored; `.env.example` has no real values.
- [ ] All production secrets set in Vercel dashboard (not chat) — done at deploy.

## AuthN / AuthZ
- [x] Dashboard requires Supabase Auth session **and** email in `ADMIN_EMAILS`.
- [x] Authorization re-checked in Server Components/Actions/Route Handlers
      (`requireAdmin`) — `proxy.ts` is not the only guard.
- [x] Magic-link callback enforces the allowlist and signs out non-admins.
- [ ] Public sign-ups disabled in Supabase (done at deploy).

## Webhook
- [x] `X-Hub-Signature-256` HMAC-SHA256 over the **raw body**, constant-time compare.
- [x] Reject missing/invalid signatures before JSON parse.
- [x] GET handshake verify-token compared constant-time.

## Internal endpoints
- [x] `/api/internal/*` gated by `INTERNAL_CRON_SECRET`, constant-time compare.
- [x] Secret never logged; sent by cron via Vault-stored value.

## Database
- [x] RLS enabled deny-all on every table; access only via service role (server).
- [x] No public policies; `anon`/`authenticated` grants revoked.
- [x] Function `search_path` pinned; security advisor clean (except unrelocatable pg_net).

## Redirects & links
- [x] `/r/[code]` validates an unpredictable code and redirects only to
      pre-registered `https://` URLs; blocks dangerous protocols & private hosts.
- [x] Link URLs validated (`isSafeHttpsUrl`) on save and at send time.

## Data handling
- [x] Click IPs stored **hashed**, never raw.
- [x] OAuth `state` random, single-use, expiring.
- [x] Event payloads stored for diagnostics contain no tokens.

## Platform compliance
- [x] No cold/bulk messaging; only user-initiated interactions.
- [x] Messaging window (24h) respected; re-checked at send time; never bypassed.
- [x] One private reply per comment; deduped.
