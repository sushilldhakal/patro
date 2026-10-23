/**
 * Long English tithi names ("Chaturdashi") overflow a phone-width calendar cell. A soft hyphen lets
 * them wrap at a syllable boundary ("Chatur-dashi") only when they would not otherwise fit; Nepali
 * names never match, so they are returned unchanged.
 */
export function softBreakTithi(name: string): string {
  return name.replace(/^(.{3,}?)(dashi|pada|thi|vasya)$/i, "$1\u00AD$2");
}
