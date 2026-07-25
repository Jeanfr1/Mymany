import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import {
  buildAuthorizeUrl,
  createOAuthState,
  oauthRedirectUri,
} from "@/lib/instagram/oauth";

export const runtime = "nodejs";

/** Admin-only: begin the Instagram OAuth flow. */
export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const env = getServerEnv();
  const reconnectAccountId =
    new URL(request.url).searchParams.get("reconnect") ?? undefined;

  const state = await createOAuthState(
    reconnectAccountId ? { reconnect_account_id: reconnectAccountId } : {},
  );

  const authorizeUrl = buildAuthorizeUrl({
    appId: env.INSTAGRAM_APP_ID,
    redirectUri: oauthRedirectUri(env.NEXT_PUBLIC_APP_URL),
    state,
  });

  return NextResponse.redirect(authorizeUrl);
}
