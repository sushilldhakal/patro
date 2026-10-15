/**
 * Source citations on a shloka, as shown under the verse: a Veda samhita
 * (`rigveda:1.1.3`) or, when the verse is in no Veda, a Purana
 * (`agni-purana:12.3`).
 */

const VEDA_CITE_NAMES: Record<string, { ne: string; en: string }> = {
  rigveda: { ne: "ऋग्वेद", en: "Rigveda" },
  yajurveda: { ne: "यजुर्वेद", en: "Yajurveda" },
  samaveda: { ne: "सामवेद", en: "Samaveda" },
  atharvaveda: { ne: "अथर्ववेद", en: "Atharvaveda" },
  "brahma-purana": { ne: "ब्रह्मपुराण", en: "Brahma Purana" },
  "vishnu-purana": { ne: "विष्णुपुराण", en: "Vishnu Purana" },
  "shiva-purana": { ne: "शिवपुराण", en: "Shiva Purana" },
  "bhagavata-purana": { ne: "श्रीमद्भागवतपुराण", en: "Bhagavata Purana" },
  "narada-purana": { ne: "नारदपुराण", en: "Narada Purana" },
  "markandeya-purana": { ne: "मार्कण्डेयपुराण", en: "Markandeya Purana" },
  "agni-purana": { ne: "अग्निपुराण", en: "Agni Purana" },
  "skanda-purana": { ne: "स्कन्दपुराण", en: "Skanda Purana" },
  "vamana-purana": { ne: "वामनपुराण", en: "Vamana Purana" },
  "kurma-purana": { ne: "कूर्मपुराण", en: "Kurma Purana" },
  "matsya-purana": { ne: "मत्स्यपुराण", en: "Matsya Purana" },
  "garuda-purana": { ne: "गरुडपुराण", en: "Garuda Purana" },
  "brahmanda-purana": { ne: "ब्रह्माण्डपुराण", en: "Brahmanda Purana" },
  "vayu-purana": { ne: "वायुपुराण", en: "Vayu Purana" },
  "narasimha-purana": { ne: "नृसिंहपुराण", en: "Narasimha Purana" },
  "devi-gita": { ne: "देवीगीता", en: "Devi Gita" },
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
