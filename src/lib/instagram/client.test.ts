import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeForLongLivedToken } from "./client";

describe("Instagram token exchange", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges a short-lived token via a form-encoded POST", async () => {
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
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.instagram.com/access_token");
    expect(url).not.toContain("app-secret");
    expect(url).not.toContain("short-token");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(init.body).toBeInstanceOf(URLSearchParams);
    expect(String(init.body)).toBe(
      "grant_type=ig_exchange_token&client_secret=app-secret&access_token=short-token",
    );
  });
});
