import type { Era } from "@vedic-patro/domain/calendar/era";
import type { CalendarDay, Festival, Holiday } from "@vedic-patro/api-client";
import { AD_MONTHS_SHORT, AD_MONTHS_SHORT_NE, BS_MONTH_NAMES, BS_MONTHS_NE, BS_MONTHS_SHORT, adToBS, bsToAD, getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftPatroBrowseMonth } from "@vedic-patro/domain/calendar/patro-year-browse-step";
import { addDaysCivilIso, canonicalCivilIso, civilIsoDayOfMonth, civilIsoWeekday, parseCivilIso, parseCivilIsoToDate } from "@vedic-patro/domain/calendar/patro-day";
import { type SecondaryCellDate, WEEKDAYS_EN, WEEKDAYS_NE, bsMonthHasOfflineData, filterRedundantDayFestivals, formatAdIso, shiftAdMonth } from "@vedic-patro/domain/calendar/local-calendar";

export * from "@vedic-patro/domain/calendar/local-calendar";

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

/** Longest span one holiday may paint; guards against a malformed end date. */
const MAX_HOLIDAY_SPAN_DAYS = 31;

/**
 * Every civil date a public holiday covers — each day from `start_date` through
 * `end_date`, not just the first: Tihar is one entry running Laxmi Puja → Bhai
 * Tika, and all of those days are off.
 */
export function publicHolidayDateSet(festivals: Array<Holiday | Festival>): Set<string> {
  const dates = new Set<string>();
  for (const f of festivals) {
    if (!f.is_public_holiday || !f.start_date) continue;
    const end = f.end_date && f.end_date > f.start_date ? f.end_date : f.start_date;
    let day = f.start_date;
    for (let i = 0; i < MAX_HOLIDAY_SPAN_DAYS && day <= end; i += 1) {
      dates.add(day);
      day = addDaysCivilIso(day, 1);
    }
  }
  return dates;
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
