import { describe, it, expect } from "vitest";
import { buildAuthorizeUrl, oauthRedirectUri } from "./oauth";
import { IG_SCOPE_STRING } from "./config";

describe("OAuth URL building", () => {
  it("builds a correct authorize URL with required params", () => {
    const url = new URL(
      buildAuthorizeUrl({
        appId: "123",
        redirectUri: "https://app.example.com/api/oauth/callback",
        state: "xyz",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://www.instagram.com/oauth/authorize",
    );
    expect(url.searchParams.get("client_id")).toBe("123");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/oauth/callback",
    );
    expect(url.searchParams.get("scope")).toBe(IG_SCOPE_STRING);
    expect(url.searchParams.get("state")).toBe("xyz");
    expect(url.searchParams.get("force_reauth")).toBe("true");
  });

  it("derives the redirect URI without a trailing slash", () => {
    expect(oauthRedirectUri("https://app.example.com/")).toBe(
      "https://app.example.com/api/oauth/callback",
    );
    expect(oauthRedirectUri("https://app.example.com")).toBe(
      "https://app.example.com/api/oauth/callback",
    );
  });
});
