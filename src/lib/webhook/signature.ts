import { createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Validate the X-Hub-Signature-256 header against the raw request body.
 * signature = "sha256=" + HMAC_SHA256(appSecret, rawBody).  (DECISIONS §4 / brief §8.2)
 * Constant-time comparison; rejects missing/malformed signatures.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected =
    "sha256=" +
    createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqual(signatureHeader, expected);
}

/**
 * Validate the signature against ANY of the candidate secrets (constant-time each).
 * In the Instagram-Login setup, the webhook may be signed with the Instagram App
 * Secret OR the Meta App Secret — we accept either. Returns the index of the
 * matching secret (for masked diagnostics), or -1 if none match.
 */
export function verifyWebhookSignatureAny(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secrets: string[],
): number {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return -1;
  for (let i = 0; i < secrets.length; i++) {
    const secret = secrets[i];
    if (!secret) continue;
    if (verifyWebhookSignature(rawBody, signatureHeader, secret)) return i;
  }
  return -1;
}

/**
 * Validate the GET handshake. Returns the challenge to echo, or null to reject.
 * (brief §8.1)
 */
export function verifyHandshake(params: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  verifyToken: string;
}): string | null {
  if (
    params.mode === "subscribe" &&
    params.token != null &&
    safeEqual(params.token, params.verifyToken) &&
    params.challenge != null
  ) {
    return params.challenge;
  }
  return null;
}
