import { useCalendarEra } from "@/hooks/use-calendar-era";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { usePatroMonthBrowse as useSharedPatroMonthBrowse } from "@vedic-patro/features/patro-date";

export { coerceMonthBrowseFromUrl } from "@vedic-patro/domain/calendar/patro-browse-params";
export type { PatroMonthBrowse } from "@vedic-patro/features/patro-date";

/**
 * Month+year browse (shared hook) starting in the site's calendar era. The shared
 * hook moves the browsed month into the new calendar when the calendar system
 * flips; the language never moves it.
 */
export function usePatroMonthBrowse(
  initial?: { year?: number; month?: number },
  options?: { era?: Era },
) {
  const calendarEra = useCalendarEra();
  return useSharedPatroMonthBrowse(initial, { era: options?.era ?? calendarEra });
}
