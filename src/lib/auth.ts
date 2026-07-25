import "server-only";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/env";

export type AdminUser = {
  id: string;
  email: string;
};

/**
 * Returns the authenticated admin user, or null.
 * An account is an admin ONLY if it has a valid Supabase Auth session AND its
 * email is in the ADMIN_EMAILS allowlist (single-admin; DECISIONS §0 / brief §6).
 *
 * Uses getUser() (not getSession()) so the token is verified against the auth
 * server rather than trusted from the cookie.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;

  const email = user.email.toLowerCase();
  if (!getAdminEmails().includes(email)) return null;

  return { id: user.id, email };
}

/**
 * Guard for Server Components / Server Actions / Route Handlers.
 * Redirects to /login when the caller is not an allowlisted admin.
 * This is enforced server-side and is NOT dependent on proxy.ts (brief §6).
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");
  return admin;
}

/** Throwing variant for API route handlers that should 401 rather than redirect. */
export async function requireAdminApi(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    throw new UnauthorizedError();
  }
  return admin;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
