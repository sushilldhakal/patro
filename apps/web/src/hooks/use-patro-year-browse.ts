import { useCalendarEra } from "@/hooks/use-calendar-era";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { usePatroYearBrowse as useSharedPatroYearBrowse } from "@vedic-patro/features/patro-date";

export type { PatroYearBrowse } from "@vedic-patro/features/patro-date";

/**
 * Year browse (shared hook) starting in the site's calendar era. The shared hook
 * moves the browsed year into the new calendar when the calendar system flips;
 * the language never moves it.
 */
export function usePatroYearBrowse(initial?: { year?: number }, options?: { era?: Era }) {
  const calendarEra = useCalendarEra();
  return useSharedPatroYearBrowse(initial, { era: options?.era ?? calendarEra });
}
