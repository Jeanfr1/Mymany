import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto/token";
import { refreshLongLivedToken } from "./client";
import { updateAccountToken, setConnectionStatus } from "@/lib/repos/accounts";
import { TOKEN_REFRESH_THRESHOLD_DAYS } from "./config";
import { IgApiError } from "./errors";
import { log } from "@/lib/log";

export type RefreshSummary = {
  refreshed: number;
  failed: number;
  skipped: number;
};

/**
 * Refresh long-lived tokens that are within the refresh threshold of expiry.
 * Called by cron (daily). Never blocks the main flow; logs per-account outcome.
 */
export async function refreshExpiringTokens(): Promise<RefreshSummary> {
  const db = createServiceClient();
  const thresholdIso = new Date(
    Date.now() + TOKEN_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: accounts, error } = await db
    .from("instagram_accounts")
    .select("id, access_token_enc, token_expires_at, connection_status")
    .eq("connection_status", "connected")
    .not("access_token_enc", "is", null)
    .lte("token_expires_at", thresholdIso);

  if (error) throw error;

  const summary: RefreshSummary = { refreshed: 0, failed: 0, skipped: 0 };

  for (const acc of accounts ?? []) {
    if (!acc.access_token_enc) {
      summary.skipped++;
      continue;
    }
    try {
      const current = decryptToken(acc.access_token_enc);
      const refreshed = await refreshLongLivedToken(current);
      await updateAccountToken({
        id: acc.id,
        accessToken: refreshed.access_token,
        expiresInSeconds: refreshed.expires_in,
      });
      summary.refreshed++;
      log.info("token refreshed", { account_id: acc.id });
    } catch (err) {
      summary.failed++;
      if (err instanceof IgApiError && err.isAuthError) {
        await setConnectionStatus(acc.id, "expired");
        log.warn("token refresh: auth error, marked expired", {
          account_id: acc.id,
          ...err.toLogFields(),
        });
      } else {
        log.error("token refresh failed", {
          account_id: acc.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return summary;
}
