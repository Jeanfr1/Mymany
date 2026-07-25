import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database.types";

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

export async function listAllAutomations(): Promise<Automation[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAutomation(
  input: TablesInsert<"automations">,
): Promise<Automation> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("automations")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateAutomation(
  id: string,
  patch: TablesUpdate<"automations">,
): Promise<Automation> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("automations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setAutomationActive(
  id: string,
  active: boolean,
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("automations")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAutomation(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("automations").delete().eq("id", id);
  if (error) throw error;
}
