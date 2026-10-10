/**
 * Cross-era lines under {@link BsHeadline} — one formatter set for day, month,
 * and year date nav (PatroDateNavCore / PatroMonthYearNav / PatroYearNav).
 */

import {
  AD_MONTH_NAMES,
  AD_MONTH_NAMES_NE,
  AD_MONTHS_SHORT,
  AD_MONTHS_SHORT_NE,
  BS_MONTHS_SHORT,
  BS_MONTHS_NE,
  adToBS,
} from "@/lib/bs-calendar";
import type { Era } from "@/lib/era";
import { bsMonthHasOfflineData, getLocalMonthMeta } from "@/lib/local-calendar";
import {
  formatCivilYearLabel,
  formatPatroYearGregorianRange,
  parseCivilIso,
  parseCivilIsoToDate,
} from "@/lib/patro-day";
import { toNepaliDigits } from "@/lib/panchanga-format";

function isGregorianEraBrowse(era: Era): boolean {
  return era === "ad" || era === "bc";
}

export { formatPatroYearGregorianRange };

/** CE → ``2026 AD`` (en) or plain digits (ne); BCE → ``57 BC`` / ``५७ ई.पू.`` */
export function formatGregorianEraYearLabel(
  civilYear: number,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  if (civilYear < 1) {
    return formatCivilYearLabel(civilYear, lang, digitFn);
  }
  const isEn = lang.slice(0, 2) === "en";
  return isEn ? `${digitFn(civilYear)} AD` : digitFn(civilYear);
}

/** Full Gregorian line from API ``date_parts.gregorian`` (always positive year + era). */
export function formatGregorianFromDateParts(
  g: { era?: string; year: number; month: number; day: number },
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  const isEn = lang.slice(0, 2) === "en";
  const monthName = (isEn ? AD_MONTH_NAMES : AD_MONTH_NAMES_NE)[g.month - 1]!;
  const civilYear = g.era === "bc" ? 1 - g.year : g.year;
  const yearLabel = formatGregorianEraYearLabel(civilYear, lang, digitFn);
  return `${digitFn(g.day)} ${monthName} ${yearLabel}`;
}

/** Full civil day for the cross-era line (BCE-safe). */
export function formatPatroDayCrossEraSubtitle(
  dateAdIso: string,
  era: Era,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  if (isGregorianEraBrowse(era)) {
    const bs = adToBS(parseCivilIsoToDate(dateAdIso));
    const isEn = lang.slice(0, 2) === "en";
    const monthLabel = isEn ? BS_MONTHS_SHORT[bs.month - 1] : BS_MONTHS_NE[bs.month - 1];
    return `${monthLabel} ${digitFn(bs.day)}, ${digitFn(bs.year)} ${isEn ? "BS" : "वि.सं."}`;
  }
  return formatPatroCivilDayLabel(dateAdIso, lang, digitFn);
}

export function formatPatroCivilDayLabel(
  iso: string,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  const { year, month, day } = parseCivilIso(iso);
  const isEn = lang.slice(0, 2) === "en";
  const monthName = (isEn ? AD_MONTH_NAMES : AD_MONTH_NAMES_NE)[month - 1]!;
  const yearLabel = formatGregorianEraYearLabel(year, lang, digitFn);
  return `${digitFn(day)} ${monthName} ${yearLabel}`;
}

/** BS month browse → ``जुल/अग २०२६`` / ``Jul/Aug 2026`` (BsHeadline doc). */
export function formatPatroMonthCrossEraSubtitle(
  era: Era,
  year: number,
  month: number,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string | undefined {
  if (isGregorianEraBrowse(era)) {
    return formatAdMonthBsCrossEraSubtitle(year, month, lang, digitFn);
  }
  if (!bsMonthHasOfflineData(year, era)) return undefined;
  const { month_start_ad, month_end_ad } = getLocalMonthMeta(year, month);
  return formatPatroAdRangeHeadlineSubtitle(month_start_ad, month_end_ad, lang, digitFn);
}

export function formatPatroAdRangeHeadlineSubtitle(
  startIso: string,
  endIso: string,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  const start = parseCivilIso(startIso);
  const end = parseCivilIso(endIso);

  const isEn = lang.slice(0, 2) === "en";
  const monthsShort = isEn ? AD_MONTHS_SHORT : AD_MONTHS_SHORT_NE;
  const fmtMonth = (m: number) => monthsShort[m - 1]!;
  const fmtYear = (y: number) => formatGregorianEraYearLabel(y, lang, digitFn);
  const startKey = start.year * 12 + start.month;
  const endKey = end.year * 12 + end.month;

  if (startKey === endKey) {
    return `${fmtMonth(start.month)} ${fmtYear(start.year)}`;
  }
  if (start.year === end.year) {
    return `${fmtMonth(start.month)}/${fmtMonth(end.month)} ${fmtYear(start.year)}`;
  }
  return `${fmtMonth(start.month)} ${fmtYear(start.year)}–${fmtMonth(end.month)} ${fmtYear(end.year)}`;
}

function formatAdMonthBsCrossEraSubtitle(
  adYear: number,
  adMonth: number,
  lang: string,
  digitFn: (n: number | string) => string,
): string {
  const startIso = `${String(adYear).padStart(4, "0")}-${String(adMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(adYear, adMonth, 0)).getUTCDate();
  const endIso = `${String(adYear).padStart(4, "0")}-${String(adMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const startBs = adToBS(parseCivilIsoToDate(startIso));
  const endBs = adToBS(parseCivilIsoToDate(endIso));
  const isEn = lang.slice(0, 2) === "en";
  const monthLabel = (m: number) => (isEn ? BS_MONTHS_SHORT[m - 1] : BS_MONTHS_NE[m - 1])!;
  if (startBs.year === endBs.year && startBs.month === endBs.month) {
    return `${monthLabel(startBs.month)} ${digitFn(startBs.year)} ${isEn ? "BS" : "वि.सं."}`;
  }
  if (startBs.year === endBs.year) {
    return `${monthLabel(startBs.month)}/${monthLabel(endBs.month)} ${digitFn(startBs.year)} ${isEn ? "BS" : "वि.सं."}`;
  }
  return `${monthLabel(startBs.month)} ${digitFn(startBs.year)}–${monthLabel(endBs.month)} ${digitFn(endBs.year)} ${isEn ? "BS" : "वि.सं."}`;
}

/** Panchanga API `display` block (day nav). */
export function crossEraSubtitleFromPanchangaDisplay(
  display?: { gregorian_en?: string; bs_ne?: string } | null,
  era?: Era,
): string | undefined {
  if (!display) return undefined;
  const isGregorian = era != null && isGregorianEraBrowse(era);
  if (isGregorian) return display.bs_ne ?? display.gregorian_en;
  return display.gregorian_en ?? display.bs_ne;
}

/** Default digit fn for Nepali UI. */
export function patroHeadlineDigits(lang: string): (n: number | string) => string {
  return lang.slice(0, 2) === "en" ? String : toNepaliDigits;
}
