import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Contact = Tables<"contacts">;

export const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h standard window

export async function getContactById(id: string): Promise<Contact | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getContactByScopedId(
  instagramAccountId: string,
  instagramScopedId: string,
): Promise<Contact | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("contacts")
    .select("*")
    .eq("instagram_account_id", instagramAccountId)
    .eq("instagram_scoped_id", instagramScopedId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Ensure a contact row exists for this (account, scoped id). */
export async function ensureContact(params: {
  instagramAccountId: string;
  instagramScopedId: string;
  username?: string;
}): Promise<Contact> {
  const db = createServiceClient();
  // first_contact_at is set once by the DB default on insert; not touched here.
  const { data, error } = await db
    .from("contacts")
    .upsert(
      {
        instagram_account_id: params.instagramAccountId,
        instagram_scoped_id: params.instagramScopedId,
        // Only set username when known, so we never clobber a stored value with null.
        ...(params.username ? { username: params.username } : {}),
      },
      { onConflict: "instagram_account_id,instagram_scoped_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Record an inbound interaction: sets last_inbound_message_at and (re)opens the
 * 24h messaging window. This is the ONLY place the window is opened/renewed
 * (DECISIONS §5 — a private reply never opens the window).
 */
export async function recordInboundInteraction(params: {
  instagramAccountId: string;
  instagramScopedId: string;
  username?: string;
  at?: Date;
}): Promise<Contact> {
  const db = createServiceClient();
  const now = params.at ?? new Date();
  const windowExpires = new Date(now.getTime() + MESSAGING_WINDOW_MS);

  // first_contact_at is set once by the DB default on insert; not touched here,
  // so re-recording inbound interactions preserves the original first-contact time.
  const { data, error } = await db
    .from("contacts")
    .upsert(
      {
        instagram_account_id: params.instagramAccountId,
        instagram_scoped_id: params.instagramScopedId,
        ...(params.username ? { username: params.username } : {}),
        last_inbound_message_at: now.toISOString(),
        messaging_window_expires_at: windowExpires.toISOString(),
      },
      { onConflict: "instagram_account_id,instagram_scoped_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setLastAutomation(
  contactId: string,
  automationId: string,
): Promise<void> {
  const db = createServiceClient();
  await db
    .from("contacts")
    .update({ last_automation_id: automationId })
    .eq("id", contactId);
}

/** True if the contact's messaging window is currently open. */
export function isWindowOpen(
  contact: Pick<Contact, "messaging_window_expires_at">,
  now: Date = new Date(),
): boolean {
  if (!contact.messaging_window_expires_at) return false;
  return new Date(contact.messaging_window_expires_at).getTime() > now.getTime();
}
