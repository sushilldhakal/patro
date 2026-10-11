/** Samhita verse citations on a shloka (`rigveda:1.1.3`), as shown under the verse. */

const VEDA_CITE_NAMES: Record<string, { ne: string; en: string }> = {
  rigveda: { ne: "ऋग्वेद", en: "Rigveda" },
  yajurveda: { ne: "यजुर्वेद", en: "Yajurveda" },
  samaveda: { ne: "सामवेद", en: "Samaveda" },
  atharvaveda: { ne: "अथर्ववेद", en: "Atharvaveda" },
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** "rigveda:1.1.3" → "ऋग्वेद १.१.३" or "Rigveda 1.1.3". */
export function formatVedaCite(cite: string | null | undefined, lang: string): string | null {
  if (!cite) return null;
  const split = cite.indexOf(":");
  if (split <= 0) return null;
  const name = VEDA_CITE_NAMES[cite.slice(0, split)];
  const loc = cite.slice(split + 1);
  if (!name || !loc) return null;
  const shown =
    lang === "ne" ? loc.replace(/\d/g, (digit) => DEVANAGARI_DIGITS[Number(digit)] ?? digit) : loc;
  return `${name[lang === "ne" ? "ne" : "en"]} ${shown}`;
}
