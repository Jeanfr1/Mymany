import { describe, it, expect } from "vitest";
import {
  QUICK_REPLY_PREFIX,
  dmWelcomeWithButton,
  linkDelaySeconds,
} from "./delivery-plan";

const base = {
  id: "7a54c194-8728-4ece-8b10-6037ea979ed2",
  welcome_message: "Hi, it's Nora. Tap below and I'll send it.",
  quick_reply_text: "Send me the plan",
};

describe("dmWelcomeWithButton", () => {
  it("sends the welcome with its button, like a comment does", () => {
    expect(dmWelcomeWithButton(base, "2601636013596366")).toEqual({
      recipient_id: "2601636013596366",
      text: "Hi, it's Nora. Tap below and I'll send it.",
      quick_reply_title: "Send me the plan",
      quick_reply_payload: `${QUICK_REPLY_PREFIX}${base.id}`,
    });
  });

  it("falls back to the old sequence when there is no button title", () => {
    expect(dmWelcomeWithButton({ ...base, quick_reply_text: null }, "r")).toBeNull();
    expect(dmWelcomeWithButton({ ...base, quick_reply_text: "   " }, "r")).toBeNull();
  });

  it("falls back when there is no welcome text", () => {
    expect(dmWelcomeWithButton({ ...base, welcome_message: null }, "r")).toBeNull();
    expect(dmWelcomeWithButton({ ...base, welcome_message: "" }, "r")).toBeNull();
  });

  it("trims stray spaces from the copy", () => {
    const p = dmWelcomeWithButton(
      { ...base, welcome_message: " Hi ", quick_reply_text: " Send " },
      "r",
    );
    expect(p?.text).toBe("Hi");
    expect(p?.quick_reply_title).toBe("Send");
  });
});

describe("linkDelaySeconds", () => {
  it("holds the link only behind a welcome queued in the same sequence", () => {
    expect(linkDelaySeconds(true)).toBe(3);
    expect(linkDelaySeconds(false)).toBe(0);
  });
});
