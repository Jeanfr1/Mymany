import { createHash } from "node:crypto";
import type { NormalizedEvent } from "./types";

// --- tolerant accessors (no `any`) ---
function obj(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}
function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}
function arr(v: unknown): unknown[] | undefined {
  return Array.isArray(v) ? v : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

/**
 * Parse a raw Instagram webhook payload into normalized events.
 * Never throws on malformed input; unknown shapes become `unsupported` events.
 */
export function parseWebhookPayload(payload: unknown): NormalizedEvent[] {
  const root = obj(payload);
  const entries = arr(root?.entry);
  if (!entries) {
    return [{ kind: "unsupported", reason: "missing entry array" }];
  }

  const events: NormalizedEvent[] = [];
  for (const rawEntry of entries) {
    const entry = obj(rawEntry);
    const igAccountId = str(entry?.id) ?? "";
    const time = num(entry?.time);

    const changes = arr(entry?.changes);
    const messaging = arr(entry?.messaging);

    if (changes) {
      for (const c of changes) events.push(parseChange(igAccountId, c));
    }
    if (messaging) {
      for (const m of messaging)
        events.push(parseMessaging(igAccountId, m, time));
    }
    if (!changes && !messaging) {
      events.push({
        kind: "unsupported",
        igAccountId,
        reason: "entry has neither changes nor messaging",
      });
    }
  }
  return events;
}

function parseChange(igAccountId: string, rawChange: unknown): NormalizedEvent {
  const change = obj(rawChange);
  const field = str(change?.field);
  const value = obj(change?.value);

  if (field === "comments" && value) {
    const from = obj(value.from);
    const media = obj(value.media);
    const commentId = str(value.id) ?? "";
    return {
      kind: "comment",
      igAccountId,
      commentId,
      parentId: str(value.parent_id),
      text: str(value.text) ?? "",
      fromId: str(from?.id),
      fromUsername: str(from?.username),
      mediaId: str(media?.id),
      providerEventId: commentId || `comment:${igAccountId}:${Date.now()}`,
    };
  }

  return {
    kind: "unsupported",
    igAccountId,
    reason: `unhandled change field: ${field ?? "unknown"}`,
  };
}

function parseMessaging(
  igAccountId: string,
  rawMessaging: unknown,
  entryTime?: number,
): NormalizedEvent {
  const m = obj(rawMessaging);
  const senderId = str(obj(m?.sender)?.id) ?? "";
  const ts = num(m?.timestamp) ?? entryTime;

  const postback = obj(m?.postback);
  if (postback) {
    const mid = str(postback.mid);
    return {
      kind: "postback",
      igAccountId,
      senderId,
      text: str(postback.title),
      payload: str(postback.payload),
      mid,
      providerEventId: mid ?? `postback:${senderId}:${ts ?? ""}`,
      timestamp: ts,
    };
  }

  const message = obj(m?.message);
  if (message) {
    const isEcho = message.is_echo === true;
    const mid = str(message.mid);
    const text = str(message.text);

    const storyId = str(obj(obj(message.reply_to)?.story)?.id);
    if (storyId) {
      return {
        kind: "story_reply",
        igAccountId,
        senderId,
        text,
        storyId,
        mid,
        providerEventId: mid ?? `story:${senderId}:${ts ?? ""}`,
        timestamp: ts,
        isEcho,
      };
    }

    const qrPayload = str(obj(message.quick_reply)?.payload);
    if (qrPayload) {
      return {
        kind: "quick_reply",
        igAccountId,
        senderId,
        text,
        payload: qrPayload,
        mid,
        providerEventId: mid ?? `qr:${senderId}:${ts ?? ""}`,
        timestamp: ts,
        isEcho,
      };
    }

    return {
      kind: "message",
      igAccountId,
      senderId,
      text,
      mid,
      providerEventId: mid ?? `msg:${senderId}:${ts ?? ""}`,
      timestamp: ts,
      isEcho,
    };
  }

  return {
    kind: "unsupported",
    igAccountId,
    reason: "messaging entry without message or postback (reaction/read/etc.)",
  };
}

/** Stable dedup hash from the event's kind + provider event id (DECISIONS §7.5). */
export function deduplicationHash(e: NormalizedEvent): string {
  const basis =
    e.kind === "unsupported"
      ? `unsupported:${e.igAccountId ?? ""}:${e.reason}`
      : `${e.kind}:${e.providerEventId}`;
  return createHash("sha256").update(basis).digest("hex");
}
