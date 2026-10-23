/**
 * UI-default calendar era (calendar-preference driven) and shared browse search shapes.
 *
 * URL resolution and API era live in `@/lib/era`; browse hooks in
 * `@/hooks/use-patro-url-browse`, `@/hooks/use-patro-month-browse`,
 * `@/hooks/use-patro-year-browse`.
 */
import i18n from "@/i18n";
import { normalizeLang } from "@/i18n/locale";
import { eraForCalendar, getCalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import type { Era } from "@vedic-patro/domain/calendar/era";

import type { Language } from "@vedic-patro/domain/calendar/era";

export type { Era, Language } from "@vedic-patro/domain/calendar/era";

/** Browse era in share URLs — same four codes as {@link Era}. */
export type CalendarEra = Era;

/** Calendar-preference default era: BS → Baisakh–Chaitra, AD → Jan–Dec. Independent of the UI language. */
export function readCalendarEra(): CalendarEra {
  return eraForCalendar(getCalendarSystem());
}

/**
 * The UI language (the language the reader picked), for URLs and API requests.
 * Never derived from the era: language and calendar are independent preferences.
 */
export function readUiLanguage(): Language {
  return normalizeLang(i18n.language) === "en" ? "en" : "ne";
}

export function validatePatroBrowseMonth(rawMonth: number | undefined): number | undefined {
  if (rawMonth == null || rawMonth < 1 || rawMonth > 12) return undefined;
  return rawMonth;
}

/** Era-aware year + month keys shared by month-browse patro routes. */
export interface PatroMonthBrowseSearch {
  era?: CalendarEra;
  language?: import("@vedic-patro/domain/calendar/era").Language;
  year?: number;
  month?: number;
}

/** Era-aware year key shared by year-browse patro routes. */
export interface PatroYearBrowseSearch {
  era?: CalendarEra;
  language?: import("@vedic-patro/domain/calendar/era").Language;
  year?: number;
}
