import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export type InsertEventInput = {
  eventType: string;
  providerEventId?: string;
  deduplicationHash: string;
  instagramAccountId?: string | null;
  contactId?: string | null;
  commentId?: string | null;
  mediaId?: string | null;
  payload?: Json;
  processingStatus?: "received" | "processed" | "error" | "unsupported";
};

/**
 * Insert an event, deduplicated by deduplication_hash.
 * Returns { id, isNew }. When the hash already exists, isNew=false (duplicate).
 */
export async function insertEventDeduped(
  input: InsertEventInput,
): Promise<{ id: string | null; isNew: boolean }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("events")
    .insert({
      event_type: input.eventType,
      provider_event_id: input.providerEventId ?? null,
      deduplication_hash: input.deduplicationHash,
      instagram_account_id: input.instagramAccountId ?? null,
      contact_id: input.contactId ?? null,
      comment_id: input.commentId ?? null,
      media_id: input.mediaId ?? null,
      payload: input.payload ?? null,
      processing_status: input.processingStatus ?? "received",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Unique violation on deduplication_hash => duplicate event.
    if (error.code === "23505") return { id: null, isNew: false };
    throw error;
  }
  return { id: data?.id ?? null, isNew: true };
}

export async function markEventProcessed(id: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function markEventError(id: string, message: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("events")
    .update({
      processing_status: "error",
      processing_error: message.slice(0, 2000),
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function setEventContact(
  id: string,
  contactId: string,
): Promise<void> {
  const db = createServiceClient();
  await db.from("events").update({ contact_id: contactId }).eq("id", id);
}
