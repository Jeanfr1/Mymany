import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight health check (no secrets, no sensitive data). */
export async function GET() {
  let dbOk = true;
  try {
    const db = createServiceClient();
    const { error } = await db
      .from("instagram_accounts")
      .select("id", { head: true, count: "exact" });
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    { ok: dbOk, db: dbOk ? "up" : "down", ts: new Date().toISOString() },
    { status: dbOk ? 200 : 503 },
  );
}
