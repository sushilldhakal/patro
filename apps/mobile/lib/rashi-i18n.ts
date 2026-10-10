export type Lang = "ne" | "en";

/** Mirrors `rashis.*` in the web app's ne.json / en.json. */
const RASHI_NAMES: Record<Lang, string[]> = {
  ne: ["मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"],
  en: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
};

export function normalizeLang(lang?: string | Lang): Lang {
  return (lang ?? "ne").startsWith("en") ? "en" : "ne";
}

export const RASHI_COUNT = 12;

/** API / legacy spellings → canonical index 1–12 (not display copy). */
const ALIAS_TO_NUM: Record<string, number> = {
  "1": 1,
  mesha: 1,
  aries: 1,
  मेष: 1,
  "2": 2,
  vrishabha: 2,
  taurus: 2,
  वृष: 2,
  वृषभ: 2,
  "3": 3,
  mithuna: 3,
  gemini: 3,
  मिथुन: 3,
  "4": 4,
  karka: 4,
  karkata: 4,
  cancer: 4,
  कर्क: 4,
  कर्कट: 4,
  "5": 5,
  simha: 5,
  leo: 5,
  सिंह: 5,
  "6": 6,
  kanya: 6,
  virgo: 6,
  कन्या: 6,
  "7": 7,
  tula: 7,
  libra: 7,
  तुला: 7,
  "8": 8,
  vrishchika: 8,
  scorpio: 8,
  वृश्चिक: 8,
  "9": 9,
  dhanu: 9,
  sagittarius: 9,
  धनु: 9,
  "10": 10,
  makara: 10,
  capricorn: 10,
  मकर: 10,
  "11": 11,
  kumbha: 11,
  aquarius: 11,
  कुम्भ: 11,
  "12": 12,
  meena: 12,
  pisces: 12,
  मीन: 12,
};

function aliasKey(name: string): string {
  const t = name.trim();
  if (/[\u0900-\u097F]/.test(t)) return t;
  return t.toLowerCase();
}

/** Map any API rashi label to 1–12. */
export function rashiNumberFromName(name?: string | null): number | undefined {
  if (!name) return undefined;
  const n = ALIAS_TO_NUM[aliasKey(name)];
  return n >= 1 && n <= 12 ? n : undefined;
}

/** Localized rashi name for index 1–12 from `rashis.*` in ne.json / en.json. */
export function getRashiName(num: number, lang?: string | Lang): string {
  const lng = normalizeLang(lang);
  return RASHI_NAMES[lng][num - 1] ?? String(num);
}

/** All 12 rashi names in order for the given language. */
export function getRashiList(lang?: string | Lang): string[] {
  return Array.from({ length: RASHI_COUNT }, (_, i) => getRashiName(i + 1, lang));
}

/** Rashi label by number — returns "—" when out of range. */
export function formatRashiByNumber(
  rashi: number | undefined | null,
  lang?: string | Lang,
): string {
  if (rashi == null || rashi < 1 || rashi > RASHI_COUNT) return "—";
  return getRashiName(rashi, lang);
}

/**
 * Locale-aware rashi label from API fields (Nepali, Sanskrit English, or Western).
 * Always resolves through i18n — never returns hardcoded names.
 */
export function resolveRashiDisplay(
  nameNe?: string | null,
  nameEn?: string | null,
  lang?: string | Lang,
): string | undefined {
  const num = rashiNumberFromName(nameNe) ?? rashiNumberFromName(nameEn);
  if (num) return getRashiName(num, lang);
  const fallback = nameNe ?? nameEn;
  return fallback || undefined;
}

/** Nepali rashi label, or `undefined` when the index is missing/out of range. */
export function rashiNeFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > RASHI_COUNT) return undefined;
  return getRashiName(rashi, "ne");
}

/** Western / localized name for API Sanskrit English (Mesha → Aries in en). */
export function rashiEnFromName(en?: string | null, lang: Lang = "en"): string | undefined {
  const num = rashiNumberFromName(en);
  if (num) return getRashiName(num, lang);
  return en ?? undefined;
}

/** Nepali canonical name for API English (Mesha → मेष). */
export function rashiNeFromApiEn(en?: string | null): string | undefined {
  const num = rashiNumberFromName(en);
  if (num) return getRashiName(num, "ne");
  return en ?? undefined;
}

/** Western zodiac name — alias for English i18n label. */
export function toWesternRashi(name?: string | null): string | undefined {
  return resolveRashiDisplay(name, name, "en");
}

/** Nepali display — alias for Nepali i18n label. */
export function formatRashiDisplayNe(nameNe?: string | null): string | undefined {
  return resolveRashiDisplay(nameNe, undefined, "ne");
}

/** Locale-aware rashi label (replaces scattered NE/EN maps). */
export function formatRashiDisplay(
  nameNe?: string | null,
  nameEn?: string | null,
  lang?: string | Lang,
): string | undefined {
  return resolveRashiDisplay(nameNe, nameEn, lang);
}
