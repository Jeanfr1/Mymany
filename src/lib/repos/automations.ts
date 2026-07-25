import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Automation = Tables<"automations">;

export async function getAutomation(id: string): Promise<Automation | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Active automations for an account, optionally filtered by trigger type. */
export async function listActiveAutomations(params: {
  instagramAccountId: string;
  trigger?: "comment" | "story_reply" | "direct_message";
}): Promise<Automation[]> {
  const db = createServiceClient();
  let q = db
    .from("automations")
    .select("*")
    .eq("instagram_account_id", params.instagramAccountId)
    .eq("active", true);

  if (params.trigger === "comment") q = q.eq("trigger_comment", true);
  if (params.trigger === "story_reply") q = q.eq("trigger_story_reply", true);
  if (params.trigger === "direct_message")
    q = q.eq("trigger_direct_message", true);

  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAutomationsForAccount(
  instagramAccountId: string,
): Promise<Automation[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("automations")
    .select("*")
    .eq("instagram_account_id", instagramAccountId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
