import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables, Json } from "@/types/database.types";

export type QueueJob = Tables<"queue">;

export type JobType =
  | "private_reply"
  | "public_reply"
  | "welcome_message"
  | "link_message"
  | "reminder"
  | "followup";

export type EnqueueInput = {
  jobType: JobType;
  deduplicationKey: string;
  instagramAccountId: string;
  automationId?: string | null;
  contactId?: string | null;
  eventId?: string | null;
  payload?: Json;
  scheduledAt?: Date;
  maxAttempts?: number;
};

/**
 * Enqueue a job, deduplicated by deduplication_key (unique).
 * Returns { id, isNew:false } if a job with that key already exists.
 */
export async function enqueue(
  input: EnqueueInput,
): Promise<{ id: string | null; isNew: boolean }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("queue")
    .insert({
      job_type: input.jobType,
      deduplication_key: input.deduplicationKey,
      instagram_account_id: input.instagramAccountId,
      automation_id: input.automationId ?? null,
      contact_id: input.contactId ?? null,
      event_id: input.eventId ?? null,
      payload: input.payload ?? {},
      scheduled_at: (input.scheduledAt ?? new Date()).toISOString(),
      max_attempts: input.maxAttempts ?? 5,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { id: null, isNew: false }; // dup key
    throw error;
  }
  return { id: data?.id ?? null, isNew: true };
}

/** Atomically claim a batch of due jobs (RPC: FOR UPDATE SKIP LOCKED). */
export async function claimJobs(params: {
  batchSize: number;
  workerId: string;
  stuckAfterSeconds?: number;
}): Promise<QueueJob[]> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("claim_queue_jobs", {
    p_batch_size: params.batchSize,
    p_worker_id: params.workerId,
    p_stuck_after_seconds: params.stuckAfterSeconds ?? 300,
  });
  if (error) throw error;
  return (data as QueueJob[]) ?? [];
}

export async function markJobSent(
  id: string,
  providerMessageId?: string | null,
): Promise<void> {
  const db = createServiceClient();
  await db
    .from("queue")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId ?? null,
    })
    .eq("id", id);
}

export async function markJobSkipped(id: string, reason: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("queue")
    .update({ status: "skipped", skip_reason: reason })
    .eq("id", id);
}

export async function markJobFailed(id: string, error: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("queue")
    .update({ status: "failed", last_error: error.slice(0, 2000) })
    .eq("id", id);
}

/** Put a job back to pending with a future next_attempt_at (retry). */
export async function rescheduleJob(params: {
  id: string;
  nextAttemptInMs: number;
  error: string;
}): Promise<void> {
  const db = createServiceClient();
  await db
    .from("queue")
    .update({
      status: "pending",
      next_attempt_at: new Date(Date.now() + params.nextAttemptInMs).toISOString(),
      last_error: params.error.slice(0, 2000),
      claimed_at: null,
      claimed_by: null,
    })
    .eq("id", params.id);
}

/** Cancel pending reminder jobs for a contact+automation (e.g. after a click). */
export async function cancelPendingReminders(params: {
  contactId: string;
  automationId: string;
}): Promise<number> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("queue")
    .update({ status: "cancelled", skip_reason: "cancelled_after_click" })
    .eq("contact_id", params.contactId)
    .eq("automation_id", params.automationId)
    .eq("job_type", "reminder")
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
