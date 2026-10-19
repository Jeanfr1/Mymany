import { describe, it, expect } from "vitest";
import {
  FOLLOW_GATE_DEFAULTS,
  isFollowGated,
  renderFollowGate,
} from "./follow-gate";

describe("isFollowGated", () => {
  it("is on only when the name starts with [FOLLOW]", () => {
    expect(isFollowGated("[FOLLOW] Ebook")).toBe(true);
    expect(isFollowGated("Ebook [FOLLOW]")).toBe(false);
    expect(isFollowGated("Ebook")).toBe(false);
  });
});

describe("renderFollowGate - defaults (existing automations)", () => {
  it("sends the original Portuguese text when nothing is customized", () => {
    expect(renderFollowGate({}, "conta", false)).toEqual({
      text: "Para liberar o seu plano, siga @conta e depois toque no botão abaixo. Vou verificar automaticamente.",
      button: "Já estou seguindo",
    });
  });
  it("sends the original Portuguese retry text", () => {
    expect(renderFollowGate({}, "conta", true).text).toBe(
      "Ainda não consegui confirmar que você segue @conta. Siga o perfil e toque novamente para liberar o PDF.",
    );
  });
  it("treats null and blank columns as not set", () => {
    const r = renderFollowGate(
      {
        follow_gate_message: null,
        follow_gate_retry_message: "   ",
        follow_gate_button: "",
      },
      "conta",
    );
    expect(r.button).toBe(FOLLOW_GATE_DEFAULTS.button);
    expect(r.text).toContain("Para liberar o seu plano");
  });
  it("falls back to 'este perfil' when the username is unknown", () => {
    expect(renderFollowGate({}, null).text).toContain("siga este perfil");
  });
});

describe("renderFollowGate - custom copy", () => {
  const english = {
    follow_gate_message:
      "Follow {handle} first, then tap the button and I'll send it.",
    follow_gate_retry_message:
      "I can't see the follow yet. Follow {handle} and tap again.",
    follow_gate_button: "I'm following",
  };

  it("uses the automation's message, button and handle", () => {
    expect(renderFollowGate(english, "nora.lowbattery")).toEqual({
      text: "Follow @nora.lowbattery first, then tap the button and I'll send it.",
      button: "I'm following",
    });
  });
  it("uses the custom retry message on retry", () => {
    expect(renderFollowGate(english, "nora.lowbattery", true).text).toBe(
      "I can't see the follow yet. Follow @nora.lowbattery and tap again.",
    );
  });
  it("repeats the custom message on retry when no retry text is set", () => {
    const r = renderFollowGate(
      { ...english, follow_gate_retry_message: null },
      "nora.lowbattery",
      true,
    );
    expect(r.text).toBe(
      "Follow @nora.lowbattery first, then tap the button and I'll send it.",
    );
  });
  it("replaces every {handle} and uses a neutral fallback without a username", () => {
    const r = renderFollowGate(
      { follow_gate_message: "{handle}! Follow {handle}.", follow_gate_button: "Done" },
      null,
    );
    expect(r.text).toBe("this account! Follow this account.");
  });
  it("keeps text without a placeholder as written", () => {
    const r = renderFollowGate(
      { follow_gate_message: "Follow me and tap below.", follow_gate_button: "Done" },
      "x",
    );
    expect(r.text).toBe("Follow me and tap below.");
  });
});
