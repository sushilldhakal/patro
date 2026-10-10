/**
 * Choghadiya muhurta labels. Mirrors the web app's `choghadiya-display.ts`;
 * mobile has no i18next runtime, so the `choghadiya.*` strings from ne.json /
 * en.json live here as typed tables.
 */

export type ChoghadiyaTone = "good" | "bad" | "neutral";

type Lang = "ne" | "en";

function resolveLng(lang?: string): Lang {
  return (lang ?? "ne").startsWith("en") ? "en" : "ne";
}

/** Devanagari name → type key. */
export const CHOGHADIYA_KEY_BY_NE: Record<string, string> = {
  अमृत: "amrita",
  शुभ: "shubha",
  लाभ: "labha",
  चर: "chara",
  रोग: "roga",
  काल: "kala",
  उद्वेग: "udvega",
};

export const CHOGHADIYA_TYPE_KEYS = [
  "amrita",
  "shubha",
  "labha",
  "chara",
  "roga",
  "kala",
  "udvega",
] as const;

export type ChoghadiyaTypeKey = (typeof CHOGHADIYA_TYPE_KEYS)[number];

export const TONE_BY_KEY: Record<ChoghadiyaTypeKey, ChoghadiyaTone> = {
  amrita: "good",
  shubha: "good",
  labha: "good",
  chara: "neutral",
  roga: "bad",
  kala: "bad",
  udvega: "bad",
};

const TYPE_COPY: Record<ChoghadiyaTypeKey, Record<Lang, { name: string; quality: string }>> = {
  amrita: {
    ne: { name: "अमृत", quality: "उत्तम (अत्यन्त शुभ)" },
    en: { name: "Amrita", quality: "Excellent (Highly Auspicious)" },
  },
  shubha: {
    ne: { name: "शुभ", quality: "शुभ" },
    en: { name: "Shubha", quality: "Auspicious" },
  },
  labha: {
    ne: { name: "लाभ", quality: "लाभ" },
    en: { name: "Labha", quality: "Gain" },
  },
  chara: {
    ne: { name: "चर", quality: "यात्रा र चलचलका लागि राम्रो" },
    en: { name: "Chara", quality: "Good for Movement & Travel" },
  },
  roga: {
    ne: { name: "रोग", quality: "रोग (महत्त्वपूर्ण काम टाढा राख्नुहोस्)" },
    en: { name: "Roga", quality: "Disease (Avoid Important Tasks)" },
  },
  kala: {
    ne: { name: "काल", quality: "अशुभ" },
    en: { name: "Kala", quality: "Inauspicious" },
  },
  udvega: {
    ne: { name: "उद्वेग", quality: "चिन्ता (महत्त्वपूर्ण काम टाढा राख्नुहोस्)" },
    en: { name: "Udvega", quality: "Anxiety (Avoid Important Tasks)" },
  },
};

const TONE_COPY: Record<ChoghadiyaTone, Record<Lang, string>> = {
  good: { ne: "शुभ", en: "Good" },
  bad: { ne: "अशुभ", en: "Inauspicious" },
  neutral: { ne: "सामान्य", en: "Neutral" },
};

function typeKey(nameNe: string): ChoghadiyaTypeKey | undefined {
  return CHOGHADIYA_KEY_BY_NE[nameNe] as ChoghadiyaTypeKey | undefined;
}

export function choghadiyaTone(nameNe: string, bad?: boolean): ChoghadiyaTone {
  const key = typeKey(nameNe);
  if (key) return TONE_BY_KEY[key];
  if (bad) return "bad";
  return "neutral";
}

export function choghadiyaName(nameNe: string, lang?: string): string {
  const key = typeKey(nameNe);
  if (!key) return nameNe;
  return TYPE_COPY[key][resolveLng(lang)].name;
}

/** Full quality description, e.g. `Excellent (Highly Auspicious)`. */
export function choghadiyaQuality(nameNe: string, lang?: string, bad?: boolean): string {
  const key = typeKey(nameNe);
  if (key) return TYPE_COPY[key][resolveLng(lang)].quality;
  return choghadiyaToneLabel(nameNe, lang, bad);
}

/** Short tone label — `शुभ` / `अशुभ` / `सामान्य` and their English equivalents. */
export function choghadiyaToneLabel(nameNe: string, lang?: string, bad?: boolean): string {
  return TONE_COPY[choghadiyaTone(nameNe, bad)][resolveLng(lang)];
}

/** Full row label, e.g. `Amrita — Excellent (Highly Auspicious)`. */
export function choghadiyaRowLabel(nameNe: string, lang?: string, bad?: boolean): string {
  return `${choghadiyaName(nameNe, lang)} — ${choghadiyaQuality(nameNe, lang, bad)}`;
}

export function choghadiyaLegendMarker(tone: ChoghadiyaTone): string {
  if (tone === "good") return "🟢";
  if (tone === "bad") return "🔴";
  return "🟡";
}

export function choghadiyaLegendLabel(key: ChoghadiyaTypeKey, lang?: string): string {
  const copy = TYPE_COPY[key][resolveLng(lang)];
  return `${copy.name} — ${copy.quality}`;
}
