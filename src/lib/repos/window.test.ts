import { describe, it, expect } from "vitest";
import { isWindowOpen, MESSAGING_WINDOW_MS } from "./contacts";

describe("messaging window", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");

  it("is open when expiry is in the future", () => {
    const expires = new Date(now.getTime() + 60_000).toISOString();
    expect(isWindowOpen({ messaging_window_expires_at: expires }, now)).toBe(true);
  });

  it("is closed when expiry has passed", () => {
    const expires = new Date(now.getTime() - 1).toISOString();
    expect(isWindowOpen({ messaging_window_expires_at: expires }, now)).toBe(false);
  });

  it("is closed when never set", () => {
    expect(isWindowOpen({ messaging_window_expires_at: null }, now)).toBe(false);
  });

  it("uses a 24h window constant", () => {
    expect(MESSAGING_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });
});
