import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature, verifyHandshake } from "./signature";

const SECRET = "test-app-secret";
function sign(body: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ object: "instagram", entry: [] });

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const good = sign(body);
    const tampered = body.replace("instagram", "hacked");
    expect(verifyWebhookSignature(tampered, good, SECRET)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const sigWithOtherSecret =
      "sha256=" + createHmac("sha256", "other").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sigWithOtherSecret, SECRET)).toBe(false);
  });

  it("rejects missing / malformed headers", () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "md5=abc", SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "sha256=deadbeef", SECRET)).toBe(false);
  });
});

describe("verifyHandshake", () => {
  it("echoes challenge on a valid handshake", () => {
    expect(
      verifyHandshake({
        mode: "subscribe",
        token: "vt",
        challenge: "12345",
        verifyToken: "vt",
      }),
    ).toBe("12345");
  });

  it("rejects wrong token / mode / missing challenge", () => {
    expect(
      verifyHandshake({ mode: "subscribe", token: "bad", challenge: "1", verifyToken: "vt" }),
    ).toBeNull();
    expect(
      verifyHandshake({ mode: "unsubscribe", token: "vt", challenge: "1", verifyToken: "vt" }),
    ).toBeNull();
    expect(
      verifyHandshake({ mode: "subscribe", token: "vt", challenge: null, verifyToken: "vt" }),
    ).toBeNull();
  });
});
