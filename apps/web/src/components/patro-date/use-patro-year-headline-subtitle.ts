import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePatroDisplayLocale } from "@/hooks/use-patro-display-locale";
import type { Era, Language } from "@/lib/era";
import { fetchFestivals } from "@/lib/api";
import { formatPatroYearGregorianRange } from "@/lib/patro-headline-subtitle";
import { isGregorianEraBrowse } from "./patro-month-labels";

/**
 * Gregorian year span under Vikram year headlines (PatroYearNav).
 * Uses page payload when present; otherwise loads festivals metadata (includes
 * `gregorian_range` for bs/bbs/ad/bc browse years).
 */
export function usePatroYearHeadlineSubtitle(
  era: Era,
  year: number,
  gregorianRange?: { start: string; end: string } | null,
  rangeLabel?: string | null,
  displayLanguage?: Language,
): string | undefined {
  const { lang, digits } = usePatroDisplayLocale(displayLanguage);

  const fromProps = useMemo(() => {
    if (gregorianRange?.start && gregorianRange?.end) {
      return formatPatroYearGregorianRange(
        gregorianRange.start,
        gregorianRange.end,
        lang,
        digits,
      );
    }
    return rangeLabel?.trim() ? rangeLabel : undefined;
  }, [gregorianRange, rangeLabel, lang, digits]);

  const needsApi = fromProps == null && !isGregorianEraBrowse(era);

  const festivalsQ = useQuery({
    queryKey: ["patro-headline-year", era, year] as const,
    queryFn: () => fetchFestivals(year, undefined, era),
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
