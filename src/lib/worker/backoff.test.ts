import { describe, it, expect } from "vitest";
import { computeBackoffMs, retryAfterMs } from "./backoff";

describe("computeBackoffMs", () => {
  it("grows exponentially (with rng=0 lower bound)", () => {
    const rng = () => 0;
    expect(computeBackoffMs(1, { baseMs: 2000, rng })).toBe(1000); // exp=2000, half=1000
    expect(computeBackoffMs(2, { baseMs: 2000, rng })).toBe(2000); // exp=4000
    expect(computeBackoffMs(3, { baseMs: 2000, rng })).toBe(4000); // exp=8000
  });

  it("caps the delay", () => {
    const rng = () => 1;
    const v = computeBackoffMs(20, { baseMs: 2000, capMs: 300000, rng });
    expect(v).toBeLessThanOrEqual(300000);
    expect(v).toBeGreaterThanOrEqual(150000);
  });

  it("is never zero and within [half, exp]", () => {
    for (let i = 1; i <= 6; i++) {
      const v = computeBackoffMs(i, { baseMs: 1000 });
      const exp = Math.min(300000, 1000 * 2 ** (i - 1));
      expect(v).toBeGreaterThanOrEqual(exp / 2);
      expect(v).toBeLessThanOrEqual(exp);
    }
  });
});

describe("retryAfterMs", () => {
  it("parses a sane header", () => {
    expect(retryAfterMs("30")).toBe(30000);
  });
  it("rejects junk / out-of-range", () => {
    expect(retryAfterMs(null)).toBeNull();
    expect(retryAfterMs("abc")).toBeNull();
    expect(retryAfterMs("-5")).toBeNull();
    expect(retryAfterMs("999999")).toBeNull();
  });
});
