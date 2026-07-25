"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Browser client — used ONLY by the login page for Supabase Auth (magic link).
 * Uses the public anon/publishable key. RLS denies it all table access, so no
 * application data is ever reachable from the browser.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
