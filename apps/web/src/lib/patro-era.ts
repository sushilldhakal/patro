/**
 * UI-default calendar era (language-driven) and shared browse search shapes.
 *
 * URL resolution and API era live in `@/lib/era`; browse hooks in
 * `@/hooks/use-patro-url-browse`, `@/hooks/use-patro-month-browse`,
 * `@/hooks/use-patro-year-browse`.
 */
import i18n from "@/i18n";
import { normalizeLang } from "@/i18n/locale";
import { getStoredLanguage } from "@/lib/user-preferences";
import type { Era } from "@/lib/era";

export type { Era, Language } from "@/lib/era";

/** Browse era in share URLs — same four codes as {@link Era}. */
export type CalendarEra = Era;

/** UI language default: English → AD Jan–Dec, Nepali → BS Baisakh–Chaitra. */
export function readCalendarEra(): CalendarEra {
  const lang = normalizeLang(i18n.resolvedLanguage ?? i18n.language);
  if (lang === "en") return "ad";
  if (getStoredLanguage() === "en") return "ad";
  return "bs";
}

export function validatePatroBrowseMonth(rawMonth: number | undefined): number | undefined {
  if (rawMonth == null || rawMonth < 1 || rawMonth > 12) return undefined;
  return rawMonth;
}

/** Era-aware year + month keys shared by month-browse patro routes. */
export interface PatroMonthBrowseSearch {
  era?: CalendarEra;
  language?: import("@/lib/era").Language;
  year?: number;
  month?: number;
}

/** Era-aware year key shared by year-browse patro routes. */
export interface PatroYearBrowseSearch {
  era?: CalendarEra;
  language?: import("@/lib/era").Language;
  year?: number;
}
