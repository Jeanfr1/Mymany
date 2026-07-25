/**
 * URL validation for outbound links and redirects (brief §11/§15).
 * Only pre-registered https:// URLs are allowed; dangerous protocols
 * (javascript:, data:, file:, etc.) and embedded credentials are rejected.
 */
export function isSafeHttpsUrl(input: string): boolean {
  if (typeof input !== "string" || input.trim() === "") return false;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  // Reject obviously non-routable hosts to prevent SSRF-ish redirects.
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }
  return true;
}

/** Normalize a base URL by stripping a trailing slash. */
export function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}
