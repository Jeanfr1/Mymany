import "server-only";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { IG_AUTH_HOST, IG_SCOPE_STRING } from "./config";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type OAuthContext = { reconnect_account_id?: string };

/** Create a random, single-use OAuth state and persist it with a short TTL. */
export async function createOAuthState(
  context: OAuthContext = {},
): Promise<string> {
  const state = randomBytes(32).toString("base64url");
  const db = createServiceClient();
  const { error } = await db.from("oauth_states").insert({
    state,
    context,
    expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  });
  if (error) throw error;
  return state;
}

/**
 * Validate and consume a state: must exist, be unexpired, and unused.
 * Marks it used atomically-ish (single-use). Returns the stored context, or null.
 */
export async function consumeOAuthState(
  state: string,
): Promise<OAuthContext | null> {
  if (!state) return null;
  const db = createServiceClient();

  // Atomic single-use: only succeeds if used_at was null.
  const { data, error } = await db
    .from("oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("state", state)
    .is("used_at", null)
    .gte("expires_at", new Date().toISOString())
    .select("context")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return (data.context as OAuthContext) ?? {};
}

export function buildAuthorizeUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(`${IG_AUTH_HOST}/oauth/authorize`);
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", IG_SCOPE_STRING);
  url.searchParams.set("state", params.state);
  // Instagram otherwise reuses the active browser session. That makes the
  // "Connect" action bind the previously authorized account again instead of
  // letting the admin authenticate a different professional account.
  url.searchParams.set("force_reauth", "true");
  return url.toString();
}

/** The exact redirect URI Meta must have registered. */
export function oauthRedirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/oauth/callback`;
}
