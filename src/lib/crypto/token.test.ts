import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptToken, decryptToken, maskToken } from "./token";

beforeAll(() => {
  // 32-byte base64 key for AES-256-GCM
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("token crypto (AES-256-GCM)", () => {
  it("round-trips a token", () => {
    const secret = "IGQVJ-super-secret-access-token-1234567890";
    const enc = encryptToken(secret);
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain(secret);
    expect(decryptToken(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptToken("same-value");
    const b = encryptToken("same-value");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same-value");
    expect(decryptToken(b)).toBe("same-value");
  });

  it("rejects a tampered ciphertext (GCM auth tag)", () => {
    const enc = encryptToken("tamper-me");
    const [prefix, rest] = enc.split(":");
    const [iv, tag, data] = rest.split(".");
    // Flip a byte in the ciphertext
    const buf = Buffer.from(data, "base64");
    buf[0] = buf[0] ^ 0xff;
    const tampered = `${prefix}:${iv}.${tag}.${buf.toString("base64")}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => decryptToken("not-a-valid-format")).toThrow();
    expect(() => decryptToken("v1:only.two")).toThrow();
  });

  it("rejects an empty plaintext", () => {
    expect(() => encryptToken("")).toThrow();
  });

  it("masks tokens for logs without revealing the middle", () => {
    expect(maskToken("IGQVJabcdefghijklmnop")).toBe("IGQV…mnop");
    expect(maskToken("short")).toBe("****");
    expect(maskToken(null)).toBe("(none)");
  });
});
