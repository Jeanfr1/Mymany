import "server-only";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type TrackingLink = Tables<"tracking_links">;

/** Create an unpredictable tracking code mapping to a destination URL. */
export async function createTrackingLink(params: {
  automationId?: string | null;
  contactId?: string | null;
  queueId?: string | null;
  destinationUrl: string;
}): Promise<string> {
  const db = createServiceClient();
  const code = randomBytes(12).toString("base64url"); // 16 chars, unpredictable
  const { error } = await db.from("tracking_links").insert({
    code,
    automation_id: params.automationId ?? null,
    contact_id: params.contactId ?? null,
    queue_id: params.queueId ?? null,
    destination_url: params.destinationUrl,
  });
  if (error) throw error;
  return code;
}

export async function getTrackingLink(
  code: string,
): Promise<TrackingLink | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("tracking_links")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function recordClick(params: {
  link: TrackingLink;
  userAgent?: string | null;
  ipHash?: string | null;
}): Promise<void> {
  const db = createServiceClient();
  await db.from("click_events").insert({
    tracking_code: params.link.code,
    automation_id: params.link.automation_id,
    contact_id: params.link.contact_id,
    queue_id: params.link.queue_id,
    destination_url: params.link.destination_url,
    user_agent: params.userAgent ?? null,
    ip_hash: params.ipHash ?? null,
  });
}

/** Has this contact already clicked a link for this automation? */
export async function hasClicked(params: {
  contactId: string;
  automationId: string;
}): Promise<boolean> {
  const db = createServiceClient();
  const { count, error } = await db
    .from("click_events")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", params.contactId)
    .eq("automation_id", params.automationId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
