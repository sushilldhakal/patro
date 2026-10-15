/**
 * The home calendar's month, shared by the website (`apps/web/src/components/CalendarView.tsx`)
 * and the app (`apps/mobile/app/(tabs)/index.tsx`): which month payloads are
 * fetched (the browsed month and its neighbours, for the grid's leading and
 * trailing days), the festivals laid over them, the month's own days, the
 * grid, and the context the day panel reads.
 */
import { useEffect, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  fetchFestivals,
  holidayKeys,
  locationCacheKey,
  type CalendarDay,
  type Festival,
  type LocationParams,
  type MonthCalendar,
} from "@vedic-patro/api-client";
import type { Era } from "@vedic-patro/domain/era";
import {
  applyHolidaysToDays,
  buildAdCalendarGridDays,
  buildCalendarGridDays,
  buildLocalAdMonthDays,
  mergeEnrichedDays,
  shiftAdMonth,
  uniqueBsMonths,
} from "@vedic-patro/domain/local-calendar";
import { parseCivilIso } from "@vedic-patro/domain/patro-day";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { BBS_URL_YEAR_MAX, BBS_URL_YEAR_MIN, BS_FESTIVAL_STACK_MIN_YEAR, getPatroLimits, maxBrowseYearForEra } from "@vedic-patro/domain/patro-year-axis";
import { shiftPatroBrowseMonth } from "@vedic-patro/domain/patro-year-browse-step";
import { useLocale } from "@vedic-patro/i18n/react";

/** What the day panel needs to know about the month on screen. */
export type CalendarMonthContext = {
  year: number;
  month: number;
  days: CalendarDay[];
  /** Gregorian month the grid shows — an AD month spans two BS months. */
  adYear: number;
  adMonth: number;
  /** The grid is laid out as a Gregorian month, not a BS one. */
  isAdCalendar: boolean;
};

export type FetchMonth = (
  year: number,
  month: number,
  location: LocationParams | undefined,
  options: { era: Era; full?: boolean },
) => Promise<MonthCalendar>;

const HOUR = 1000 * 60 * 60;

export function useHomeMonth({
  era,
  year,
  month,
  location,
  fetchMonth,
  panchangaView = false,
  onLimits,
}: {
  era: Era;
  year: number;
  month: number;
  location?: LocationParams;
  fetchMonth: FetchMonth;
  /** The monthly panchanga view draws its own grid; only the browsed month is fetched. */
  panchangaView?: boolean;
  /** The month payload's browse limits, for the app's year axis. */
  onLimits?: (limits: NonNullable<MonthCalendar["limits"]>) => void;
}) {
  const { lang } = useLocale();
  const isGregorian = isGregorianEraBrowse(era);

  const prevBs = useMemo(() => shiftPatroBrowseMonth(era, year, month, -1), [era, year, month]);
  const nextBs = useMemo(() => shiftPatroBrowseMonth(era, year, month, 1), [era, year, month]);
  const canFetchPrev = era === "bbs" ? !(month === 1 && year >= BBS_URL_YEAR_MAX) : era === "bs" ? !(month === 1 && year <= 1) : true;
  const canFetchNext =
    era === "bbs" ? !(month === 12 && year <= BBS_URL_YEAR_MIN) : era === "bs" ? !(month === 12 && year >= (maxBrowseYearForEra("bs") ?? 1)) : true;

  const requiredMonths = useMemo(() => {
    if (panchangaView) return [{ year, month }];
    if (isGregorian) return uniqueBsMonths([{ year, month }, shiftAdMonth(year, month, -1), shiftAdMonth(year, month, 1)], era);
    const months = [{ year, month }];
    if (canFetchPrev) months.push(prevBs);
    if (canFetchNext) months.push(nextBs);
    return uniqueBsMonths(months, era);
  }, [panchangaView, isGregorian, year, month, prevBs, nextBs, canFetchPrev, canFetchNext, era]);

  const monthQueries = useQueries({
    queries: requiredMonths.map(({ year: y, month: m }) => ({
      queryKey: ["panchanga", "month", era, y, m, locationCacheKey(location), "lite", "intl"] as const,
      queryFn: () => fetchMonth(y, m, location, { full: false, era }),
      staleTime: HOUR,
      enabled: !panchangaView && y !== 0,
    })),
  });
  const monthsTick = monthQueries.map((q) => `${q.dataUpdatedAt ?? 0}:${q.status}`).join("|");
  const at = (y: number, m: number) => monthQueries[requiredMonths.findIndex((r) => r.year === y && r.month === m)];
  const currentQ = at(year, month);
  const prevQ = isGregorian ? undefined : at(prevBs.year, prevBs.month);
  const nextQ = isGregorian ? undefined : at(nextBs.year, nextBs.month);

  const limits = currentQ?.data?.limits;
  useEffect(() => {
    if (limits) onLimits?.(limits);
  }, [limits, onLimits]);

  const enriched = useMemo(() => {
    const byDate = new Map<string, CalendarDay>();
    for (const q of monthQueries) for (const day of q.data?.calendar ?? []) byDate.set(day.date_ad, day);
    return [...byDate.values()];
    // monthsTick tracks the data without the unstable queries array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsTick]);

  const festivalYears = useMemo(
    () => [...new Set(requiredMonths.map((m) => m.year))].filter((y) => y >= BS_FESTIVAL_STACK_MIN_YEAR).sort((a, b) => a - b),
    [requiredMonths],
  );
  const festivalQueries = useQueries({
    queries: festivalYears.map((y) => ({ queryKey: holidayKeys.festivals(y), queryFn: () => fetchFestivals(y), staleTime: HOUR })),
  });
  const festivalsTick = festivalQueries.map((q) => `${q.dataUpdatedAt ?? 0}:${q.status}`).join("|");
  const festivals = useMemo(() => {
    const byKey = new Map<string, Festival>();
    for (const q of festivalQueries) for (const f of q.data?.festivals ?? []) if (f.start_date) byKey.set(`${f.id}:${f.start_date}`, f);
    return [...byKey.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festivalsTick]);

  const currentCalendar = currentQ?.data?.calendar;
  /** The browsed month's own days (no leading/trailing days). */
  const monthDays = useMemo(() => {
    const local = isGregorian && !panchangaView ? buildLocalAdMonthDays(year, month) : [];
    const calendar = currentCalendar ?? [];
    let days = local.length && calendar.length ? mergeEnrichedDays(local, calendar) : local.length ? local : calendar;
    if (festivals.length) days = applyHolidaysToDays(days, festivals, lang);
    return days;
  }, [isGregorian, panchangaView, year, month, currentCalendar, festivals, lang]);

  /** The calendar grid: whole weeks, with the neighbouring months' days. */
  const gridDays = useMemo(() => {
    if (panchangaView) return monthDays;
    let grid = isGregorian
      ? buildAdCalendarGridDays(year, month, enriched)
      : buildCalendarGridDays(year, month, { prev: prevQ?.data?.calendar, current: monthDays, next: nextQ?.data?.calendar }, era);
    if (festivals.length) grid = applyHolidaysToDays(grid, festivals, lang);
    return grid;
  }, [panchangaView, isGregorian, year, month, monthDays, enriched, prevQ?.data?.calendar, nextQ?.data?.calendar, festivals, lang, era]);

  const publicHolidayDates = useMemo(
    () => new Set(festivals.filter((f) => f.is_public_holiday && f.start_date).map((f) => f.start_date as string)),
    [festivals],
  );

  const context = useMemo((): CalendarMonthContext => {
    const first = monthDays[0]?.date_ad;
    const ad = first ? parseCivilIso(first) : null;
    return {
      year,
      month,
      days: monthDays,
      adYear: isGregorian ? year : (ad?.year ?? 0),
      adMonth: isGregorian ? month : (ad?.month ?? 0),
      isAdCalendar: isGregorian,
    };
  }, [year, month, monthDays, isGregorian]);

  const enriching = isGregorian && !panchangaView
    ? Boolean(currentQ?.isFetching && !currentQ?.data)
    : monthQueries.some((q) => q.isFetching && !q.data);

  /* The month arrows stop at the ends of the browsable range. */
  const axis = getPatroLimits();
  const prevDisabled =
    month > 1
      ? false
      : isGregorian
        ? era === "bc"
          ? year <= axis.bcBrowseYearMin
          : year <= axis.adBrowseYearMin
        : era === "bbs"
          ? year <= BBS_URL_YEAR_MIN
          : year <= 1;
  const nextDisabled =
    month < 12
      ? false
      : isGregorian
        ? year >= (maxBrowseYearForEra(era) ?? axis.adBrowseYearMin)
        : era === "bbs"
          ? year >= axis.bbsUrlYearMax
          : year >= axis.ephemerisSignedMax;

  return {
    isGregorian,
    prevDisabled,
    nextDisabled,
    monthDays,
    gridDays,
    festivals,
    publicHolidayDates,
    context,
    /** The browsed month's payload is still on its first load. */
    loading: Boolean(currentQ?.isLoading && !currentQ?.data),
    /** Any month request failed. */
    error: monthQueries.some((q) => q.isError),
    currentError: currentQ?.error,
    retry: () => void currentQ?.refetch(),
    enriching: enriching && !panchangaView,
    canFetchPrev,
    canFetchNext,
  };
}

export type HomeMonth = ReturnType<typeof useHomeMonth>;
