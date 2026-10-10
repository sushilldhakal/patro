import type { Era } from "@/lib/era";
import type { CalendarDay, Festival, Holiday } from "./api";
import {
  AD_MONTHS_SHORT,
  AD_MONTHS_SHORT_NE,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  BS_MONTHS_SHORT,
  BS_OFFLINE_TABLE_START_YEAR,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  adToBS,
  bsToAD,
  getBSMonthLength,
} from "./bs-calendar";
import { patroBrowseYearWithinEphemeris } from "./patro-year-axis";
import { shiftPatroBrowseMonth } from "./patro-year-browse-step";
import {
  canonicalCivilIso,
  civilIsoDayOfMonth,
  civilIsoWeekday,
  parseCivilIso,
  parseCivilIsoToDate,
  civilIsoFromDate,
} from "./patro-day";

const WEEKDAYS_NE = [
  "आइतवार",
  "सोमवार",
  "मंगलवार",
  "बुधवार",
  "बिहीवार",
  "शुक्रवार",
  "शनिवार",
] as const;

const WEEKDAYS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function formatAdIso(date: Date): string {
  return civilIsoFromDate(date);
}

/**
 * True when the embedded month table can date this BS year offline.
 *
 * BBS (negative) years and anything past the table have no local data — those
 * months come from the API instead. Callers must check rather than let `bsToAD`
 * throw: an uncaught throw here took down the whole `CalendarView` with
 * "केही गडबड भयो" instead of just leaving the grid to load from the server.
 */
export function bsMonthHasOfflineData(year: number, browseEra: Era = "bs"): boolean {
  if (browseEra === "bbs") return false;
  return year >= BS_OFFLINE_TABLE_START_YEAR && year <= BS_SUPPORTED_END_YEAR;
}

/** Instant month skeleton — BS/AD dates and weekdays only, no network. */
export function buildLocalMonthDays(
  year: number,
  month: number,
  browseEra: Era = "bs",
): CalendarDay[] {
  if (!bsMonthHasOfflineData(year, browseEra)) return [];
  const monthLength = getBSMonthLength(year, month);
  const days: CalendarDay[] = [];

  for (let day = 1; day <= monthLength; day += 1) {
    const adDate = bsToAD(year, month, day);
    const dateAd = formatAdIso(adDate);
    const weekdayIdx = civilIsoWeekday(dateAd);
    days.push({
      day,
      date_ad: dateAd,
      weekday: WEEKDAYS_NE[weekdayIdx],
      weekday_en: WEEKDAYS_EN[weekdayIdx],
      weekday_ne: WEEKDAYS_NE[weekdayIdx],
      tithi: "",
      festivals: [],
    });
  }

  return days;
}

/** Instant AD month skeleton — BS day + AD date + weekday, no network. */
export function buildLocalAdMonthDays(adYear: number, adMonth: number): CalendarDay[] {
  const daysInMonth = new Date(adYear, adMonth, 0).getDate();
  const days: CalendarDay[] = [];

  for (let adDay = 1; adDay <= daysInMonth; adDay += 1) {
    const adDate = new Date(adYear, adMonth - 1, adDay);
    const bs = adToBS(adDate);
    const weekdayIdx = adDate.getDay();
    days.push({
      day: bs.day,
      date_ad: formatAdIso(adDate),
      weekday: WEEKDAYS_NE[weekdayIdx],
      weekday_en: WEEKDAYS_EN[weekdayIdx],
      weekday_ne: WEEKDAYS_NE[weekdayIdx],
      tithi: "",
      festivals: [],
    });
  }

  return days;
}

export function shiftAdMonth(
  adYear: number,
  adMonth: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(adYear, adMonth - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** BS months that contain at least one day of the given AD month. */
export function getBsMonthsOverlappingAdMonth(
  adYear: number,
  adMonth: number,
): Array<{ year: number; month: number }> {
  const start = new Date(adYear, adMonth - 1, 1);
  const end = new Date(adYear, adMonth, 0);
  const bsStart = adToBS(start);
  const bsEnd = adToBS(end);
  const result: Array<{ year: number; month: number }> = [];
  const seen = new Set<string>();

  let y = bsStart.year;
  let m = bsStart.month;
  while (true) {
    const key = `${y}-${m}`;
    if (
      !seen.has(key) &&
      y >= BS_SUPPORTED_START_YEAR &&
      y <= BS_SUPPORTED_END_YEAR
    ) {
      seen.add(key);
      result.push({ year: y, month: m });
    }
    if (y === bsEnd.year && m === bsEnd.month) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return result;
}

/**
 * Months worth asking the API for.
 *
 * Gated on the ephemeris window, not on `BS_SUPPORTED_START_YEAR` — that is the
 * *browse picker* floor (60, from `browse_start_year`) and using it here meant no
 * month request was ever issued below BS 60, so those months rendered a grid of
 * day numbers with an empty tithi column even though the server serves them.
 */
export function uniqueBsMonths(
  months: Array<{ year: number; month: number }>,
  browseEra: Era = "bs",
): Array<{ year: number; month: number }> {
  const seen = new Set<string>();
  return months.filter(({ year, month }) => {
    const key = `${year}-${month}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return patroBrowseYearWithinEphemeris(browseEra, year);
  });
}

/** Full 6-week AD grid: trailing/leading days from adjacent Gregorian months. */
export function buildAdCalendarGridDays(
  adYear: number,
  adMonth: number,
  enrichedDays?: CalendarDay[],
): CalendarDay[] {
  const ym = `${String(adYear).padStart(4, "0")}-${String(adMonth).padStart(2, "0")}-`;
  const currentFromServer = (enrichedDays ?? []).filter(
    (d) => d.date_ad.startsWith(ym) && !d.outsideMonth,
  );
  const currentLocal = currentFromServer.length
    ? currentFromServer
    : buildLocalAdMonthDays(adYear, adMonth);
  const first = currentLocal[0];
  if (!first) return currentLocal;

  const startOffset = civilIsoWeekday(first.date_ad);
  const prevAd = shiftAdMonth(adYear, adMonth, -1);
  const nextAd = shiftAdMonth(adYear, adMonth, 1);

  const prevYm = `${String(prevAd.year).padStart(4, "0")}-${String(prevAd.month).padStart(2, "0")}-`;
  const nextYm = `${String(nextAd.year).padStart(4, "0")}-${String(nextAd.month).padStart(2, "0")}-`;
  const prevFromServer = (enrichedDays ?? []).filter((d) => d.date_ad.startsWith(prevYm));
  const nextFromServer = (enrichedDays ?? []).filter((d) => d.date_ad.startsWith(nextYm));

  const prevLocal = prevFromServer.length ? prevFromServer : buildLocalAdMonthDays(prevAd.year, prevAd.month);
  const leading: CalendarDay[] =
    startOffset > 0
      ? prevLocal.slice(-startOffset).map((d) => ({
          ...d,
          outsideMonth: true,
        }))
      : [];

  const current: CalendarDay[] = currentLocal.map((d) => ({
    ...d,
    outsideMonth: false,
  }));

  const totalCells = Math.ceil((startOffset + current.length) / 7) * 7;
  const trailingCount = totalCells - startOffset - current.length;
  const nextLocal = nextFromServer.length ? nextFromServer : buildLocalAdMonthDays(nextAd.year, nextAd.month);
  const trailing: CalendarDay[] = nextLocal.slice(0, trailingCount).map((d) => ({
    ...d,
    outsideMonth: true,
  }));

  let grid: CalendarDay[] = [...leading, ...current, ...trailing];

  if (enrichedDays?.length) {
    grid = mergeEnrichedDays(grid, enrichedDays);
  }

  return grid;
}

export type SecondaryCellDate = {
  /** Day number of the other calendar (BS day in an AD grid, and vice versa). */
  day: number;
  /** Set only where that month turns over, so the number can be placed. */
  monthLabel?: string;
  /** Same label clipped for phone-width cells (~50px), e.g. Shrawan → Shr. */
  monthLabelShort?: string;
};

/**
 * The small counterpart date printed next to the big day number — the BS date
 * inside a Gregorian grid, or the AD date inside a BS grid. The month name only
 * rides along where that month turns over (its day 1) or on the grid's opening
 * cell, so a reader can tell which असार / July the bare numbers belong to
 * without the name repeating in all 42 cells.
 */
export function getSecondaryCellDate(
  day: CalendarDay,
  primaryDate: "bs" | "ad",
  lang = "ne",
  isFirstCell = false,
): SecondaryCellDate {
  const ad = parseCivilIsoToDate(day.date_ad);
  const isEn = lang.slice(0, 2) === "en";

  if (primaryDate === "ad") {
    const bs = adToBS(ad);
    if (!isFirstCell && bs.day !== 1) return { day: bs.day };
    const name = isEn ? BS_MONTH_NAMES[bs.month - 1] : BS_MONTHS_NE[bs.month - 1];
    return {
      day: bs.day,
      monthLabel: name,
      // Only the romanized BS names run long; Devanagari ones already fit.
      // Not a slice: that collapses Ashadh and Ashwin onto the same "Ash".
      monthLabelShort: isEn ? BS_MONTHS_SHORT[bs.month - 1] : name,
    };
  }

  const adDay = civilIsoDayOfMonth(day.date_ad);
  if (!isFirstCell && adDay !== 1) return { day: adDay };
  const { month } = parseCivilIso(day.date_ad);
  const name = isEn
    ? AD_MONTHS_SHORT[month - 1]
    : AD_MONTHS_SHORT_NE[month - 1];
  return { day: adDay, monthLabel: name, monthLabelShort: name };
}

/** BS day label for an AD calendar day subtitle, e.g. 12 Shrawan 2083. */
export function getAdDayBsLabel(
  adYear: number,
  adMonth: number,
  adDay: number,
  lang = "en",
  digitFn: (value: string | number) => string = String,
  /** Abbreviate the English BS name for the mobile header. */
  short = false,
): string {
  const ad = new Date(adYear, adMonth - 1, adDay, 12, 0, 0, 0);
  const bs = adToBS(ad);
  const isEn = lang.slice(0, 2) === "en";
  const monthLabel = isEn
    ? (short ? BS_MONTHS_SHORT : BS_MONTH_NAMES)[bs.month - 1]
    : BS_MONTHS_NE[bs.month - 1];
  return `${digitFn(bs.day)} ${monthLabel} ${digitFn(bs.year)}`;
}

/** BS month span subtitle for an AD month header, e.g. Poush–Magh 2082. */
export function getAdMonthBsSpanLabel(
  adYear: number,
  adMonth: number,
  lang = "en",
  digitFn: (value: string | number) => string = String,
  /** Abbreviate the English BS names ("Ash–Shr") for the mobile header. */
  short = false,
): string {
  const start = new Date(adYear, adMonth - 1, 1);
  const end = new Date(adYear, adMonth, 0);
  const bsStart = adToBS(start);
  const bsEnd = adToBS(end);
  const isEn = lang.slice(0, 2) === "en";
  const enNames = short ? BS_MONTHS_SHORT : BS_MONTH_NAMES;
  const startLabel = isEn ? enNames[bsStart.month - 1] : BS_MONTHS_NE[bsStart.month - 1];
  const endLabel = isEn ? enNames[bsEnd.month - 1] : BS_MONTHS_NE[bsEnd.month - 1];

  if (bsStart.year === bsEnd.year && bsStart.month === bsEnd.month) {
    return `${startLabel} ${digitFn(bsStart.year)}`;
  }
  if (bsStart.year === bsEnd.year) {
    return `${startLabel}–${endLabel} ${digitFn(bsStart.year)}`;
  }
  return `${startLabel} ${digitFn(bsStart.year)}/${endLabel} ${digitFn(bsEnd.year)}`;
}

/** BS Poush-to-Poush span for year browse — e.g. Poush 2083 – Poush 2084 (English). */
export function getBsYearSpanLabel(
  bsYear: number,
  lang = "en",
  digitFn: (value: string | number) => string = String,
): string {
  const isEn = lang.slice(0, 2) === "en";
  const poushLabel = isEn ? BS_MONTH_NAMES[8] : BS_MONTHS_NE[8];
  return `${poushLabel} ${digitFn(bsYear)} – ${poushLabel} ${digitFn(bsYear + 1)}`;
}

export function shiftBsMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  return shiftPatroBrowseMonth("bs", year, month, delta);
}

/**
 * Days of the month being shown: the offline skeleton where there is one, else
 * the API's own days (BBS / out-of-table years).
 */
function currentLocal_(
  year: number,
  month: number,
  apiDays?: CalendarDay[],
  browseEra: Era = "bs",
): CalendarDay[] {
  const local = buildLocalMonthDays(year, month, browseEra);
  if (local.length) return local;
  return (apiDays ?? []).filter((d) => d.date_ad).map((d) => ({ ...d }));
}

/** Full 6-week grid: trailing days from previous BS month + current + leading from next. */
export function buildCalendarGridDays(
  year: number,
  month: number,
  enriched?: {
    prev?: CalendarDay[];
    current?: CalendarDay[];
    next?: CalendarDay[];
  },
  browseEra: Era = "bs",
): CalendarDay[] {
  // A BBS month has no offline table, so `currentLocal` is empty and the API days
  // are the only source. Falling through on an empty local month returned an
  // empty grid and the enriched days were never merged — the calendar rendered
  // as bare weekday headers.
  const currentLocal = currentLocal_(year, month, enriched?.current, browseEra);
  const first = currentLocal[0];
  if (!first) return currentLocal;

  const startOffset = civilIsoWeekday(first.date_ad);
  const prevBs = shiftPatroBrowseMonth(browseEra, year, month, -1);
  const nextBs = shiftPatroBrowseMonth(browseEra, year, month, 1);

  const prevLocal = buildLocalMonthDays(prevBs.year, prevBs.month, browseEra);
  const prevPool =
    prevLocal.length > 0 ? prevLocal : (enriched?.prev ?? []);
  // slice(-0) is slice(0) in JS — returns the whole array, not zero elements
  const leading: CalendarDay[] =
    startOffset > 0
      ? prevPool.slice(-startOffset).map((d) => ({
          ...d,
          outsideMonth: true,
        }))
      : [];

  const current: CalendarDay[] = currentLocal.map((d) => ({
    ...d,
    outsideMonth: false,
  }));

  const totalCells = Math.ceil((startOffset + current.length) / 7) * 7;
  const trailingCount = totalCells - startOffset - current.length;
  const nextLocal = buildLocalMonthDays(nextBs.year, nextBs.month, browseEra);
  const nextPool = nextLocal.length > 0 ? nextLocal : (enriched?.next ?? []);
  const trailing: CalendarDay[] = nextPool.slice(0, trailingCount).map((d) => ({
    ...d,
    outsideMonth: true,
  }));

  let grid: CalendarDay[] = [...leading, ...current, ...trailing];

  if (enriched?.prev?.length) {
    grid = mergeEnrichedDays(grid, enriched.prev);
  }
  if (enriched?.current?.length) {
    grid = mergeEnrichedDays(grid, enriched.current);
  }
  if (enriched?.next?.length) {
    grid = mergeEnrichedDays(grid, enriched.next);
  }

  return grid;
}

export function getLocalMonthMeta(year: number, month: number) {
  const monthLength = getBSMonthLength(year, month);
  const monthStartAd = formatAdIso(bsToAD(year, month, 1));
  const monthEndAd = formatAdIso(bsToAD(year, month, monthLength));

  return {
    year_bs: year,
    month_bs: month,
    month_name: BS_MONTH_NAMES[month - 1],
    month_name_ne: BS_MONTHS_NE[month - 1],
    month_start_ad: monthStartAd,
    month_length: monthLength,
    month_end_ad: monthEndAd,
  };
}

export function getBsMonthAdSpanLabel(year: number, month: number): string {
  const { month_start_ad, month_end_ad } = getLocalMonthMeta(year, month);
  const start = parseCivilIsoToDate(month_start_ad);
  const end = parseCivilIsoToDate(month_end_ad);
  const fmtOpts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric", timeZone: "UTC" };
  const startKey = parseCivilIso(month_start_ad);
  const endKey = parseCivilIso(month_end_ad);
  const sameMonth = startKey.year === endKey.year && startKey.month === endKey.month;
  return sameMonth
    ? start.toLocaleString("en", fmtOpts)
    : `${start.toLocaleString("en", { month: "short", timeZone: "UTC" })}–${end.toLocaleString("en", fmtOpts)}`;
}

/** Compact AD month hint for header, e.g. sep/oct or jun */
export function getBsMonthAdSpanCompact(year: number, month: number): string {
  const { month_start_ad, month_end_ad } = getLocalMonthMeta(year, month);
  const start = parseCivilIso(month_start_ad);
  const end = parseCivilIso(month_end_ad);
  const startKey = start.year * 12 + start.month;
  const endKey = end.year * 12 + end.month;
  const fmt = (p: { month: number }) =>
    AD_MONTHS_SHORT[p.month - 1]!.toLowerCase();
  if (startKey === endKey) return fmt(start);
  return `${fmt(start)}/${fmt(end)}`;
}

/** Day span for header, e.g. असार १ – ३२ */
export function getBsMonthRangeLabel(
  year: number,
  month: number,
  lang = "ne",
  digitFn: (value: string | number) => string = String,
): string {
  const { month_name, month_name_ne, month_length } = getLocalMonthMeta(year, month);
  const isEn = lang.slice(0, 2) === "en";
  const monthLabel = isEn ? month_name : month_name_ne;
  return `${monthLabel} ${digitFn(1)} – ${digitFn(month_length)}`;
}

/** Overlay server panchanga/festival data onto local days (matched by AD date). */
export function mergeEnrichedDays(
  localDays: CalendarDay[],
  enrichedDays: CalendarDay[],
): CalendarDay[] {
  if (!localDays.length && enrichedDays.length) return enrichedDays;
  const byDate = new Map(
    enrichedDays.map((d) => [canonicalCivilIso(d.date_ad), d]),
  );
  return localDays.map((local) => {
    const remote = byDate.get(canonicalCivilIso(local.date_ad));
    if (!remote) return local;
    // Keep grid lead/trail flags — remote month payloads never set outsideMonth.
    return {
      ...local,
      ...remote,
      day: local.day,
      outsideMonth: local.outsideMonth,
    };
  });
}

/** Drop alias / generic vrata rows when a named festival already covers the day. */
const FESTIVAL_SUBSUMED_BY: Record<string, string> = {
  "dilla-punhi": "guru-purnima",
  "vasant-panchami-vrata": "saraswati-puja",
  "putrada-ekadashi-vaishnava": "putrada-ekadashi-smarta",
};

/**
 * Rows that are only a second label for another festival. Unlike the map above
 * these never stand on their own, so they drop even when the canonical row is
 * absent from the same day — a MoHA override can move it (BS 2081 pulled
 * मातातीर्थ औंसी to Baishakh 25) and a day-scoped rule would strand the alias.
 * Mirrors `alias_of` in the API's festival_rules_v3.json.
 */
const FESTIVAL_ALIAS_IDS = new Set([
  "guru-purnima-vrata",
  "navaratri-arambha",
  "amako-mukh-herne-din",
  "sattila-ekadashi",
  "nari-diwas",
]);

function isGenericPurnimaVrataId(id: string): boolean {
  return id.startsWith("purnima-vrata-");
}

function isNamedPurnimaFestivalEntry(h: { id: string; name_en?: string; name_ne?: string }): boolean {
  if (isGenericPurnimaVrataId(h.id) || h.id.endsWith("-vrata")) return false;
  const nameEn = (h.name_en ?? "").toLowerCase();
  const nameNe = h.name_ne ?? "";
  return /purnima/.test(nameEn) || /पूर्णिमा|पुन्ही/.test(nameNe);
}

export function filterRedundantDayFestivals<T extends { id: string; name_en?: string; name_ne?: string }>(
  festivals: T[],
): T[] {
  const rows = festivals.filter((f) => !FESTIVAL_ALIAS_IDS.has(f.id));
  if (rows.length <= 1) return rows;

  const presentIds = new Set(rows.map((f) => f.id));
  const hasNamedPurnima = rows.some(isNamedPurnimaFestivalEntry);

  return rows.filter((festival) => {
    const subsumedBy = FESTIVAL_SUBSUMED_BY[festival.id];
    if (subsumedBy && presentIds.has(subsumedBy)) return false;

    if (festival.id.endsWith("-vrata")) {
      const baseId = festival.id.slice(0, -"-vrata".length);
      if (presentIds.has(baseId)) return false;
    }

    if (hasNamedPurnima && isGenericPurnimaVrataId(festival.id)) return false;
    return true;
  });
}

/** Attach festival/holiday names from a yearly list (lighter than full month API). */
export function applyHolidaysToDays(
  days: CalendarDay[],
  holidays: Array<Holiday | Festival>,
  lang?: string,
): CalendarDay[] {
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  const namesByDate = new Map<string, string[]>();
  /** All known aliases for holidays on a date (ne/en/id) — used to drop duplicates. */
  const aliasesByDate = new Map<string, Set<string>>();

  const byDate = new Map<string, Array<Holiday | Festival>>();
  for (const h of holidays) {
    if (!h.start_date) continue;
    const list = byDate.get(h.start_date) ?? [];
    list.push(h);
    byDate.set(h.start_date, list);
  }

  for (const [startDate, list] of byDate) {
    const filtered = filterRedundantDayFestivals(list);
    for (const h of filtered) {
      const fallbackName = "name" in h ? h.name : undefined;
      const name = isEn
        ? (h.name_en ?? h.name_ne ?? fallbackName ?? h.id)
        : (h.name_ne ?? h.name_en ?? fallbackName ?? h.id);
      const existing = namesByDate.get(startDate) ?? [];
      const aliases = aliasesByDate.get(startDate) ?? new Set<string>();
      for (const alias of [h.name_ne, h.name_en, fallbackName, h.id, name]) {
        if (alias) aliases.add(alias.toLowerCase());
      }
      aliasesByDate.set(startDate, aliases);

      const duplicate = existing.some((entry) => aliases.has(entry.toLowerCase()) || entry === name);
      if (!duplicate) existing.push(name);
      namesByDate.set(startDate, existing);
    }
  }

  return days.map((day) => {
    const extra = namesByDate.get(day.date_ad);
    if (!extra?.length) return day;
    const aliases = aliasesByDate.get(day.date_ad) ?? new Set<string>();
    // Prefer localized holiday-API names; strip month-calendar festival strings
    // that are the same event (often Nepali-only) so English isn't buried.
    const fromDay = (day.festivals ?? []).filter((f) => !aliases.has(f.toLowerCase()));
    return { ...day, festivals: [...extra, ...fromDay] };
  });
}
