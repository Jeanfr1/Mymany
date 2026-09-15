import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeForLongLivedToken, getMessagingUserProfile } from "./client";

describe("Instagram token exchange", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges a short-lived token using the Instagram exchange endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "long-token",
          token_type: "bearer",
          expires_in: 5_184_000,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      exchangeForLongLivedToken({
        appSecret: "app-secret",
        shortLivedToken: "short-token",
      }),
    ).resolves.toEqual({
      access_token: "long-token",
      token_type: "bearer",
      expires_in: 5_184_000,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [input, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(input.origin + input.pathname).toBe(
      "https://graph.instagram.com/access_token",
    );
    expect(input.searchParams.get("grant_type")).toBe("ig_exchange_token");
    expect(input.searchParams.get("client_secret")).toBe("app-secret");
    expect(input.searchParams.get("access_token")).toBe("short-token");
    expect(init.method).toBe("GET");
  });
});

describe("Instagram messaging user profile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the live follower relationship for an Instagram-scoped user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "igsid-1",
          username: "member",
          is_user_follow_business: true,
          is_business_follow_user: false,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getMessagingUserProfile({
        accessToken: "account-token",
        instagramScopedId: "igsid-1",
      }),
    ).resolves.toMatchObject({
      id: "igsid-1",
      is_user_follow_business: true,
    });

    const [input, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(input.origin + input.pathname).toBe(
      "https://graph.instagram.com/v25.0/igsid-1",
    );
    expect(input.searchParams.get("fields")).toContain(
      "is_user_follow_business",
    );
    expect(input.searchParams.get("access_token")).toBe("account-token");
    expect(init.method).toBe("GET");
  });
});
