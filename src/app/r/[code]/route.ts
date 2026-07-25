import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { getTrackingLink, recordClick } from "@/lib/repos/tracking";
import { getAutomation } from "@/lib/repos/automations";
import { cancelPendingReminders } from "@/lib/repos/queue";
import { isSafeHttpsUrl } from "@/lib/url";
import { getServerEnv } from "@/lib/env";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trackable redirect: /r/<code> (brief §11).
 *  - validates an unpredictable, pre-registered code
 *  - records the click (hashed IP, never raw — brief §7.7)
 *  - cancels the pending reminder when configured
 *  - redirects only to a pre-registered https:// URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const link = await getTrackingLink(code);

  // Reject unknown codes or unsafe destinations (defense against tampering).
  if (!link || !isSafeHttpsUrl(link.destination_url)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Record the click and handle reminder cancellation — best-effort, never
  // blocks the redirect.
  try {
    const userAgent = request.headers.get("user-agent");
    const fwd = request.headers.get("x-forwarded-for") ?? "";
    const ip = fwd.split(",")[0]?.trim();
    const ipHash = ip
      ? createHash("sha256")
          .update(getServerEnv().INTERNAL_CRON_SECRET + ip)
          .digest("hex")
          .slice(0, 32)
      : null;

    await recordClick({ link, userAgent, ipHash });

    if (link.automation_id && link.contact_id) {
      const automation = await getAutomation(link.automation_id);
      if (automation?.cancel_reminder_after_click) {
        const cancelled = await cancelPendingReminders({
          contactId: link.contact_id,
          automationId: link.automation_id,
        });
        if (cancelled > 0) {
          log.info("reminder cancelled after click", {
            automation_id: link.automation_id,
            cancelled,
          });
        }
      }
    }
  } catch (err) {
    log.warn("click recording failed (redirect still served)", {
      code,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.redirect(link.destination_url, 302);
}
