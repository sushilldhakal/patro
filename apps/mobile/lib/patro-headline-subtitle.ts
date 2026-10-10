import {
  AD_MONTHS_SHORT,
  AD_MONTHS_SHORT_NE,
  AD_MONTH_NAMES,
  AD_MONTH_NAMES_NE,
} from "@/lib/patro-month-labels";
import { adToBS, bsToAD, BS_MONTHS_NE, getBSMonthLength } from "@vedic-patro/domain/bs-calendar";
import { BS_MONTHS_SHORT } from "@/lib/patro-month-labels";
import { isGregorianBrowseEra, type PatroBrowseEra } from "@/lib/patro-era";
import { parseCivilIso, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { toNepaliDigits } from "@/lib/panchanga-format";

function formatGregorianEraYearLabel(
  civilYear: number,
  lang: string,
  digitFn: (n: number | string) => string,
): string {
  const isEn = lang.slice(0, 2) === "en";
  if (civilYear < 1) {
    const y = 1 - civilYear;
    return isEn ? `${digitFn(y)} BC` : `${digitFn(y)} ई.पू.`;
  }
  return isEn ? `${digitFn(civilYear)} AD` : digitFn(civilYear);
}

function formatPatroAdRangeHeadlineSubtitle(
  startIso: string,
  endIso: string,
  lang: string,
  digitFn: (n: number | string) => string,
): string {
  const start = parseCivilIso(startIso);
  const end = parseCivilIso(endIso);
  const isEn = lang.slice(0, 2) === "en";
  const monthsShort = isEn ? AD_MONTHS_SHORT : AD_MONTHS_SHORT_NE;
  const fmtMonth = (m: number) => monthsShort[m - 1]!;
  const fmtYear = (y: number) => formatGregorianEraYearLabel(y, lang, digitFn);
  const startKey = start.year * 12 + start.month;
  const endKey = end.year * 12 + end.month;

  if (startKey === endKey) return `${fmtMonth(start.month)} ${fmtYear(start.year)}`;
  if (start.year === end.year) return `${fmtMonth(start.month)}/${fmtMonth(end.month)} ${fmtYear(start.year)}`;
  return `${fmtMonth(start.month)} ${fmtYear(start.year)}–${fmtMonth(end.month)} ${fmtYear(end.year)}`;
}

function formatAdMonthBsCrossEraSubtitle(
  adYear: number,
  adMonth: number,
  lang: string,
  digitFn: (n: number | string) => string,
): string {
  const startIso = `${String(adYear).padStart(4, "0")}-${String(adMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(adYear, adMonth, 0).getDate();
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

/** Cross-era line under the headline — BS browse shows AD range; AD browse shows BS range (web parity). */
export function formatPatroMonthCrossEraSubtitle(
  era: PatroBrowseEra,
  year: number,
  month: number,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string | undefined {
  if (isGregorianBrowseEra(era)) {
    return formatAdMonthBsCrossEraSubtitle(year, month, lang, digitFn);
  }
  const start = bsToAD(year, month, 1);
  const end = bsToAD(year, month, getBSMonthLength(year, month));
  const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return formatPatroAdRangeHeadlineSubtitle(startIso, endIso, lang, digitFn);
}

/** Full Gregorian line from API `date_parts.gregorian`. */
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

/** Full civil day line (BCE-safe). */
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

/**
 * The other era's civil day for a day headline: a Gregorian line while
 * browsing BS, a BS line while browsing a Gregorian era (web
 * `formatPatroDayCrossEraSubtitle`).
 */
export function formatPatroDayCrossEraSubtitle(
  dateAdIso: string,
  era: PatroBrowseEra,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  if (isGregorianBrowseEra(era)) {
    const bs = adToBS(parseCivilIsoToDate(dateAdIso));
    const isEn = lang.slice(0, 2) === "en";
    const monthLabel = isEn ? BS_MONTHS_SHORT[bs.month - 1] : BS_MONTHS_NE[bs.month - 1];
    return `${monthLabel} ${digitFn(bs.day)}, ${digitFn(bs.year)} ${isEn ? "BS" : "वि.सं."}`;
  }
  return formatPatroCivilDayLabel(dateAdIso, lang, digitFn);
}

/** Default digit fn for Nepali UI headlines. */
export function patroHeadlineDigits(lang: string): (n: number | string) => string {
  return lang.slice(0, 2) === "en" ? String : toNepaliDigits;
}

const PATRO_PBBS_ABBR_NE = "पू.वि.सं.";
const PATRO_PBBS_ABBR_EN = "PBBS";

/** Positive browse-year label for URL era (web `formatBrowsePatroYear`). */
export function formatBrowsePatroYear(
  era: PatroBrowseEra,
  year: number,
  lang: string,
  digits: (n: number | string) => string = String,
): string {
  if (!Number.isFinite(year) || year < 1) {
    return digits("—");
  }
  const isEn = lang.slice(0, 2) === "en";
  if (era === "ad") return digits(year);
  if (era === "bc") {
    return isEn ? `${digits(year)} BC` : `${digits(year)} ई.पू.`;
  }
  if (era === "bbs") {
    const abbr = isEn ? PATRO_PBBS_ABBR_EN : PATRO_PBBS_ABBR_NE;
    return `${abbr} ${digits(year)}`;
  }
  return isEn ? `BS ${digits(year)}` : `वि.सं. ${digits(year)}`;
}

/** Vikram year headline AD span (web `formatPatroYearGregorianRange`). */
export function formatPatroYearGregorianRange(
  startIso: string,
  endIso: string,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  const start = parseCivilIso(startIso);
  const end = parseCivilIso(endIso);
  const slash = (p: { year: number; month: number; day: number }) => {
    const y = p.year <= 0 ? Math.abs(p.year) : p.year;
    return `${digitFn(y)}/${digitFn(p.month)}/${digitFn(p.day)}`;
  };
  const a = slash(start);
  const b = slash(end);
  if (start.year <= 0 && end.year <= 0) {
    const bc = lang.slice(0, 2) === "en" ? " BC" : " ई.पू.";
    return `${a}-${b}${bc}`;
  }
  const ad = lang.slice(0, 2) === "en" ? " AD" : "";
  return `${a}–${b}${ad}`;
}
