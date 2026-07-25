import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Service-role client — bypasses RLS. Server-only. NEVER import into client code.
 * All operational data access goes through this (DECISIONS §7.9).
 */
export function createServiceClient() {
  const env = getServerEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "manyjean-server" } },
    },
  );
}

/**
 * Cookie-bound auth client — used ONLY to read/refresh the admin's Supabase Auth
 * session. Uses the public anon/publishable key; RLS denies it all table access.
 */
export async function createServerAuthClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — safe to ignore; proxy.ts
            // refreshes the session cookie on navigation.
          }
        },
      },
    },
  );
}
