import { describe, it, expect } from "vitest";
import { parseWebhookPayload, deduplicationHash } from "./parse";
import type { CommentEvent, MessageEvent } from "./types";

// Sanitized fixtures modeled on current Instagram webhook shapes (DECISIONS §8).
const IG = "17841400000000000";

describe("parseWebhookPayload - comments", () => {
  it("parses a comment change", () => {
    const events = parseWebhookPayload({
      object: "instagram",
      entry: [
        {
          id: IG,
          time: 1700000000,
          changes: [
            {
              field: "comments",
              value: {
                id: "comment_123",
                text: "LINK please",
                from: { id: "user_abc", username: "someone" },
                media: { id: "media_9" },
              },
            },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    const e = events[0] as CommentEvent;
    expect(e.kind).toBe("comment");
    expect(e.commentId).toBe("comment_123");
    expect(e.text).toBe("LINK please");
    expect(e.fromId).toBe("user_abc");
    expect(e.mediaId).toBe("media_9");
    expect(e.providerEventId).toBe("comment_123");
  });
});

describe("parseWebhookPayload - messaging", () => {
  it("parses a plain DM", () => {
    const [e] = parseWebhookPayload({
      object: "instagram",
      entry: [
        {
          id: IG,
          messaging: [
            {
              sender: { id: "user_1" },
              recipient: { id: IG },
              timestamp: 1700000001,
              message: { mid: "mid_1", text: "hello" },
            },
          ],
        },
      ],
    }) as MessageEvent[];
    expect(e.kind).toBe("message");
    expect(e.senderId).toBe("user_1");
    expect(e.text).toBe("hello");
    expect(e.mid).toBe("mid_1");
  });

  it("parses a quick reply with payload", () => {
    const [e] = parseWebhookPayload({
      object: "instagram",
      entry: [
        {
          id: IG,
          messaging: [
            {
              sender: { id: "user_2" },
              message: {
                mid: "mid_2",
                text: "Send me the link",
                quick_reply: { payload: "auto:abc-123" },
              },
            },
          ],
        },
      ],
    }) as MessageEvent[];
    expect(e.kind).toBe("quick_reply");
    expect(e.payload).toBe("auto:abc-123");
  });

  it("parses a story reply", () => {
    const [e] = parseWebhookPayload({
      object: "instagram",
      entry: [
        {
          id: IG,
          messaging: [
            {
              sender: { id: "user_3" },
              message: {
                mid: "mid_3",
                text: "nice!",
                reply_to: { story: { id: "story_77", url: "https://x/y" } },
              },
            },
          ],
        },
      ],
    }) as MessageEvent[];
    expect(e.kind).toBe("story_reply");
    expect(e.storyId).toBe("story_77");
  });

  it("parses a postback", () => {
    const [e] = parseWebhookPayload({
      object: "instagram",
      entry: [
        {
          id: IG,
          messaging: [
            {
              sender: { id: "user_4" },
              postback: { mid: "mid_4", title: "Get it", payload: "auto:xyz" },
            },
          ],
        },
      ],
    }) as MessageEvent[];
    expect(e.kind).toBe("postback");
    expect(e.payload).toBe("auto:xyz");
  });

  it("flags an echo message", () => {
    const [e] = parseWebhookPayload({
      object: "instagram",
      entry: [
        {
          id: IG,
          messaging: [
            {
              sender: { id: IG },
              message: { mid: "mid_5", text: "our own reply", is_echo: true },
            },
          ],
        },
      ],
    }) as MessageEvent[];
    expect(e.isEcho).toBe(true);
  });

  it("marks reactions/reads as unsupported, never throws", () => {
    const [e] = parseWebhookPayload({
      object: "instagram",
      entry: [{ id: IG, messaging: [{ sender: { id: "u" }, reaction: {} }] }],
    });
    expect(e.kind).toBe("unsupported");
  });
});

describe("parseWebhookPayload - malformed", () => {
  it("returns unsupported for missing entry", () => {
    expect(parseWebhookPayload({})[0].kind).toBe("unsupported");
    expect(parseWebhookPayload(null)[0].kind).toBe("unsupported");
    expect(parseWebhookPayload("garbage")[0].kind).toBe("unsupported");
  });
});

describe("deduplicationHash", () => {
  it("is stable for the same event id (webhook replay)", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: IG,
          changes: [
            { field: "comments", value: { id: "c1", text: "hi", from: { id: "u" } } },
          ],
        },
      ],
    };
    const a = deduplicationHash(parseWebhookPayload(payload)[0]);
    const b = deduplicationHash(parseWebhookPayload(payload)[0]);
    expect(a).toBe(b);
  });

  it("differs for different events", () => {
    const mk = (id: string) =>
      deduplicationHash(
        parseWebhookPayload({
          object: "instagram",
          entry: [
            { id: IG, changes: [{ field: "comments", value: { id, text: "x", from: { id: "u" } } }] },
          ],
        })[0],
      );
    expect(mk("c1")).not.toBe(mk("c2"));
  });
});
