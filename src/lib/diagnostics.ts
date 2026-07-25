import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { listAccounts, getAccountToken } from "@/lib/repos/accounts";
import { getProfile, getSubscribedApps } from "@/lib/instagram/client";
import { WEBHOOK_FIELDS } from "@/lib/instagram/config";

/** Which required env vars are PRESENT (booleans only — never the values). */
export function envPresence(): { name: string; present: boolean }[] {
  const names = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "INSTAGRAM_APP_ID",
    "INSTAGRAM_APP_SECRET",
    "INSTAGRAM_VERIFY_TOKEN",
    "TOKEN_ENCRYPTION_KEY",
    "INTERNAL_CRON_SECRET",
    "ADMIN_EMAILS",
  ];
  return names.map((name) => ({ name, present: Boolean(process.env[name]) }));
}

export type AccountDiagnostic = {
  id: string;
  username: string | null;
  status: string;
  tokenValid: boolean;
  profileError?: string;
  subscribedFields: string[];
  webhookSubscribed: boolean;
  subscriptionError?: string;
};

/**
 * Live, READ-ONLY diagnostics. Verifies token validity (getProfile) and
 * webhook subscription (getSubscribedApps). Never sends a message to any user
 * (brief §20 safe configuration test).
 */
export async function runLiveDiagnostics(): Promise<{
  dbOk: boolean;
  accounts: AccountDiagnostic[];
}> {
  // DB connectivity
  let dbOk = true;
  try {
    const db = createServiceClient();
    const { error } = await db
      .from("instagram_accounts")
      .select("id", { head: true, count: "exact" });
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const accounts = await listAccounts();
  const results: AccountDiagnostic[] = [];

  for (const a of accounts) {
    const diag: AccountDiagnostic = {
      id: a.id,
      username: a.instagram_username,
      status: a.connection_status,
      tokenValid: false,
      subscribedFields: [],
      webhookSubscribed: false,
    };

    if (a.access_token_enc && a.connection_status === "connected") {
      const token = await getAccountToken(a.id);
      if (token) {
        try {
          await getProfile(token);
          diag.tokenValid = true;
        } catch (err) {
          diag.profileError =
            err instanceof Error ? err.message : "profile check failed";
        }
        try {
          const subs = await getSubscribedApps({
            accessToken: token,
            igUserId: a.instagram_user_id,
          });
          const fields = new Set<string>();
          for (const entry of subs.data ?? []) {
            const f = (entry as { subscribed_fields?: unknown })
              .subscribed_fields;
            if (Array.isArray(f)) {
              for (const item of f) {
                if (typeof item === "string") fields.add(item);
                else if (item && typeof item === "object" && "name" in item) {
                  const n = (item as { name?: unknown }).name;
                  if (typeof n === "string") fields.add(n);
                }
              }
            }
          }
          diag.subscribedFields = [...fields];
          diag.webhookSubscribed = WEBHOOK_FIELDS.every((wf) =>
            fields.has(wf),
          );
        } catch (err) {
          diag.subscriptionError =
            err instanceof Error ? err.message : "subscription check failed";
        }
      }
    }
    results.push(diag);
  }

  return { dbOk, accounts: results };
}
