import { NextResponse, after, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import {
  verifyHandshake,
  verifyWebhookSignature,
} from "@/lib/webhook/signature";
import { parseWebhookPayload } from "@/lib/webhook/parse";
import { processNormalizedEvents } from "@/lib/engine/process";
import { maybeDrainQueue } from "@/lib/worker/drain";
import { log } from "@/lib/log";

export const runtime = "nodejs";
// Never cache or statically optimize the webhook.
export const dynamic = "force-dynamic";

/** GET: subscription handshake (brief §8.1). */
export function GET(request: NextRequest) {
  const env = getServerEnv();
  const url = new URL(request.url);
  const challenge = verifyHandshake({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
    verifyToken: env.INSTAGRAM_VERIFY_TOKEN,
  });
  if (challenge === null) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

/** POST: signed event delivery (brief §8.2/§8.3). */
export async function POST(request: NextRequest) {
  const env = getServerEnv();

  // 1) Read the RAW body BEFORE any parsing (required for HMAC).
  const rawBody = await request.text();

  // 2) Validate the signature (constant-time). Reject if missing/invalid.
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, env.INSTAGRAM_APP_SECRET)) {
    log.warn("webhook rejected: invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // 3) Parse JSON only after signature validation.
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // 4) Normalize + persist + create jobs. We always return 200 afterward so Meta
  //    does not retry-storm; persisted events can be reprocessed from the dashboard.
  try {
    const events = parseWebhookPayload(payload);
    const summary = await processNormalizedEvents(events);
    log.info("webhook processed", summary);

    // 5) Best-effort opportunistic drain AFTER responding, so the 200 is fast.
    //    Cron remains the durable delivery mechanism (DECISIONS §12).
    if (summary.enqueued > 0) {
      after(async () => {
        await maybeDrainQueue();
      });
    }
  } catch (err) {
    log.error("webhook processing error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ received: true });
}
