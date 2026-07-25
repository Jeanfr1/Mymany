import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/**
 * Guard for /api/internal/* endpoints (queue drain, token refresh).
 * Accepts the shared secret via `Authorization: Bearer <secret>` or
 * `x-cron-secret: <secret>`. Constant-time comparison; never logs the secret.
 */
export function isAuthorizedInternalRequest(request: Request): boolean {
  const expected = getServerEnv().INTERNAL_CRON_SECRET;
  const header =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";
  return constantTimeEqual(header, expected);
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Compare against itself to keep timing uniform, then return false.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
