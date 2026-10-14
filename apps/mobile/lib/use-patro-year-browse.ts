import { usePatroYearBrowse as useSharedPatroYearBrowse } from "@vedic-patro/features/patro-date";
import { getCachedCalendarEraPreference } from "@/lib/patro-era-preference";

/** Year browse (shared hook) for yearly pages, starting in the onboarding era choice. */
export function usePatroYearBrowse(initialYear?: number) {
  return useSharedPatroYearBrowse(initialYear == null ? undefined : { year: initialYear }, {
    era: getCachedCalendarEraPreference(),
  });
}
