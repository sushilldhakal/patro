import { useCalendarEra } from "@/hooks/use-calendar-era";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { usePatroYearBrowse as useSharedPatroYearBrowse } from "@vedic-patro/features/patro-date";

export type { PatroYearBrowse } from "@vedic-patro/features/patro-date";

function calendarEraAsEra(raw: ReturnType<typeof useCalendarEra>): Era {
  return raw === "bbs" || raw === "bs" || raw === "ad" ? raw : "bs";
}

/** Year browse (shared hook) starting in the site's calendar era. */
export function usePatroYearBrowse(initial?: { year?: number }, options?: { era?: Era }) {
  const langEra = useCalendarEra();
  return useSharedPatroYearBrowse(initial, { era: options?.era ?? calendarEraAsEra(langEra) });
}
