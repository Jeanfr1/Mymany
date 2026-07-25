import { describe, it, expect } from "vitest";
import { normalizeText } from "./normalize";
import { matchKeywords } from "./match";

describe("normalizeText", () => {
  it("lowercases, collapses spaces, trims", () => {
    expect(normalizeText("  Hello   WORLD  ")).toBe("hello world");
  });
  it("keeps accents by default", () => {
    expect(normalizeText("Café")).toBe("café");
  });
  it("removes accents when requested", () => {
    expect(normalizeText("Café com Pão", { removeAccents: true })).toBe(
      "cafe com pao",
    );
  });
  it("handles empty / non-string-ish input", () => {
    expect(normalizeText("")).toBe("");
    expect(normalizeText("   ")).toBe("");
  });
});

describe("matchKeywords - any", () => {
  it("always matches regardless of text/keywords", () => {
    expect(
      matchKeywords({ text: "anything", keywords: [], matchType: "any" })
        .matched,
    ).toBe(true);
  });
});

describe("matchKeywords - exact", () => {
  it("matches when normalized text equals a keyword", () => {
    const r = matchKeywords({
      text: "  LINK ",
      keywords: ["link"],
      matchType: "exact",
    });
    expect(r.matched).toBe(true);
    expect(r.keyword).toBe("link");
  });
  it("does not match a superstring", () => {
    expect(
      matchKeywords({
        text: "send me the link",
        keywords: ["link"],
        matchType: "exact",
      }).matched,
    ).toBe(false);
  });
});

describe("matchKeywords - contains", () => {
  it("matches a substring keyword", () => {
    const r = matchKeywords({
      text: "Please send me the LINK now",
      keywords: ["link"],
      matchType: "contains",
    });
    expect(r.matched).toBe(true);
    expect(r.keyword).toBe("link");
  });
  it("returns first matching keyword", () => {
    const r = matchKeywords({
      text: "quero o guia",
      keywords: ["ebook", "guia"],
      matchType: "contains",
    });
    expect(r.keyword).toBe("guia");
  });
  it("respects accent removal", () => {
    expect(
      matchKeywords({
        text: "quero o GUIA",
        keywords: ["guía"],
        matchType: "contains",
        removeAccents: true,
      }).matched,
    ).toBe(true);
    // Without accent removal, "guía" != "guia"
    expect(
      matchKeywords({
        text: "quero o guia",
        keywords: ["guía"],
        matchType: "contains",
        removeAccents: false,
      }).matched,
    ).toBe(false);
  });
  it("does not match when absent", () => {
    expect(
      matchKeywords({
        text: "hello there",
        keywords: ["price", "buy"],
        matchType: "contains",
      }).matched,
    ).toBe(false);
  });
  it("ignores empty keywords", () => {
    expect(
      matchKeywords({
        text: "hello",
        keywords: ["", "  "],
        matchType: "contains",
      }).matched,
    ).toBe(false);
  });
});
