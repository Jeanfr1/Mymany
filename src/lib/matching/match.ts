import { normalizeText } from "./normalize";

export type MatchType = "contains" | "exact" | "any";

export type MatchResult = { matched: boolean; keyword?: string };

/**
 * Decide whether `text` triggers, given the automation's keywords + match type.
 *  - "any":      always matches (any inbound triggers; keywords ignored)
 *  - "exact":    normalized text equals a normalized keyword
 *  - "contains": normalized text contains a normalized keyword as a substring
 */
export function matchKeywords(params: {
  text: string;
  keywords: string[];
  matchType: MatchType;
  removeAccents?: boolean;
}): MatchResult {
  const { text, keywords, matchType, removeAccents } = params;

  if (matchType === "any") {
    return { matched: true };
  }

  const norm = normalizeText(text, { removeAccents });
  if (!norm) return { matched: false };

  for (const raw of keywords) {
    const k = normalizeText(raw, { removeAccents });
    if (!k) continue;
    if (matchType === "exact" && norm === k) {
      return { matched: true, keyword: raw };
    }
    if (matchType === "contains" && norm.includes(k)) {
      return { matched: true, keyword: raw };
    }
  }
  return { matched: false };
}
