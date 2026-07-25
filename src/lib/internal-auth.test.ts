import { describe, it, expect } from "vitest";
import { constantTimeEqual } from "./internal-auth";

describe("constantTimeEqual", () => {
  it("returns true for equal strings", () => {
    expect(constantTimeEqual("secret-abc", "secret-abc")).toBe(true);
  });
  it("returns false for different strings of equal length", () => {
    expect(constantTimeEqual("secret-abc", "secret-xyz")).toBe(false);
  });
  it("returns false for different lengths", () => {
    expect(constantTimeEqual("short", "longer-secret")).toBe(false);
  });
  it("returns false when one is empty", () => {
    expect(constantTimeEqual("", "nonempty")).toBe(false);
  });
});
