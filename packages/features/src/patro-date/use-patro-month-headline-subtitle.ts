/**
 * The cross-era line under a month headline (e.g. the AD range a BS month
 * spans), shared by both apps' month navs. Worked out locally when it can be;
 * otherwise read from that month's calendar, then from the year's gregorian
 * range. An `override` from the page always wins.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchFestivals, fetchMonthCalendarRaw, locationCacheKey } from "@vedic-patro/api-client";
import type { Era, Language } from "@vedic-patro/domain/era";
import { formatLocaleDigits, normalizeLang } from "@vedic-patro/domain/locale";
import type { PanchangaLocation } from "@vedic-patro/read-models/panchanga-location";
import { canonicalCivilIso } from "@vedic-patro/domain/patro-day";
import {
  formatPatroAdRangeHeadlineSubtitle,
  formatPatroMonthCrossEraSubtitle,
  formatPatroYearGregorianRange,
} from "@vedic-patro/domain/patro-headline-subtitle";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { useLocale } from "@vedic-patro/i18n/react";

export function usePatroMonthHeadlineSubtitle(
  era: Era,
  year: number,
  month: number,
  location: PanchangaLocation | undefined,
  override?: string | null,
  displayLanguage?: Language,
): string | undefined {
  const { lang: uiLang } = useLocale();
  const lang = displayLanguage ? normalizeLang(displayLanguage) : uiLang;
  const digits = (value: string | number | null | undefined) => (value == null ? "" : formatLocaleDigits(value, lang));

  const local = formatPatroMonthCrossEraSubtitle(era, year, month, lang, digits);
  const needsApi = (override == null || override === "") && !local && !isGregorianEraBrowse(era);

  const monthQ = useQuery({
    queryKey: ["patro-headline-month", era, year, month, locationCacheKey(location?.params)] as const,
    queryFn: () => fetchMonthCalendarRaw(year, month, location?.params, { era, full: false }),
    enabled: needsApi,
    staleTime: 1000 * 60 * 30,
  });

  const yearQ = useQuery({
    queryKey: ["patro-headline-year", era, year] as const,
    queryFn: () => fetchFestivals(year, { era }),
    enabled: needsApi,
    staleTime: 1000 * 60 * 30,
  });

  if (override != null && override !== "") return override;
  if (local) return local;
  const data = monthQ.data;
  if (data?.month_start_ad && data.calendar?.length) {
    const first = canonicalCivilIso(data.month_start_ad);
    const lastRaw = data.calendar[data.calendar.length - 1]?.date_ad;
    if (lastRaw) return formatPatroAdRangeHeadlineSubtitle(first, canonicalCivilIso(lastRaw), lang, digits);
  }
  if (data?.calendar?.length) {
    const first = data.calendar[0]!.date_ad;
    const last = data.calendar[data.calendar.length - 1]!.date_ad;
    if (first && last) {
      return formatPatroAdRangeHeadlineSubtitle(canonicalCivilIso(first), canonicalCivilIso(last), lang, digits);
    }
  }
  const gr = yearQ.data?.gregorian_range;
  if (gr?.start && gr?.end) return formatPatroYearGregorianRange(gr.start, gr.end, lang, digits);
  return undefined;
}
