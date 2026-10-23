/**
 * Moves a browsed month between calendar systems when the reader flips the
 * calendar preference: the FIRST DAY of the browsed month is converted with the
 * offline tables, so BS Shrawan 2083 becomes AD Jul 2026 and back.
 *
 * BBS / BC months and dates outside the offline table have no local answer, so
 * those fall back to today's month in the target system instead of guessing.
 */
import { adToBS, bsToAdOrNull, BS_OFFLINE_TABLE_START_YEAR, BS_SUPPORTED_END_YEAR } from "@vedic-patro/domain/calendar/bs-calendar";
import { eraForCalendar, type CalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { defaultMonthBrowseParts } from "@vedic-patro/domain/calendar/patro-browse-params";
import { civilGregorianToUtcMs, parseCivilIso, civilIsoFromDate } from "@vedic-patro/domain/calendar/patro-day";

export type BrowseMonth = { era: Era; year: number; month: number };

function todayIn(target: CalendarSystem): BrowseMonth {
  const era = eraForCalendar(target);
  return { era, ...defaultMonthBrowseParts(era) };
}

/** The month (in `target`) that holds the first day of the browsed month. */
export function convertBrowseMonth(era: Era, year: number, month: number, target: CalendarSystem): BrowseMonth {
  if (era === "bbs" || era === "bc") return todayIn(target);
  const targetEra = eraForCalendar(target);

  if (era === "bs") {
    if (target === "bs") return { era: targetEra, year, month };
    if (year < BS_OFFLINE_TABLE_START_YEAR || year > BS_SUPPORTED_END_YEAR) return todayIn(target);
    const ad = bsToAdOrNull(year, month, 1);
    if (!ad) return todayIn(target);
    const civil = parseCivilIso(civilIsoFromDate(ad));
    return { era: targetEra, year: civil.year, month: civil.month };
  }

  // era === "ad"
  if (target === "ad") return { era: targetEra, year, month };
  const first = new Date(civilGregorianToUtcMs(year, month, 1));
  const bs = adToBS(first);
  // `adToBS` clamps to the table's first month for earlier dates; make sure it round-trips.
  const back = bsToAdOrNull(bs.year, bs.month, bs.day);
  if (!back || civilIsoFromDate(back) !== civilIsoFromDate(first)) return todayIn(target);
  return { era: targetEra, year: bs.year, month: bs.month };
}
