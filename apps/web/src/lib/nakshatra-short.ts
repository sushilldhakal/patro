import type { Lang } from "@/i18n/locale";
import { normalizeLang } from "@/i18n/locale";
import { findNakshatraIcon, NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";

/** Compact Latin labels for month-grid cells (English UI). */
const NAKSHATRA_SHORT_EN: readonly string[] = [
  "ASH",
  "BHA",
  "KRI",
  "ROH",
  "MRI",
  "ARD",
  "PUN",
  "PUS",
  "ASHL",
  "MAG",
  "P.PHA",
  "U.PHA",
  "HAS",
  "CHI",
  "SWA",
  "VIS",
  "ANU",
  "JYE",
  "MUL",
  "P.ASH",
  "U.ASH",
  "SHR",
  "DHA",
  "SHT",
  "P.BHA",
  "U.BHA",
  "REV",
];

/** Compact Devanagari labels (Nepali UI) — mirrors the English abbrev pattern. */
const NAKSHATRA_SHORT_NE: readonly string[] = [
  "अश",
  "भर",
  "कृत",
  "रोह",
  "मृग",
  "आर्द",
  "पुन",
  "पुष",
  "आश्र",
  "मघ",
  "पू.फा",
  "उ.फा",
  "हस्त",
  "चित्र",
  "स्वा",
  "विश",
  "अनु",
  "ज्ये",
  "मूल",
  "पू.षा",
  "उ.षा",
  "श्र",
  "धन",
  "शत",
  "पू.भा",
  "उ.भा",
  "रेव",
];

export function nakshatraShortLabel(
  name?: string | null,
  lang?: string | Lang,
): string | undefined {
  const icon = findNakshatraIcon(name);
  if (!icon) return undefined;
  const idx = NAKSHATRA_ICONS.indexOf(icon);
  if (idx < 0 || idx >= NAKSHATRA_SHORT_EN.length) return undefined;
  const lng = lang ? normalizeLang(lang) : "ne";
  return lng === "en" ? NAKSHATRA_SHORT_EN[idx] : NAKSHATRA_SHORT_NE[idx];
}
