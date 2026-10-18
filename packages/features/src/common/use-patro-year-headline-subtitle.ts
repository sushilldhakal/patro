import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFestivals } from "@vedic-patro/api-client";
import type { Era, Language } from "@vedic-patro/domain/calendar/era";
import { formatPatroYearGregorianRange, patroHeadlineDigits } from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { isGregorianEraBrowse } from "@vedic-patro/domain/calendar/patro-month-labels";
import { useLanguage } from "@vedic-patro/i18n/react";

/**
 * Gregorian year span under a Vikram year headline.
 * Uses the page payload when present; otherwise loads festivals metadata.
 */
export function usePatroYearHeadlineSubtitle(
  era: Era,
  year: number,
  gregorianRange?: { start: string; end: string } | null,
  rangeLabel?: string | null,
  displayLanguage?: Language,
): string | undefined {
  const baseLang = useLanguage();
  const lang = displayLanguage ?? baseLang;
  const digits = patroHeadlineDigits(lang);

  const fromProps = useMemo(() => {
    if (gregorianRange?.start && gregorianRange?.end) {
      return formatPatroYearGregorianRange(gregorianRange.start, gregorianRange.end, lang, digits);
    }
    return rangeLabel?.trim() ? rangeLabel : undefined;
  }, [gregorianRange, rangeLabel, lang, digits]);

  const needsApi = fromProps == null && !isGregorianEraBrowse(era);

  const festivalsQ = useQuery({
    queryKey: ["patro-headline-year", era, year] as const,
    queryFn: () => fetchFestivals(year, { era }),
    enabled: needsApi,
    staleTime: 1000 * 60 * 30,
  });

  return useMemo(() => {
    if (fromProps) return fromProps;
    const gr = festivalsQ.data?.gregorian_range;
    if (gr?.start && gr?.end) {
      return formatPatroYearGregorianRange(gr.start, gr.end, lang, digits);
    }
    return undefined;
  }, [fromProps, festivalsQ.data, lang, digits]);
}
