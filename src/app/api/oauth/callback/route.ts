import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { consumeOAuthState, oauthRedirectUri } from "@/lib/instagram/oauth";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getProfile,
  subscribeAppToAccount,
} from "@/lib/instagram/client";
import { upsertConnectedAccount } from "@/lib/repos/accounts";
import { WEBHOOK_FIELDS, IG_SCOPES } from "@/lib/instagram/config";
import { IgApiError } from "@/lib/instagram/errors";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function redirectToConnection(appUrl: string, params: Record<string, string>) {
  const url = new URL(`${appUrl.replace(/\/$/, "")}/dashboard/connection`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  // The admin must be signed in to complete a connection.
  const admin = await getAdminUser();
  if (!admin) return NextResponse.redirect(new URL("/login", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectToConnection(appUrl, { status: "denied" });
  }
  if (!code) {
    return redirectToConnection(appUrl, { status: "missing_code" });
  }

  // Validate + consume the single-use state (CSRF protection).
  const context = await consumeOAuthState(state);
  if (!context) {
    return redirectToConnection(appUrl, { status: "invalid_state" });
  }

  let stage = "short_lived_token";
  try {
    // 1) code -> short-lived token
    const short = await exchangeCodeForToken({
      appId: env.INSTAGRAM_APP_ID,
      appSecret: env.INSTAGRAM_APP_SECRET,
      redirectUri: oauthRedirectUri(appUrl),
      code,
    });

    // 2) short-lived -> long-lived (~60 days)
    stage = "long_lived_token";
    const long = await exchangeForLongLivedToken({
      appSecret: env.INSTAGRAM_APP_SECRET,
      shortLivedToken: short.access_token,
    });

    // 3) profile
    stage = "profile";
    const profile = await getProfile(long.access_token);
    if (!profile.user_id) {
      return redirectToConnection(appUrl, { status: "no_profile" });
    }

    const grantedScopes = Array.isArray(short.permissions)
      ? short.permissions
      : typeof short.permissions === "string"
        ? short.permissions.split(",").filter(Boolean)
        : [...IG_SCOPES];

    // 4) store encrypted
    stage = "account_storage";
    const account = await upsertConnectedAccount({
      instagramUserId: profile.user_id,
      username: profile.username,
      name: profile.name,
      profilePictureUrl: profile.profile_picture_url,
      accessToken: long.access_token,
      expiresInSeconds: long.expires_in,
      scopes: grantedScopes,
    });

    // 5) subscribe the app to this account's webhook fields
    stage = "webhook_subscription";
    let subscriptionOk = false;
    try {
      const sub = await subscribeAppToAccount({
        accessToken: long.access_token,
        igUserId: profile.user_id,
        fields: WEBHOOK_FIELDS,
      });
      subscriptionOk = Boolean(sub.success);
    } catch (err) {
      log.warn("webhook subscription failed at connect", {
        account_id: account.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    log.info("instagram account connected", {
      account_id: account.id,
      ig_username: profile.username,
      subscription_ok: subscriptionOk,
    });

    return redirectToConnection(appUrl, {
      status: "connected",
      username: profile.username ?? "",
      subscribed: subscriptionOk ? "1" : "0",
    });
  } catch (err) {
    log.error("oauth callback failed", {
      stage,
      error: err instanceof Error ? err.message : String(err),
      ...(err instanceof IgApiError ? err.toLogFields() : {}),
    });
    const accountNotAuthorized =
      stage === "long_lived_token" &&
      err instanceof IgApiError &&
      err.code === 100;
    return redirectToConnection(appUrl, {
      status: accountNotAuthorized ? "account_not_authorized" : "error",
    });
  }
}
