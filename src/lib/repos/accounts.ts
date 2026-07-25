import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/crypto/token";
import type { Tables } from "@/types/database.types";

export type Account = Tables<"instagram_accounts">;

export async function listAccounts(): Promise<Account[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("instagram_accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("instagram_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAccountByIgUserId(
  igUserId: string,
): Promise<Account | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("instagram_accounts")
    .select("*")
    .eq("instagram_user_id", igUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Returns the decrypted access token for an account, or null if not connected. */
export async function getAccountToken(id: string): Promise<string | null> {
  const account = await getAccountById(id);
  if (!account?.access_token_enc) return null;
  return decryptToken(account.access_token_enc);
}

/** Upsert a freshly connected account, storing the token ENCRYPTED. */
export async function upsertConnectedAccount(params: {
  instagramUserId: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  accessToken: string;
  expiresInSeconds: number;
  scopes: string[];
}): Promise<Account> {
  const db = createServiceClient();
  const expiresAt = new Date(
    Date.now() + params.expiresInSeconds * 1000,
  ).toISOString();

  const { data, error } = await db
    .from("instagram_accounts")
    .upsert(
      {
        instagram_user_id: params.instagramUserId,
        instagram_username: params.username ?? null,
        instagram_name: params.name ?? null,
        profile_picture_url: params.profilePictureUrl ?? null,
        access_token_enc: encryptToken(params.accessToken),
        token_expires_at: expiresAt,
        scopes: params.scopes,
        connection_status: "connected",
        last_token_refresh_at: new Date().toISOString(),
      },
      { onConflict: "instagram_user_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Store a refreshed token + new expiry. */
export async function updateAccountToken(params: {
  id: string;
  accessToken: string;
  expiresInSeconds: number;
}): Promise<void> {
  const db = createServiceClient();
  const expiresAt = new Date(
    Date.now() + params.expiresInSeconds * 1000,
  ).toISOString();
  const { error } = await db
    .from("instagram_accounts")
    .update({
      access_token_enc: encryptToken(params.accessToken),
      token_expires_at: expiresAt,
      connection_status: "connected",
      last_token_refresh_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error) throw error;
}

export async function setConnectionStatus(
  id: string,
  status: "connected" | "disconnected" | "expired" | "error",
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("instagram_accounts")
    .update({ connection_status: status })
    .eq("id", id);
  if (error) throw error;
}

/** Disconnect: clear the stored token and mark disconnected. */
export async function disconnectAccount(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("instagram_accounts")
    .update({ access_token_enc: null, connection_status: "disconnected" })
    .eq("id", id);
  if (error) throw error;
}

export async function touchWebhookReceived(igUserId: string): Promise<void> {
  const db = createServiceClient();
  await db
    .from("instagram_accounts")
    .update({ last_webhook_at: new Date().toISOString() })
    .eq("instagram_user_id", igUserId);
}
