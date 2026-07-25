import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedInternalRequest } from "@/lib/internal-auth";
import { drainQueue } from "@/lib/worker/drain";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Durable queue drainer. Invoked by Supabase Cron (every minute). */
export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await drainQueue();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    log.error("queue drain endpoint failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
