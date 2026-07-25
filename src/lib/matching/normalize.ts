/**
 * Text normalization for keyword matching (brief §7.2):
 *  - lowercase
 *  - Unicode-normalize
 *  - collapse duplicate whitespace, trim
 *  - optional accent removal (per-automation `remove_accents`)
 */
export function normalizeText(
  input: string,
  opts: { removeAccents?: boolean } = {},
): string {
  let s = (input ?? "").toString();
  // Lowercase using locale-agnostic rules.
  s = s.toLowerCase();
  if (opts.removeAccents) {
    // Decompose then strip combining diacritical marks.
    s = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } else {
    // Canonical composition for stable comparison.
    s = s.normalize("NFC");
  }
  // Collapse all whitespace runs to a single space and trim.
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
