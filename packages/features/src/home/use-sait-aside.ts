/**
 * The home aside's saait tab, shared by the website's and the app's
 * `components/home/SaitAsidePanel.tsx`: one row per ceremony with its
 * auspicious days in the month the calendar shows (a Gregorian month in AD
 * mode, gathered from the BS months it straddles), the month name, load
 * state and copy. Each row links to that ceremony's /sait/<category> page.
 */
import { useMemo } from "react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { fetchSaitMonthAll, saitMonthAllKey, type LocationParams } from "@vedic-patro/api-client";
import { AD_MONTH_NAMES, AD_MONTH_NAMES_NE, BS_MONTH_NAMES, BS_MONTHS_NE, bsToAD } from "@vedic-patro/domain/bs-calendar";
import { getBsMonthsOverlappingAdMonth } from "@vedic-patro/domain/local-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { SAIT_CATEGORIES } from "@vedic-patro/domain/sait-data";
import { useLocale } from "@vedic-patro/i18n/react";

export type SaitAsideDay = { day: number; label: string; highlighted: boolean };

export type SaitAsideRow = {
  id: string;
  name: string;
  /** Empty when the ceremony has no day this month. */
  days: SaitAsideDay[];
};

export function useSaitAside({
  year,
  month,
  adYear,
  adMonth,
  highlightDay,
  location,
}: {
  /** BS year and month (1-12) the calendar shows. */
  year: number;
  month: number;
  /**
   * Gregorian month on screen in AD mode: the grid shows (say) July while
   * `year`/`month` name only the BS month the 1st lands in, so the panel lists
   * the Gregorian month instead, in Gregorian day numbers.
   */
  adYear?: number;
  adMonth?: number;
  /** Day to highlight (the selected calendar day), if it is auspicious. */
  highlightDay?: number;
  /** Where the days are computed for (the app's chosen place); the server default otherwise. */
  location?: LocationParams;
}) {
  const { t, lang, digits } = useLocale();
  const isAd = adYear != null && adMonth != null;

  // A Gregorian month straddles two BS months, and the API computes saait a
  // BS month at a time, so fetch every BS month it touches.
  const bsMonths = useMemo(
    () => (adYear != null && adMonth != null ? getBsMonthsOverlappingAdMonth(adYear, adMonth) : [{ year, month }]),
    [adYear, adMonth, year, month],
  );

  const saitQueries = useQueries({
    queries: bsMonths.map((m) => ({
      queryKey: saitMonthAllKey(m.year, m.month, location),
      queryFn: () => fetchSaitMonthAll(m.year, m.month, location),
      staleTime: 1000 * 60 * 60,
      placeholderData: keepPreviousData,
      retry: 1,
    })),
  });

  const loading = saitQueries.some((q) => q.isLoading) && !saitQueries.some((q) => q.data);
  const error = saitQueries.every((q) => q.isError);

  /** Category id → day numbers, in the era the panel is displaying. */
  const cats: Record<string, number[]> = {};
  saitQueries.forEach((q, i) => {
    const source = q.data?.categories;
    const bs = bsMonths[i];
    if (!source || !bs) return;
    for (const [id, days] of Object.entries(source)) {
      for (const day of days) {
        if (!isAd) {
          (cats[id] ??= []).push(day);
          continue;
        }
        // Keep only the BS days that actually land inside the Gregorian month.
        const ad = bsToAD(bs.year, bs.month, day);
        if (ad.getFullYear() === adYear && ad.getMonth() + 1 === adMonth) (cats[id] ??= []).push(ad.getDate());
      }
    }
  });
  for (const days of Object.values(cats)) days.sort((a, b) => a - b);

  const rows: SaitAsideRow[] = SAIT_CATEGORIES.map((cat) => ({
    id: cat.id,
    name: t(`sait.categories.${cat.id}`),
    days: (cats[cat.id] ?? []).map((day) => ({ day, label: digits(day), highlighted: highlightDay === day })),
  }));

  return {
    status: loading ? ("loading" as const) : error ? ("error" as const) : ("ready" as const),
    retry: () => saitQueries.forEach((q) => void q.refetch()),
    monthName: isAd
      ? bilingualText(lang, AD_MONTH_NAMES_NE[adMonth - 1], AD_MONTH_NAMES[adMonth - 1])
      : bilingualText(lang, BS_MONTHS_NE[month - 1], BS_MONTH_NAMES[month - 1]),
    rows,
    /** Shown under the rows when no ceremony has a day this month. */
    empty: rows.some((r) => r.days.length > 0) ? null : t("sait.no_month_dates"),
    copy: {
      error: t("sait.no_data"),
      retry: t("ui.common.retry"),
      none: "—",
    },
  };
}
