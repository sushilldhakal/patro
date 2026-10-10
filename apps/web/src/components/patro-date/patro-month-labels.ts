/** Month name tables for patro nav UI — labels only, no conversion or month lengths. */

import type { Era } from "@/lib/era";

export const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

export const BS_MONTHS_SHORT = [
  "Bai", "Jes", "Ash", "Sha", "Bha", "Asw",
  "Kar", "Man", "Pou", "Mag", "Fal", "Cha",
] as const;

export const BS_MONTHS_NE = [
  "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत",
];

export const AD_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const AD_MONTH_NAMES_NE = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
] as const;

export const AD_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function adMonthLabel(month: number, lang: string): string {
  const i = month - 1;
  return lang === "en" ? AD_MONTH_NAMES[i]! : AD_MONTH_NAMES_NE[i]!;
}

export function bsMonthLabel(month: number, lang: string): string {
  const i = month - 1;
  return lang === "en" ? BS_MONTH_NAMES[i]! : BS_MONTHS_NE[i]!;
}

export function isGregorianEraBrowse(era: Era): boolean {
  return era === "ad" || era === "bc";
}
