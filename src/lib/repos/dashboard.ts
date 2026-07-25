import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type QueueJobRow = Tables<"queue">;
export type EventRow = Tables<"events">;

export type DashboardStats = {
  accounts: number;
  connectedAccounts: number;
  activeAutomations: number;
  pendingJobs: number;
  sendingJobs: number;
  failedJobs: number;
  skippedJobs: number;
  eventsLast24h: number;
  lastWebhookAt: string | null;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = createServiceClient();

  const [
    accounts,
    connected,
    activeAutos,
    pending,
    sending,
    failed,
    skipped,
    lastWebhook,
  ] = await Promise.all([
    db.from("instagram_accounts").select("id", { count: "exact", head: true }),
    db
      .from("instagram_accounts")
      .select("id", { count: "exact", head: true })
      .eq("connection_status", "connected"),
    db
      .from("automations")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    db.from("queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("queue").select("id", { count: "exact", head: true }).eq("status", "sending"),
    db.from("queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
    db.from("queue").select("id", { count: "exact", head: true }).eq("status", "skipped"),
    db
      .from("instagram_accounts")
      .select("last_webhook_at")
      .order("last_webhook_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const events24h = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .gte("received_at", since);

  return {
    accounts: accounts.count ?? 0,
    connectedAccounts: connected.count ?? 0,
    activeAutomations: activeAutos.count ?? 0,
    pendingJobs: pending.count ?? 0,
    sendingJobs: sending.count ?? 0,
    failedJobs: failed.count ?? 0,
    skippedJobs: skipped.count ?? 0,
    eventsLast24h: events24h.count ?? 0,
    lastWebhookAt: lastWebhook.data?.last_webhook_at ?? null,
  };
}

export async function listRecentEvents(limit = 50): Promise<EventRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("events")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listRecentJobs(limit = 50): Promise<QueueJobRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Safe reprocess: move a failed/skipped job back to pending for immediate retry. */
export async function reprocessJob(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("queue")
    .update({
      status: "pending",
      next_attempt_at: null,
      claimed_at: null,
      claimed_by: null,
      attempts: 0,
      skip_reason: null,
      last_error: null,
      scheduled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["failed", "skipped"]);
  if (error) throw error;
}
