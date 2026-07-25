import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedInternalRequest } from "@/lib/internal-auth";
import { refreshExpiringTokens } from "@/lib/instagram/tokens";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await refreshExpiringTokens();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    log.error("token refresh endpoint failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
