/** Choghadiya muhurta labels — names and qualities from ne.json / en.json. */

import { normalizeLang, translateKey, type Lang } from "./locale";

export type ChoghadiyaTone = "good" | "bad" | "neutral";

/** Devanagari name → i18n key under choghadiya.types.* */
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

function resolveLng(lang?: string | Lang): Lang {
  return lang ? normalizeLang(lang) : normalizeLang();
}

function typeKey(nameNe: string): string | undefined {
  return CHOGHADIYA_KEY_BY_NE[nameNe];
}

export function choghadiyaTone(nameNe: string, bad?: boolean): ChoghadiyaTone {
  const key = typeKey(nameNe) as ChoghadiyaTypeKey | undefined;
  if (key) return TONE_BY_KEY[key];
  if (bad) return "bad";
  return "neutral";
}

export function choghadiyaName(nameNe: string, lang?: string | Lang): string {
  const key = typeKey(nameNe);
  if (!key) return nameNe;
  return translateKey(`choghadiya.types.${key}.name`, resolveLng(lang));
}

/** Full quality description, e.g. `Excellent (Highly Auspicious)`. */
export function choghadiyaQuality(nameNe: string, lang?: string | Lang, bad?: boolean): string {
  const key = typeKey(nameNe);
  const lng = resolveLng(lang);
  if (key) return translateKey(`choghadiya.types.${key}.quality`, lng);
  return choghadiyaToneLabel(nameNe, lng, bad);
}

/** Short tone label — `शुभ` / `अशुभ` / `सामान्य` and their English equivalents. */
export function choghadiyaToneLabel(nameNe: string, lang?: string | Lang, bad?: boolean): string {
  const lng = resolveLng(lang);
  const tone = choghadiyaTone(nameNe, bad);
  if (tone === "good") return translateKey("choghadiya.quality_good", lng);
  if (tone === "bad") return translateKey("choghadiya.quality_bad", lng);
  return translateKey("choghadiya.quality_neutral", lng);
}

/** Full row label, e.g. `Amrita — Excellent (Highly Auspicious)`. */
export function choghadiyaRowLabel(nameNe: string, lang?: string | Lang, bad?: boolean): string {
  return `${choghadiyaName(nameNe, lang)} — ${choghadiyaQuality(nameNe, lang, bad)}`;
}

export function choghadiyaLegendMarker(tone: ChoghadiyaTone): string {
  if (tone === "good") return "🟢";
  if (tone === "bad") return "🔴";
  return "🟡";
}

export function choghadiyaLegendLabel(typeKey: ChoghadiyaTypeKey, lang?: string | Lang): string {
  const lng = resolveLng(lang);
  const name = translateKey(`choghadiya.types.${typeKey}.name`, lng);
  const quality = translateKey(`choghadiya.types.${typeKey}.quality`, lng);
  return `${name} — ${quality}`;
}
