/** Nepal Bikram Sambat samvatsara (60-year Jovian cycle) — mirrors backend true-Jupiter rules. */

import type { PatroBrowseEra } from "@/lib/patro-era";
import { isGregorianBrowseEra } from "@/lib/patro-era";

export interface SamvatsaraInfo {
  key: string;
  name_en: string;
  name_ne: string;
  cycle: number;
  deity: "brahma" | "vishnu" | "shiva";
}

export const SAMVATSARA_ENTRIES: readonly SamvatsaraInfo[] = [
  { key: "prabhava", name_en: "Prabhava", name_ne: "प्रभव", cycle: 1, deity: "brahma" },
  { key: "vibhava", name_en: "Vibhava", name_ne: "विभव", cycle: 2, deity: "brahma" },
  { key: "shukla", name_en: "Shukla", name_ne: "शुक्ल", cycle: 3, deity: "brahma" },
  { key: "pramoda", name_en: "Pramoda", name_ne: "प्रमोद", cycle: 4, deity: "brahma" },
  { key: "prajapati", name_en: "Prajapati", name_ne: "प्रजापति", cycle: 5, deity: "brahma" },
  { key: "angira", name_en: "Angira", name_ne: "अङ्गिरा", cycle: 6, deity: "brahma" },
  { key: "shrimukha", name_en: "Shrimukha", name_ne: "श्रीमुख", cycle: 7, deity: "brahma" },
  { key: "bhava", name_en: "Bhava", name_ne: "भाव", cycle: 8, deity: "brahma" },
  { key: "yuva", name_en: "Yuva", name_ne: "युव", cycle: 9, deity: "brahma" },
  { key: "dhatri", name_en: "Dhatri", name_ne: "धात्री", cycle: 10, deity: "brahma" },
  { key: "ishvara", name_en: "Ishvara", name_ne: "ईश्वर", cycle: 11, deity: "brahma" },
  { key: "bahudhanya", name_en: "Bahudhanya", name_ne: "बहुधान्य", cycle: 12, deity: "brahma" },
  { key: "pramathi", name_en: "Pramathi", name_ne: "प्रमाथी", cycle: 13, deity: "brahma" },
  { key: "vikrama", name_en: "Vikrama", name_ne: "विक्रम", cycle: 14, deity: "brahma" },
  { key: "vrisha", name_en: "Vrisha", name_ne: "वृष", cycle: 15, deity: "brahma" },
  { key: "chitrabhanu", name_en: "Chitrabhanu", name_ne: "चित्रभानु", cycle: 16, deity: "brahma" },
  { key: "subhanu", name_en: "Subhanu", name_ne: "शुभानु", cycle: 17, deity: "brahma" },
  { key: "tarana", name_en: "Tarana", name_ne: "तारण", cycle: 18, deity: "brahma" },
  { key: "parthiva", name_en: "Parthiva", name_ne: "पार्थिव", cycle: 19, deity: "brahma" },
  { key: "vyaya", name_en: "Vyaya", name_ne: "व्यय", cycle: 20, deity: "brahma" },
  { key: "sarvajit", name_en: "Sarvajit", name_ne: "सर्वजित", cycle: 21, deity: "vishnu" },
  { key: "sarvadhari", name_en: "Sarvadhari", name_ne: "सर्वधारी", cycle: 22, deity: "vishnu" },
  { key: "virodhi", name_en: "Virodhi", name_ne: "विरोधी", cycle: 23, deity: "vishnu" },
  { key: "vikriti", name_en: "Vikriti", name_ne: "विकृति", cycle: 24, deity: "vishnu" },
  { key: "khara", name_en: "Khara", name_ne: "खर", cycle: 25, deity: "vishnu" },
  { key: "nandana", name_en: "Nandana", name_ne: "नन्दन", cycle: 26, deity: "vishnu" },
  { key: "vijaya", name_en: "Vijaya", name_ne: "विजय", cycle: 27, deity: "vishnu" },
  { key: "jaya", name_en: "Jaya", name_ne: "जय", cycle: 28, deity: "vishnu" },
  { key: "manmatha", name_en: "Manmatha", name_ne: "मन्मथ", cycle: 29, deity: "vishnu" },
  { key: "durmukha", name_en: "Durmukha", name_ne: "दुर्मुख", cycle: 30, deity: "vishnu" },
  { key: "hemalambi", name_en: "Hemalambi", name_ne: "हेमालम्बी", cycle: 31, deity: "vishnu" },
  { key: "vilambi", name_en: "Vilambi", name_ne: "विलम्बी", cycle: 32, deity: "vishnu" },
  { key: "vikari", name_en: "Vikari", name_ne: "विकारी", cycle: 33, deity: "vishnu" },
  { key: "sharvari", name_en: "Sharvari", name_ne: "शार्वरी", cycle: 34, deity: "vishnu" },
  { key: "plava", name_en: "Plava", name_ne: "प्लव", cycle: 35, deity: "vishnu" },
  { key: "shubhakrit", name_en: "Shubhakrit", name_ne: "शुभकृत", cycle: 36, deity: "vishnu" },
  { key: "shobhana", name_en: "Shobhana", name_ne: "शोभन", cycle: 37, deity: "vishnu" },
  { key: "krodhi", name_en: "Krodhi", name_ne: "क्रोधी", cycle: 38, deity: "vishnu" },
  { key: "vishvavasu", name_en: "Vishvavasu", name_ne: "विश्वावसु", cycle: 39, deity: "vishnu" },
  { key: "parabhava", name_en: "Parabhava", name_ne: "पराभव", cycle: 40, deity: "vishnu" },
  { key: "plavanga", name_en: "Plavanga", name_ne: "प्लवङ्ग", cycle: 41, deity: "shiva" },
  { key: "kilaka", name_en: "Kilaka", name_ne: "किलक", cycle: 42, deity: "shiva" },
  { key: "saumya", name_en: "Saumya", name_ne: "सौम्य", cycle: 43, deity: "shiva" },
  { key: "sadharana", name_en: "Sadharana", name_ne: "साधारण", cycle: 44, deity: "shiva" },
  { key: "virodhikrit", name_en: "Virodhikrit", name_ne: "विरोधकृत", cycle: 45, deity: "shiva" },
  { key: "paridhavi", name_en: "Paridhavi", name_ne: "परिधावी", cycle: 46, deity: "shiva" },
  { key: "pramadi", name_en: "Pramadi", name_ne: "प्रमादी", cycle: 47, deity: "shiva" },
  { key: "ananda", name_en: "Ananda", name_ne: "आनन्द", cycle: 48, deity: "shiva" },
  { key: "rakshasa", name_en: "Rakshasa", name_ne: "राक्षस", cycle: 49, deity: "shiva" },
  { key: "nala", name_en: "Nala", name_ne: "नल", cycle: 50, deity: "shiva" },
  { key: "pingala", name_en: "Pingala", name_ne: "पिङ्गल", cycle: 51, deity: "shiva" },
  { key: "kalayukta", name_en: "Kalayukta", name_ne: "कालयुक्त", cycle: 52, deity: "shiva" },
  { key: "siddharthi", name_en: "Siddharthi", name_ne: "सिद्धार्थी", cycle: 53, deity: "shiva" },
  { key: "raudra", name_en: "Raudra", name_ne: "रौद्र", cycle: 54, deity: "shiva" },
  { key: "durmati", name_en: "Durmati", name_ne: "दुर्मति", cycle: 55, deity: "shiva" },
  { key: "dundubhi", name_en: "Dundubhi", name_ne: "दुन्दुभि", cycle: 56, deity: "shiva" },
  { key: "rudhirodgari", name_en: "Rudhirodgari", name_ne: "रुधिरोद्गारी", cycle: 57, deity: "shiva" },
  { key: "raktakshi", name_en: "Raktakshi", name_ne: "रक्ताक्षी", cycle: 58, deity: "shiva" },
  { key: "krodhana", name_en: "Krodhana", name_ne: "क्रोधन", cycle: 59, deity: "shiva" },
  { key: "akshaya", name_en: "Akshaya", name_ne: "अक्षय", cycle: 60, deity: "shiva" },
] as const;

/** Precomputed indices for BS 1700–2200 (true Jupiter + Nepal kshaya rules;
 * below ~BS 1855 the tuned corrections give way to plain Jupiter-rashi
 * progression). Generated from the backend samvatsara engine — keep in sync. */
const SAMVATSARA_INDEX_BASE_YEAR = 1700;
const SAMVATSARA_INDICES = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
  29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 41, 42, 43, 45, 46, 47, 48, 49, 50, 52, 53, 54, 55, 56,
  57, 58, 59, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,
  46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 0, 1, 2, 3, 4, 5, 7, 9, 10, 11,
  13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 0, 1, 2, 3, 4,
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
  29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 49, 50, 52, 53, 54, 55,
  56, 57, 58, 59, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,
  46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 0, 1, 2, 3, 4, 5, 6, 7, 9, 10,
  11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 0, 1, 2, 3,
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 48, 49, 50, 52, 52, 53,
  54, 55, 56, 58, 59, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 50, 51, 52, 52, 53, 54, 55, 56, 57, 58, 59, 0, 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 12, 14, 15, 16, 18, 19, 20, 21, 22, 23, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35,
  36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
] as const;

const SAMVATSARA_INDEX_END_YEAR =
  SAMVATSARA_INDEX_BASE_YEAR + SAMVATSARA_INDICES.length - 1;

export function samvatsaraForBsYear(bsYear: number): SamvatsaraInfo | undefined {
  if (bsYear < SAMVATSARA_INDEX_BASE_YEAR || bsYear > SAMVATSARA_INDEX_END_YEAR) {
    return undefined;
  }
  const idx = SAMVATSARA_INDICES[bsYear - SAMVATSARA_INDEX_BASE_YEAR];
  return SAMVATSARA_ENTRIES[idx];
}

export function formatSamvatsaraLabel(
  bsYear: number,
  lang: "ne" | "en" | "hi",
): string | undefined {
  const info = samvatsaraForBsYear(bsYear);
  if (!info) return undefined;
  if (lang === "en") return info.name_en;
  return info.name_ne;
}

export type SamvatsaraPayload = {
  key: string;
  name_en: string;
  name_ne: string;
  cycle: number;
  deity: string;
  index: number;
};

export function samvatsaraFromPayload(payload?: SamvatsaraPayload | null): SamvatsaraInfo | undefined {
  if (!payload?.key) return undefined;
  return SAMVATSARA_ENTRIES.find((entry) => entry.key === payload.key);
}

export function resolveSamvatsaraForBsYear(
  bsYear: number,
  payload?: SamvatsaraPayload | null,
): SamvatsaraInfo | undefined {
  return samvatsaraFromPayload(payload) ?? samvatsaraForBsYear(bsYear);
}

/** Signed patro year used by `samvatsara-table.json` (BS positive, BBS negative). */
export function signedPatroYearForSamvatsara(era: PatroBrowseEra, browseYear: number): number | undefined {
  if (isGregorianBrowseEra(era)) return undefined;
  if (era === "bbs") return -browseYear;
  return browseYear;
}

export function resolveSamvatsaraForPatroYear(
  era: PatroBrowseEra,
  browseYear: number,
  payload?: SamvatsaraPayload | null,
): SamvatsaraInfo | undefined {
  const signed = signedPatroYearForSamvatsara(era, browseYear);
  if (signed == null) return undefined;
  return resolveSamvatsaraForBsYear(signed, payload);
}
