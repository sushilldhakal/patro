import { useCalendarEra } from "@/hooks/use-calendar-era";
import type { Era } from "@vedic-patro/domain/era";
import { usePatroMonthBrowse as useSharedPatroMonthBrowse } from "@vedic-patro/features/patro-date";

export { coerceMonthBrowseFromUrl } from "@vedic-patro/domain/patro-browse-params";
export type { PatroMonthBrowse } from "@vedic-patro/features/patro-date";

function calendarEraAsEra(raw: ReturnType<typeof useCalendarEra>): Era {
  return raw === "bbs" || raw === "bs" || raw === "ad" ? raw : "bs";
}

/** Month+year browse (shared hook) starting in the site's calendar era. */
export function usePatroMonthBrowse(
  initial?: { year?: number; month?: number },
  options?: { era?: Era },
) {
  const langEra = useCalendarEra();
  return useSharedPatroMonthBrowse(initial, { era: options?.era ?? calendarEraAsEra(langEra) });
}
