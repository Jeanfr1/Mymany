import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { isSafeHttpsUrl } from "@/lib/url";

/**
 * Active link-type followups for an automation, as extra tappable buttons for
 * the link message. Ordered by position. Only rows with a label + safe https
 * button URL are returned.
 */
export async function getLinkFollowupButtons(
  automationId: string,
): Promise<Array<{ title: string; url: string }>> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("followups")
    .select("button_label,button_url,position")
    .eq("automation_id", automationId)
    .eq("active", true)
    .eq("message_type", "link")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter(
      (f): f is { button_label: string; button_url: string; position: number } =>
        typeof f.button_label === "string" &&
        typeof f.button_url === "string" &&
        isSafeHttpsUrl(f.button_url),
    )
    .map((f) => ({ title: f.button_label, url: f.button_url }));
}
