import { describe, it, expect } from "vitest";
import { isSafeHttpsUrl, trimTrailingSlash } from "./url";

describe("isSafeHttpsUrl", () => {
  it("accepts normal https URLs", () => {
    expect(isSafeHttpsUrl("https://example.com/promo?x=1")).toBe(true);
    expect(isSafeHttpsUrl("https://sub.example.co.uk/a/b")).toBe(true);
  });
  it("rejects non-https protocols", () => {
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpsUrl("file:///etc/passwd")).toBe(false);
  });
  it("rejects embedded credentials", () => {
    expect(isSafeHttpsUrl("https://user:pass@example.com")).toBe(false);
  });
  it("rejects private / loopback hosts", () => {
    expect(isSafeHttpsUrl("https://localhost/x")).toBe(false);
    expect(isSafeHttpsUrl("https://127.0.0.1/x")).toBe(false);
    expect(isSafeHttpsUrl("https://10.0.0.5/x")).toBe(false);
    expect(isSafeHttpsUrl("https://192.168.1.1/x")).toBe(false);
    expect(isSafeHttpsUrl("https://169.254.1.1/x")).toBe(false);
    expect(isSafeHttpsUrl("https://172.16.0.1/x")).toBe(false);
  });
  it("rejects junk", () => {
    expect(isSafeHttpsUrl("")).toBe(false);
    expect(isSafeHttpsUrl("not a url")).toBe(false);
  });
});

describe("trimTrailingSlash", () => {
  it("removes a single trailing slash", () => {
    expect(trimTrailingSlash("https://a.com/")).toBe("https://a.com");
    expect(trimTrailingSlash("https://a.com")).toBe("https://a.com");
  });
});
