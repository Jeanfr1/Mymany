import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for Instagram access tokens (DECISIONS §14).
 *
 * Stored format (self-describing, versioned):
 *   v1:<base64 iv>.<base64 authTag>.<base64 ciphertext>
 *
 * The key lives ONLY in the TOKEN_ENCRYPTION_KEY env var (never in the DB/repo/logs).
 * This module reads that single var directly so it is unit-testable without full env.
 */

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key (generate: openssl rand -base64 32).",
    );
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptToken: plaintext must be a non-empty string.");
  }
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptToken(encoded: string): string {
  const key = getKey();
  const sep = encoded.indexOf(":");
  const version = sep === -1 ? "" : encoded.slice(0, sep);
  const rest = sep === -1 ? "" : encoded.slice(sep + 1);
  if (version !== VERSION || !rest) {
    throw new Error("decryptToken: unrecognized token encryption format.");
  }
  const [ivB64, tagB64, dataB64] = rest.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("decryptToken: malformed encrypted token.");
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Safe-for-logs masked representation of a secret (never logs the full value). */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "(none)";
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
