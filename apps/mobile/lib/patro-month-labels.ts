import { BS_MONTH_NAMES, BS_MONTHS_NE } from "./bs-calendar";

export const BS_MONTHS_SHORT = [
  "Bai", "Jes", "Ash", "Sha", "Bha", "Asw",
  "Kar", "Man", "Pou", "Mag", "Fal", "Cha",
] as const;

export const AD_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const AD_MONTHS_SHORT_NE = [
  "जन", "फेब", "मार्च", "अप्र", "मे", "जुन",
  "जुल", "अग", "सेप", "अक्ट", "नोभ", "डिस",
] as const;

export const AD_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const AD_MONTH_NAMES_NE = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
] as const;

export function adMonthLabel(month: number, lang: string): string {
  const i = month - 1;
  return lang === "en" ? AD_MONTH_NAMES[i]! : AD_MONTHS_SHORT_NE[i]!;
}

export function bsMonthLabel(month: number, lang: string): string {
  const i = month - 1;
  return lang === "en" ? BS_MONTH_NAMES[i]! : BS_MONTHS_NE[i]!;
}
