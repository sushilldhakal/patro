import { usePatroMonthBrowse as useSharedPatroMonthBrowse } from "@vedic-patro/features/patro-date";

/**
 * Month + year browse (shared hook). It starts in the era of the calendar-system
 * preference (BS / AD) and follows that preference when it changes — never the language.
 */
export function usePatroMonthBrowse(initial?: { year?: number; month?: number }) {
  return useSharedPatroMonthBrowse(initial);
}
