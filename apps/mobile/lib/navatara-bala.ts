import type { NavataraTone } from "@/lib/api";

export function navataraSlotTone(tone: NavataraTone): "good" | "bad" | "neutral" {
  if (tone === "best" || tone === "good") return "good";
  if (tone === "bad" || tone === "worst") return "bad";
  return "neutral";
}

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
  if (!/[\u0900-\u097F]/.test(trimmed)) return trimmed;
  return map[trimmed] ?? trimmed;
}

export function formatNavataraTara(tara: string, lang?: string): string {
  if (lang?.slice(0, 2) === "en") return translateToken(tara, TARA_NE_TO_EN);
  return tara;
}

export function formatNavataraQuality(quality: string, lang?: string): string {
  if (lang?.slice(0, 2) === "en") return translateToken(quality, QUALITY_NE_TO_EN);
  return quality;
}
