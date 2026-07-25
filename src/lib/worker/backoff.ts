/**
 * Exponential backoff with jitter for retrying transient send failures
 * (brief §12). Pure + injectable RNG for deterministic tests.
 */
export function computeBackoffMs(
  attempt: number,
  opts: { baseMs?: number; capMs?: number; rng?: () => number } = {},
): number {
  const baseMs = opts.baseMs ?? 2000;
  const capMs = opts.capMs ?? 5 * 60 * 1000; // 5 min cap
  const rng = opts.rng ?? Math.random;

  const n = Math.max(1, Math.floor(attempt));
  const exp = Math.min(capMs, baseMs * 2 ** (n - 1));
  // Equal jitter: half fixed + half random => spreads retries, never 0.
  const half = exp / 2;
  return Math.floor(half + rng() * half);
}

/** Honor a server-provided Retry-After (seconds) if present and sane. */
export function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3600) return null;
  return Math.floor(seconds * 1000);
}
