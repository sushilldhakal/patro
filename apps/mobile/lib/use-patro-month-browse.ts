import { usePatroMonthBrowse as useSharedPatroMonthBrowse } from "@vedic-patro/features/patro-date";
import { getCachedCalendarEraPreference } from "@/lib/patro-era-preference";

/** Month + year browse (shared hook) starting in the onboarding era choice. */
export function usePatroMonthBrowse(initial?: { year?: number; month?: number }) {
  return useSharedPatroMonthBrowse(initial, { era: getCachedCalendarEraPreference() });
}
