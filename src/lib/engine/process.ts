import "server-only";
import type { Json } from "@/types/database.types";
import {
  isInboundMessage,
  type CommentEvent,
  type MessageEvent,
  type NormalizedEvent,
} from "@/lib/webhook/types";
import { deduplicationHash } from "@/lib/webhook/parse";
import { getAccountByIgUserId, touchWebhookReceived } from "@/lib/repos/accounts";
import type { Account } from "@/lib/repos/accounts";
import {
  insertEventDeduped,
  markEventProcessed,
  markEventError,
  setEventContact,
} from "@/lib/repos/events";
import {
  ensureContact,
  recordInboundInteraction,
  setLastAutomation,
} from "@/lib/repos/contacts";
import type { Contact } from "@/lib/repos/contacts";
import { listActiveAutomations } from "@/lib/repos/automations";
import type { Automation } from "@/lib/repos/automations";
import { enqueue } from "@/lib/repos/queue";
import { matchKeywords, type MatchType } from "@/lib/matching/match";
import { log } from "@/lib/log";

const LINK_DELAY_SECONDS = 3; // small gap so welcome lands before link
const QUICK_REPLY_PREFIX = "auto:"; // payload marker linking a reply to its automation

export type ProcessSummary = {
  received: number;
  duplicates: number;
  processed: number;
  unsupported: number;
  enqueued: number;
  errors: number;
};

export async function processNormalizedEvents(
  events: NormalizedEvent[],
): Promise<ProcessSummary> {
  const summary: ProcessSummary = {
    received: events.length,
    duplicates: 0,
    processed: 0,
    unsupported: 0,
    enqueued: 0,
    errors: 0,
  };

  for (const event of events) {
    try {
      const enq = await processOne(event, summary);
      summary.enqueued += enq;
    } catch (err) {
      summary.errors++;
      log.error("event processing failed", {
        kind: event.kind,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return summary;
}

async function processOne(
  event: NormalizedEvent,
  summary: ProcessSummary,
): Promise<number> {
  const dedupHash = deduplicationHash(event);

  if (event.kind === "unsupported") {
    await insertEventDeduped({
      eventType: "unsupported",
      deduplicationHash: dedupHash,
      processingStatus: "unsupported",
      payload: { reason: event.reason } as Json,
    });
    summary.unsupported++;
    return 0;
  }

  const account = await getAccountByIgUserId(event.igAccountId);
  if (account) await touchWebhookReceived(event.igAccountId);

  const inserted = await insertEventDeduped({
    eventType: event.kind,
    providerEventId: event.providerEventId,
    deduplicationHash: dedupHash,
    instagramAccountId: account?.id ?? null,
    commentId: event.kind === "comment" ? event.commentId : null,
    mediaId: event.kind === "comment" ? (event.mediaId ?? null) : null,
    payload: toJsonPayload(event),
  });

  if (!inserted.isNew) {
    summary.duplicates++;
    return 0; // dedup: replayed webhook, do nothing
  }
  const eventId = inserted.id!;

  if (!account) {
    await markEventProcessed(eventId);
    log.warn("event for unknown/unconnected account", {
      ig_account_id: event.igAccountId,
      kind: event.kind,
    });
    return 0;
  }

  let enqueued = 0;
  try {
    if (event.kind === "comment") {
      enqueued = await handleComment(account, event, eventId);
    } else if (isInboundMessage(event)) {
      enqueued = await handleInboundMessage(account, event, eventId);
    }
    await markEventProcessed(eventId);
    summary.processed++;
  } catch (err) {
    await markEventError(
      eventId,
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
  return enqueued;
}

// ---------------------------------------------------------------------------
// Comment flow (brief §9)
// ---------------------------------------------------------------------------
async function handleComment(
  account: Account,
  event: CommentEvent,
  eventId: string,
): Promise<number> {
  // Ignore comments made by the connected account itself.
  if (event.fromId && event.fromId === account.instagram_user_id) return 0;

  const contact = event.fromId
    ? await ensureContact({
        instagramAccountId: account.id,
        instagramScopedId: event.fromId,
        username: event.fromUsername,
      })
    : null;
  if (contact) await setEventContact(eventId, contact.id);

  const automations = await listActiveAutomations({
    instagramAccountId: account.id,
    trigger: "comment",
  });

  let enqueued = 0;
  for (const a of automations) {
    // Specific-post filter.
    if (a.specific_media_id && a.specific_media_id !== event.mediaId) continue;

    const match = matchKeywords({
      text: event.text,
      keywords: a.keywords,
      matchType: a.match_type as MatchType,
      removeAccents: a.remove_accents,
    });
    if (!match.matched) continue;

    // Private reply — one per (comment, automation). Invites an inbound action.
    const pr = await enqueue({
      jobType: "private_reply",
      deduplicationKey: `private_reply:${a.id}:${event.commentId}`,
      instagramAccountId: account.id,
      automationId: a.id,
      contactId: contact?.id ?? null,
      eventId,
      payload: {
        comment_id: event.commentId,
        text: a.welcome_message ?? "",
        quick_reply_title: a.quick_reply_text ?? null,
        quick_reply_payload: `${QUICK_REPLY_PREFIX}${a.id}`,
      } as Json,
    });
    if (pr.isNew) enqueued++;

    // Optional public reply.
    if (a.public_reply_enabled && a.public_reply_variations.length > 0) {
      const pub = await enqueue({
        jobType: "public_reply",
        deduplicationKey: `public_reply:${a.id}:${event.commentId}`,
        instagramAccountId: account.id,
        automationId: a.id,
        contactId: contact?.id ?? null,
        eventId,
        payload: { comment_id: event.commentId } as Json,
      });
      if (pub.isNew) enqueued++;
    }

    if (contact) await setLastAutomation(contact.id, a.id);
  }
  return enqueued;
}

// ---------------------------------------------------------------------------
// Inbound message flow (DM / story reply / quick reply / postback) — brief §10/§11
// ---------------------------------------------------------------------------
async function handleInboundMessage(
  account: Account,
  event: MessageEvent,
  eventId: string,
): Promise<number> {
  // Ignore echoes of our own outgoing messages.
  if (event.isEcho) return 0;
  if (!event.senderId) return 0;

  // A real inbound interaction opens/renews the 24h messaging window.
  const contact = await recordInboundInteraction({
    instagramAccountId: account.id,
    instagramScopedId: event.senderId,
  });
  await setEventContact(eventId, contact.id);

  // Continuation: a quick-reply/postback carrying our automation marker.
  const payload = event.payload ?? "";
  if (
    (event.kind === "quick_reply" || event.kind === "postback") &&
    payload.startsWith(QUICK_REPLY_PREFIX)
  ) {
    const automationId = payload.slice(QUICK_REPLY_PREFIX.length);
    return continueAutomation(account, contact, automationId, eventId, {
      includeWelcome: false,
    });
  }

  // Otherwise match against DM / story-reply automations by keyword.
  const trigger = event.kind === "story_reply" ? "story_reply" : "direct_message";
  const automations = await listActiveAutomations({
    instagramAccountId: account.id,
    trigger,
  });

  const text = event.text ?? event.payload ?? "";
  let enqueued = 0;
  for (const a of automations) {
    const match = matchKeywords({
      text,
      keywords: a.keywords,
      matchType: a.match_type as MatchType,
      removeAccents: a.remove_accents,
    });
    if (!match.matched) continue;
    enqueued += await enqueueDeliverySequence(account, contact, a, eventId, {
      includeWelcome: true,
    });
    await setLastAutomation(contact.id, a.id);
  }
  return enqueued;
}

async function continueAutomation(
  account: Account,
  contact: Contact,
  automationId: string,
  eventId: string,
  opts: { includeWelcome: boolean },
): Promise<number> {
  const automations = await listActiveAutomations({
    instagramAccountId: account.id,
  });
  const a = automations.find((x) => x.id === automationId);
  if (!a) return 0;
  await setLastAutomation(contact.id, a.id);
  return enqueueDeliverySequence(account, contact, a, eventId, opts);
}

/**
 * Enqueue the permitted post-window delivery sequence: (optional) welcome,
 * the tracked link, and (optional) reminder. All are re-checked against the
 * live messaging window by the worker at send time (brief §11).
 */
async function enqueueDeliverySequence(
  account: Account,
  contact: Contact,
  a: Automation,
  eventId: string,
  opts: { includeWelcome: boolean },
): Promise<number> {
  let enqueued = 0;
  const now = Date.now();

  // Dedup by EVENT (not contact): each genuine new inbound interaction re-triggers
  // the automation (re-engagement works), while replayed webhooks are already
  // filtered upstream by the events-table dedup hash — so this can't double-send.
  if (opts.includeWelcome && a.welcome_message) {
    const w = await enqueue({
      jobType: "welcome_message",
      deduplicationKey: `welcome:${a.id}:${eventId}`,
      instagramAccountId: account.id,
      automationId: a.id,
      contactId: contact.id,
      eventId,
      payload: {
        recipient_id: contact.instagram_scoped_id,
        text: a.welcome_message,
      } as Json,
    });
    if (w.isNew) enqueued++;
  }

  if (a.link_url && a.link_message) {
    const link = await enqueue({
      jobType: "link_message",
      deduplicationKey: `link:${a.id}:${eventId}`,
      instagramAccountId: account.id,
      automationId: a.id,
      contactId: contact.id,
      eventId,
      scheduledAt: new Date(now + LINK_DELAY_SECONDS * 1000),
      payload: { recipient_id: contact.instagram_scoped_id } as Json,
    });
    if (link.isNew) enqueued++;
  }

  if (a.reminder_enabled && a.reminder_text) {
    const rem = await enqueue({
      jobType: "reminder",
      deduplicationKey: `reminder:${a.id}:${eventId}`,
      instagramAccountId: account.id,
      automationId: a.id,
      contactId: contact.id,
      eventId,
      scheduledAt: new Date(now + a.reminder_delay_seconds * 1000),
      payload: { recipient_id: contact.instagram_scoped_id } as Json,
    });
    if (rem.isNew) enqueued++;
  }

  return enqueued;
}

function toJsonPayload(event: NormalizedEvent): Json {
  // Store a compact, sanitized snapshot for diagnostics (no tokens involved).
  return JSON.parse(JSON.stringify(event)) as Json;
}
