/**
 * Normalized internal representation of inbound Instagram webhook events.
 * Parsers are tolerant of optional fields (DECISIONS §4/§8).
 */

export type CommentEvent = {
  kind: "comment";
  igAccountId: string;
  commentId: string;
  parentId?: string;
  text: string;
  fromId?: string;
  fromUsername?: string;
  mediaId?: string;
  providerEventId: string;
  timestamp?: number;
};

export type InboundMessageKind =
  | "message"
  | "story_reply"
  | "quick_reply"
  | "postback";

export type MessageEvent = {
  kind: InboundMessageKind;
  igAccountId: string;
  senderId: string;
  text?: string;
  payload?: string; // quick_reply or postback payload
  storyId?: string;
  mid?: string;
  providerEventId: string;
  timestamp?: number;
  isEcho?: boolean; // outgoing echo of our own message — ignored downstream
};

export type UnsupportedEvent = {
  kind: "unsupported";
  igAccountId?: string;
  providerEventId?: string;
  reason: string;
};

export type NormalizedEvent = CommentEvent | MessageEvent | UnsupportedEvent;

export function isInboundMessage(e: NormalizedEvent): e is MessageEvent {
  return (
    e.kind === "message" ||
    e.kind === "story_reply" ||
    e.kind === "quick_reply" ||
    e.kind === "postback"
  );
}
