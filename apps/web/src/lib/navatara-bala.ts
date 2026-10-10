import type { NavataraTone } from "@/lib/api";
import { normalizeLang } from "@/i18n/locale";

export type { NavataraRow, NavataraTableBlock, NavataraTone } from "@/lib/api";

export function navataraSlotTone(tone: NavataraTone): "good" | "bad" | "neutral" {
  if (tone === "best" || tone === "good") return "good";
  if (tone === "bad" || tone === "worst") return "bad";
  return "neutral";
}

/** Tara names shown in daily muhurta (API often returns Nepali only). */
const TARA_NE_TO_EN: Record<string, string> = {
  जन्म: "Janma",
  सम्पत्: "Sampat",
  विपत्: "Vipat",
  क्षेम: "Kshema",
  प्रत्यरि: "Pratyari",
  प्रत्यक्: "Pratyari",
  साधक: "Sadhaka",
  साधना: "Sadhaka",
  वध: "Vadha",
  निधन: "Nidhana",
  मित्र: "Mitra",
  अतिमित्र: "Ati-mitra",
  "परम मित्र": "Parama Mitra",
  परममित्र: "Parama Mitra",
};

/** Quality labels paired with tara (शुभ / अशुभ / …). */
const QUALITY_NE_TO_EN: Record<string, string> = {
  "अति शुभ": "Very auspicious",
  अतिशुभ: "Very auspicious",
  शुभ: "Auspicious",
  अशुभ: "Inauspicious",
  घातक: "Fatal",
  सामान्य: "Neutral",
  मध्यम: "Medium",
};

function translateToken(value: string, map: Record<string, string>): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (map[trimmed]) return map[trimmed];
  // Already Latin — keep as-is.
  if (!/[\u0900-\u097F]/.test(trimmed)) return trimmed;
  return map[trimmed] ?? trimmed;
}

/** Locale-aware tara label (जन्म → Janma). */
export function formatNavataraTara(tara: string, lang?: string): string {
  if (normalizeLang(lang) !== "en") return tara;
  return translateToken(tara, TARA_NE_TO_EN);
}

/** Locale-aware quality label (अति शुभ → Very auspicious). */
export function formatNavataraQuality(quality: string, lang?: string): string {
  if (normalizeLang(lang) !== "en") return quality;
  return translateToken(quality, QUALITY_NE_TO_EN);
}

const NAVATARA_TYPES: Array<{
  id: number;
  tara: string;
  quality: string;
  tone: NavataraTone;
}> = [
  { id: 1, tara: "जन्म", quality: "मध्यम", tone: "neutral" },
  { id: 2, tara: "सम्पत्", quality: "अति शुभ", tone: "best" },
  { id: 3, tara: "विपत्", quality: "अशुभ", tone: "bad" },
  { id: 4, tara: "क्षेम", quality: "अति शुभ", tone: "best" },
  { id: 5, tara: "प्रत्यक्", quality: "अशुभ", tone: "bad" },
  { id: 6, tara: "साधना", quality: "अति शुभ", tone: "best" },
  { id: 7, tara: "निधन", quality: "घातक", tone: "worst" },
  { id: 8, tara: "मित्र", quality: "शुभ", tone: "good" },
  { id: 9, tara: "परम मित्र", quality: "अति शुभ", tone: "best" },
];

function computeNavataraNumber(moonIdx: number, targetIdx: number, cycleSize: number): number {
  const diff = (targetIdx - moonIdx + cycleSize) % cycleSize;
  if (diff === 0) return 1;
  return ((9 - (diff % 9)) % 9) + 1;
}

/** Navatara tara/quality/tone for a janma rashi or nakshatra vs moon reference. */
export function computeNavataraMeta(
  moonIdx: number,
  targetIdx: number,
  cycleSize: number,
): Pick<import("@/lib/api").NavataraRow, "tara" | "quality" | "tone" | "tara_num"> {
  const taraNum = computeNavataraNumber(moonIdx, targetIdx, cycleSize);
  const row = NAVATARA_TYPES.find((t) => t.id === taraNum) ?? NAVATARA_TYPES[0];
  return { tara: row.tara, quality: row.quality, tone: row.tone, tara_num: taraNum };
}
