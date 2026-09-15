import "server-only";
import { getServerEnv } from "@/lib/env";
import { decryptToken } from "@/lib/crypto/token";
import { getAccountById } from "@/lib/repos/accounts";
import { getAutomation, type Automation } from "@/lib/repos/automations";
import {
  getContactById,
  isWindowOpen,
  type Contact,
} from "@/lib/repos/contacts";
import { createTrackingLink, hasClicked } from "@/lib/repos/tracking";
import {
  sendMessage,
  sendButtons,
  sendPrivateReply,
  publicReplyToComment,
  type UrlButton,
} from "@/lib/instagram/client";
import { getLinkFollowupButtons } from "@/lib/repos/followups";
import type { QueueJob } from "@/lib/repos/queue";
import { isSafeHttpsUrl, trimTrailingSlash } from "@/lib/url";

export type JobOutcome =
  | { type: "sent"; providerMessageId?: string | null }
  | { type: "skipped"; reason: string };

type JsonObj = Record<string, unknown>;
function payloadObj(job: QueueJob): JsonObj {
  return (job.payload as JsonObj) ?? {};
}
function pStr(p: JsonObj, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * Execute a single claimed job. Returns "sent" or "skipped".
 * Send failures throw (IgApiError or generic) so the drainer can apply retry/backoff.
 * Every job re-checks live state (automation active, messaging window, prior click)
 * at send time — the queue is never trusted blindly (brief §11/§12).
 */
export async function executeJob(job: QueueJob): Promise<JobOutcome> {
  if (!job.instagram_account_id) return { type: "skipped", reason: "no_account" };

  const account = await getAccountById(job.instagram_account_id);
  if (!account || !account.access_token_enc) {
    return { type: "skipped", reason: "account_disconnected" };
  }
  if (account.connection_status !== "connected") {
    return { type: "skipped", reason: `account_${account.connection_status}` };
  }
  const token = decryptToken(account.access_token_enc);
  const p = payloadObj(job);

  switch (job.job_type) {
    case "private_reply": {
      const automation = await requireActiveAutomation(job.automation_id);
      if (!automation.ok) return automation.skip;
      const commentId = pStr(p, "comment_id");
      const text = pStr(p, "text") ?? automation.value.welcome_message ?? "";
      if (!commentId || !text) return { type: "skipped", reason: "missing_fields" };

      const qrTitle = pStr(p, "quick_reply_title");
      const qrPayload = pStr(p, "quick_reply_payload");
      const quickReplies =
        qrTitle && qrPayload ? [{ title: qrTitle, payload: qrPayload }] : undefined;

      const res = await sendPrivateReply({
        accessToken: token,
        igUserId: account.instagram_user_id,
        commentId,
        text,
        quickReplies,
      });
      return { type: "sent", providerMessageId: res.message_id };
    }

    case "public_reply": {
      const automation = await requireActiveAutomation(job.automation_id);
      if (!automation.ok) return automation.skip;
      const commentId = pStr(p, "comment_id");
      const variations = automation.value.public_reply_variations;
      if (!commentId || variations.length === 0) {
        return { type: "skipped", reason: "no_variations" };
      }
      const text = variations[Math.floor(Math.random() * variations.length)];
      const res = await publicReplyToComment({
        accessToken: token,
        commentId,
        text,
      });
      return { type: "sent", providerMessageId: res.id };
    }

    case "welcome_message": {
      const automation = await requireActiveAutomation(job.automation_id);
      if (!automation.ok) return automation.skip;
      const window = await requireOpenWindow(job.contact_id);
      if (!window.ok) return window.skip;
      const recipientId =
        pStr(p, "recipient_id") ?? window.value.instagram_scoped_id;
      const text = pStr(p, "text") ?? automation.value.welcome_message ?? "";
      if (!text) return { type: "skipped", reason: "empty_welcome" };
      const qrTitle = pStr(p, "quick_reply_title");
      const qrPayload = pStr(p, "quick_reply_payload");
      const quickReplies =
        qrTitle && qrPayload ? [{ title: qrTitle, payload: qrPayload }] : undefined;
      const res = await sendMessage({
        accessToken: token,
        igUserId: account.instagram_user_id,
        recipientId,
        text,
        quickReplies,
      });
      return { type: "sent", providerMessageId: res.message_id };
    }

    case "link_message": {
      const automation = await requireActiveAutomation(job.automation_id);
      if (!automation.ok) return automation.skip;
      const a = automation.value;
      const window = await requireOpenWindow(job.contact_id);
      if (!window.ok) return window.skip;
      const recipientId =
        pStr(p, "recipient_id") ?? window.value.instagram_scoped_id;

      if (!a.link_url || !isSafeHttpsUrl(a.link_url)) {
        return { type: "skipped", reason: "invalid_link_url" };
      }
      let url = a.link_url;
      if (a.click_tracking_enabled) {
        const code = await createTrackingLink({
          automationId: a.id,
          contactId: job.contact_id,
          queueId: job.id,
          destinationUrl: a.link_url,
        });
        url = `${trimTrailingSlash(getServerEnv().NEXT_PUBLIC_APP_URL)}/r/${code}`;
      }

      // Prefer native tappable buttons (button template): the primary link plus
      // any active link followups. Fall back to a plain-text link if the
      // platform rejects the template, so the message always delivers.
      const buttons: UrlButton[] = [
        { title: a.link_button_label || "Open", url },
      ];
      for (const b of await getLinkFollowupButtons(a.id)) buttons.push(b);
      const text = a.link_message || "Here you go 👇";
      try {
        const res = await sendButtons({
          accessToken: token,
          igUserId: account.instagram_user_id,
          recipientId,
          text,
          buttons,
        });
        return { type: "sent", providerMessageId: res.message_id };
      } catch {
        const label = a.link_button_label ? `${a.link_button_label}: ` : "";
        const body = a.link_message
          ? `${a.link_message}\n${label}${url}`
          : `${label}${url}`;
        const res = await sendMessage({
          accessToken: token,
          igUserId: account.instagram_user_id,
          recipientId,
          text: body,
        });
        return { type: "sent", providerMessageId: res.message_id };
      }
    }

    case "reminder": {
      const automation = await requireActiveAutomation(job.automation_id);
      if (!automation.ok) return automation.skip;
      const a = automation.value;
      const window = await requireOpenWindow(job.contact_id);
      if (!window.ok) return window.skip;

      if (a.cancel_reminder_after_click && job.contact_id) {
        const clicked = await hasClicked({
          contactId: job.contact_id,
          automationId: a.id,
        });
        if (clicked) return { type: "skipped", reason: "clicked_already" };
      }
      const text = a.reminder_text;
      if (!text) return { type: "skipped", reason: "empty_reminder" };
      const recipientId =
        pStr(p, "recipient_id") ?? window.value.instagram_scoped_id;
      const res = await sendMessage({
        accessToken: token,
        igUserId: account.instagram_user_id,
        recipientId,
        text,
      });
      return { type: "sent", providerMessageId: res.message_id };
    }

    default:
      return { type: "skipped", reason: `unknown_job_type_${job.job_type}` };
  }
}

// --- small guards ---
type Ok<T> = { ok: true; value: T };
type Skip = { ok: false; skip: { type: "skipped"; reason: string } };

async function requireActiveAutomation(
  automationId: string | null,
): Promise<Ok<Automation> | Skip> {
  if (!automationId)
    return { ok: false, skip: { type: "skipped", reason: "no_automation" } };
  const a = await getAutomation(automationId);
  if (!a)
    return { ok: false, skip: { type: "skipped", reason: "automation_deleted" } };
  if (!a.active)
    return { ok: false, skip: { type: "skipped", reason: "automation_inactive" } };
  return { ok: true, value: a };
}

async function requireOpenWindow(
  contactId: string | null,
): Promise<Ok<Contact> | Skip> {
  if (!contactId)
    return { ok: false, skip: { type: "skipped", reason: "no_contact" } };
  const contact = await getContactById(contactId);
  if (!contact)
    return { ok: false, skip: { type: "skipped", reason: "contact_missing" } };
  if (!isWindowOpen(contact))
    return { ok: false, skip: { type: "skipped", reason: "window_closed" } };
  return { ok: true, value: contact };
}
