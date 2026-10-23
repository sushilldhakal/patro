/**
 * Year browse state, shared by the website's `hooks/use-patro-year-browse.ts`
 * and the app's `lib/use-patro-year-browse.ts`: a positive year in the active
 * era. The UI language never touches it; when the calendar preference (BS / AD)
 * changes the browsed year is converted to the new system.
 *
 * Each app may pass its own starting era as `options.era`; without one the era
 * follows the calendar preference.
 */
import { useEffect, useState } from "react";
import { eraForCalendar } from "@vedic-patro/domain/calendar/calendar-system";
import { patroBrowseTodayEra, type Era } from "@vedic-patro/domain/calendar/era";
import {
  coerceYearBrowseFromUrl,
  defaultBrowseYear,
  patroBrowseTodayYear,
  positiveInt,
} from "@vedic-patro/domain/calendar/patro-browse-params";
import { useLiveCalendarSystem } from "@vedic-patro/i18n/react";
import { rememberBrowse, rememberedYear } from "@vedic-patro/domain/calendar/remembered-browse";
import { convertBrowseMonth } from "./convert-browse-month";

export function usePatroYearBrowse(initial?: { year?: number }, options?: { era?: Era | null }) {
  // Live read (not the server default while a prerendered page hydrates, which would convert a
  // stored-AD reader's explicit ?era=bs link). A hook, never a bare getCalendarSystem() in render:
  // React Compiler would cache that call and the browse would stop following the preference.
  const calendar = useLiveCalendarSystem();
  const initialEra = options?.era ?? eraForCalendar(calendar);
  const [era, setEraState] = useState<Era>(() => initialEra);
  const [year, setYearState] = useState(() => {
    if (initial?.year != null) {
      return positiveInt(coerceYearBrowseFromUrl(initialEra, initial.year) ?? initial.year);
    }
    // No year in the link: open on the year the reader last browsed to.
    return rememberedYear(initialEra) ?? defaultBrowseYear(initialEra);
  });
  const [syncedCalendar, setSyncedCalendar] = useState(calendar);

  // The calendar preference changed: show the year that holds the same time in the new system.
  // A BS year starts in April, so BS 2083 ↔ AD 2026 converts through Baisakh (BS→AD) and July (AD→BS).
  if (calendar !== syncedCalendar) {
    setSyncedCalendar(calendar);
    const next = convertBrowseMonth(era, year, era === "ad" ? 7 : 1, calendar);
    setEraState(next.era);
    setYearState(next.year);
  }

  useEffect(() => {
    rememberBrowse(era, year);
  }, [era, year]);

  const setYear = (y: number) => setYearState(positiveInt(y));
  const setEra = (next: Era) => setEraState(next);

  const goToday = (todayAd?: string) => {
    const targetEra = patroBrowseTodayEra(era);
    if (targetEra !== era) setEraState(targetEra);
    setYearState(positiveInt(patroBrowseTodayYear(era, todayAd)));
  };

  return { era, year, setYear, setEra, goToday } as const;
}

export type PatroYearBrowse = ReturnType<typeof usePatroYearBrowse>;
