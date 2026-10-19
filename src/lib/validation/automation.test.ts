import { describe, it, expect } from "vitest";
import { automationInputSchema } from "./automation";

const base = {
  instagram_account_id: "00000000-0000-4000-8000-000000000000",
  name: "[FOLLOW] Guide",
  trigger_comment: true,
  keywords: ["guide"],
};

describe("automationInputSchema - follow gate copy", () => {
  it("accepts an automation without gate copy (defaults apply)", () => {
    expect(automationInputSchema.safeParse(base).success).toBe(true);
  });

  it("accepts custom message + button", () => {
    const r = automationInputSchema.safeParse({
      ...base,
      follow_gate_message: "Follow {handle} and tap below.",
      follow_gate_button: "I'm following",
    });
    expect(r.success).toBe(true);
  });

  it("requires a button when the message is customized", () => {
    const r = automationInputSchema.safeParse({
      ...base,
      follow_gate_message: "Follow {handle} and tap below.",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["follow_gate_button"]);
  });

  it("requires a button when only the retry text is customized", () => {
    const r = automationInputSchema.safeParse({
      ...base,
      follow_gate_retry_message: "Still not following?",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a button over 20 characters (Instagram quick reply limit)", () => {
    const r = automationInputSchema.safeParse({
      ...base,
      follow_gate_message: "Follow first.",
      follow_gate_button: "I am following you now!!",
    });
    expect(r.success).toBe(false);
  });
});
