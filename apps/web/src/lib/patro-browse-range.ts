import type { Era } from "@/lib/era";
import {
  isValidBrowseYear,
  maxBrowseYearForEra,
  signedPatroYearFromBrowse,
} from "@/lib/patro-year-axis";
import { getBSMonthLength, bsToAD } from "@/lib/bs-calendar";
import { getAdMonthLength } from "@/lib/patro-date-options";
import { formatCivilIsoParts, civilIsoFromDate } from "@/lib/patro-day";

/** Inclusive month–year span in URL browse coordinates (positive year, era carries BC/BBS). */
export type PatroBrowseRange = {
  era: Era;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
};

export function clampBrowseMonth(m: number): number {
  const t = Math.trunc(m);
  if (t < 1) return 1;
  if (t > 12) return 12;
  return t;
}

export function minBrowseYearForEra(_era: Era): number {
  return 1;
}

export function maxBrowseYearForEraOrDefault(era: Era): number {
  return maxBrowseYearForEra(era) ?? 9999;
}

export function clampBrowseYear(era: Era, y: number): number {
  const t = Math.trunc(y);
  const lo = minBrowseYearForEra(era);
  const hi = maxBrowseYearForEraOrDefault(era);
  if (!Number.isFinite(t)) return lo;
  return Math.min(Math.max(t, lo), hi);
}

/** Vikram signed year for month-length lookup (BBS URL year → negative axis). */
export function signedYearForMonthMath(era: Era, browseYear: number): number {
  if (era === "bs" || era === "bbs") {
    return signedPatroYearFromBrowse(era, browseYear);
  }
  return browseYear;
}

export function monthLengthInBrowseEra(era: Era, browseYear: number, month: number): number {
  if (era === "ad" || era === "bc") {
    return getAdMonthLength(browseYear, month);
  }
  return getBSMonthLength(signedYearForMonthMath(era, browseYear), month);
}

export function compareBrowseMonth(
  era: Era,
  y1: number,
  m1: number,
  y2: number,
  m2: number,
): number {
  const a = clampBrowseYear(era, y1) * 12 + clampBrowseMonth(m1);
  const b = clampBrowseYear(era, y2) * 12 + clampBrowseMonth(m2);
  return a - b;
}

export function normalizePatroBrowseRange(raw: PatroBrowseRange): PatroBrowseRange {
  const era = raw.era;
  let startYear = clampBrowseYear(era, raw.startYear);
  const startMonth = clampBrowseMonth(raw.startMonth);
  let endYear = clampBrowseYear(era, raw.endYear);
  let endMonth = clampBrowseMonth(raw.endMonth);
  if (!isValidBrowseYear(era, startYear)) startYear = minBrowseYearForEra(era);
  if (!isValidBrowseYear(era, endYear)) endYear = startYear;
  if (compareBrowseMonth(era, endYear, endMonth, startYear, startMonth) < 0) {
    endYear = startYear;
    endMonth = startMonth;
  }
  return { era, startYear, startMonth, endYear, endMonth };
}

export function isSingleYearRange(r: PatroBrowseRange): boolean {
  return (
    r.startYear === r.endYear &&
    r.startMonth === 1 &&
    r.endMonth === 12
  );
}

export function isSingleMonthRange(r: PatroBrowseRange): boolean {
  return (
    r.startYear === r.endYear &&
    r.startMonth === r.endMonth
  );
}

export type BrowseRangeMonthSegment = {
  browseYear: number;
  month: number;
  days: number;
  globalStart: number;
};

/** Contiguous Vikram/Gregorian months inside the range, with global day offsets. */
export function listBrowseRangeMonthSegments(range: PatroBrowseRange): BrowseRangeMonthSegment[] {
  const r = normalizePatroBrowseRange(range);
  const out: BrowseRangeMonthSegment[] = [];
  let y = r.startYear;
  let m = r.startMonth;
  let global = 0;
  while (compareBrowseMonth(r.era, y, m, r.endYear, r.endMonth) <= 0) {
    const days = monthLengthInBrowseEra(r.era, y, m);
    out.push({ browseYear: y, month: m, days, globalStart: global });
    global += days;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function totalDaysInBrowseRange(range: PatroBrowseRange): number {
  return listBrowseRangeMonthSegments(range).reduce((n, s) => n + s.days, 0);
}

export function globalDayToBrowsePosition(
  range: PatroBrowseRange,
  globalDay: number,
): { year: number; month: number; day: number; segmentIndex: number } {
  const g = Math.max(1, Math.min(globalDay, totalDaysInBrowseRange(range)));
  const segments = listBrowseRangeMonthSegments(range);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (g <= seg.globalStart + seg.days) {
      return {
        year: seg.browseYear,
        month: seg.month,
        day: g - seg.globalStart,
        segmentIndex: i,
      };
    }
  }
  const last = segments[segments.length - 1]!;
  return {
    year: last.browseYear,
    month: last.month,
    day: last.days,
    segmentIndex: segments.length - 1,
  };
}

export function formatBrowseRangeTrigger(
  range: PatroBrowseRange,
  digits: (n: number | string) => string,
  monthLabel: (month: number, era: Era) => string,
): string {
  const r = normalizePatroBrowseRange(range);
  const sameYear = r.startYear === r.endYear;
  const sameMonth = sameYear && r.startMonth === r.endMonth;
  if (sameMonth && r.startMonth === 1 && r.endMonth === 12 && sameYear) {
    return digits(r.startYear);
  }
  if (sameYear && r.startMonth === 1 && r.endMonth === 12) {
    return digits(r.startYear);
  }
  if (sameYear) {
    return `${monthLabel(r.startMonth, r.era)} – ${monthLabel(r.endMonth, r.era)} ${digits(r.startYear)}`;
  }
  return `${monthLabel(r.startMonth, r.era)} ${digits(r.startYear)} – ${monthLabel(r.endMonth, r.era)} ${digits(r.endYear)}`;
}

/** Civil AD `YYYY-MM-DD` for panchanga day fetch from a browse-era position. */
export function browsePositionToAdDateStr(
  era: Era,
  browseYear: number,
  month: number,
  day: number,
): string {
  if (era === "ad") {
    return formatCivilIsoParts(browseYear, month, day);
  }
  if (era === "bc") {
    return formatCivilIsoParts(1 - browseYear, month, day);
  }
  return civilIsoFromDate(bsToAD(signedPatroYearFromBrowse(era, browseYear), month, day));
}

export function browsePositionToGlobalDay(
  range: PatroBrowseRange,
  browseYear: number,
  month: number,
  dayInMonth: number,
): number {
  const segments = listBrowseRangeMonthSegments(range);
  for (const seg of segments) {
    if (seg.browseYear === browseYear && seg.month === month) {
      return seg.globalStart + Math.min(Math.max(1, dayInMonth), seg.days);
    }
  }
  return 1;
}

export function distinctBrowseYearsInRange(range: PatroBrowseRange): number[] {
  const seen = new Set<number>();
  for (const seg of listBrowseRangeMonthSegments(range)) {
    seen.add(seg.browseYear);
  }
  return [...seen].sort((a, b) => a - b);
}
