import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Next.js 16 Proxy (formerly middleware). Two jobs:
 *   1) Refresh the Supabase Auth session cookie on navigation.
 *   2) Coarse guard: bounce unauthenticated users away from /dashboard.
 *
 * This is a FIRST layer only. The authoritative admin allowlist check and all
 * data access happen server-side (see src/lib/auth.ts requireAdmin) — proxy.ts
 * is never the sole security boundary (brief §6).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path.startsWith("/dashboard") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run on dashboard routes only; exclude static assets and API routes
  // (API routes enforce their own auth / secrets).
  matcher: ["/dashboard/:path*"],
};
