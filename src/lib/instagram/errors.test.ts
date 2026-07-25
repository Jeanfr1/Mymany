import { describe, it, expect } from "vitest";
import { IgApiError } from "./errors";

describe("IgApiError classification", () => {
  it("marks 429 as retryable", () => {
    const e = new IgApiError(429, { error: { message: "rate", code: 4 } });
    expect(e.retryable).toBe(true);
    expect(e.isAuthError).toBe(false);
  });

  it("marks 5xx as retryable", () => {
    const e = new IgApiError(500, { error: { message: "server", code: 2 } });
    expect(e.retryable).toBe(true);
  });

  it("marks invalid token (190) as auth error, NOT retryable", () => {
    const e = new IgApiError(400, {
      error: { message: "invalid token", code: 190 },
    });
    expect(e.isAuthError).toBe(true);
    expect(e.retryable).toBe(false);
  });

  it("marks invalid-parameter (100) as permanent (not retryable, not auth)", () => {
    const e = new IgApiError(400, { error: { message: "bad param", code: 100 } });
    expect(e.retryable).toBe(false);
    expect(e.isAuthError).toBe(false);
  });

  it("exposes safe log fields without secrets", () => {
    const e = new IgApiError(400, {
      error: { message: "x", code: 190, error_subcode: 460, fbtrace_id: "abc" },
    });
    const fields = e.toLogFields();
    expect(fields.meta_error_code).toBe(190);
    expect(fields.fbtrace_id).toBe("abc");
    expect(JSON.stringify(fields)).not.toContain("access_token");
  });
});
