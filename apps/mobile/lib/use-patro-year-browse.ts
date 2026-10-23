import { usePatroYearBrowse as useSharedPatroYearBrowse } from "@vedic-patro/features/patro-date";

/**
 * Year browse (shared hook) for yearly pages. It starts in the era of the
 * calendar-system preference (BS / AD) and follows that preference when it changes.
 */
export function usePatroYearBrowse(initialYear?: number) {
  return useSharedPatroYearBrowse(initialYear == null ? undefined : { year: initialYear });
}
