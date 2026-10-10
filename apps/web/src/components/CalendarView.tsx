import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  fetchMonthCalendar,
  fetchFestivals,
  panchangaKeys,
  holidayKeys,
  type CalendarDay,
  type Festival,
} from "@/lib/api";
import {
  BBS_URL_YEAR_MAX,
  BBS_URL_YEAR_MIN,
  BS_FESTIVAL_STACK_MIN_YEAR,
  getPatroLimits,
  maxBrowseYearForEra,
} from "@/lib/patro-year-axis";
import { applyMonthLimits } from "@/hooks/use-patro-capabilities";
import { civilIsoFromDate, parseCivilIso, parseCivilIsoToDate } from "@/lib/patro-day";

import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { PanchangaMonthGrid } from "@/components/panchanga/PanchangaMonthGrid";
import { buildPatroDaySearch } from "@/lib/url-state";
import { getLanguageForEra } from "@/lib/era";
import {
  patroDayFetchFromApiBsParts,
  patroDayFetchFromApiDateAd,
} from "@/lib/patro-day-url";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import {
  applyHolidaysToDays,
  buildAdCalendarGridDays,
  buildCalendarGridDays,
  buildLocalAdMonthDays,
  mergeEnrichedDays,
  shiftAdMonth,
  uniqueBsMonths,
} from "@/lib/local-calendar";
import { shiftPatroBrowseMonth } from "@/lib/patro-year-browse-step";
import { PatroMonthYearNav } from "@/components/patro-date";
import { patroEraShortLabel } from "@/components/patro-date/patro-era-short-label";
import { isGregorianEraBrowse } from "@/components/patro-date/patro-month-labels";
import type { PatroMonthBrowse } from "@/hooks/use-patro-month-browse";
import { BsCalendarGrid } from "./BsCalendarGrid";
import { VedicPatroLoader } from "./VedicPatroLoader";
import { DayDetailModal } from "./DayDetailModal";
import { useLocale } from "@/i18n/locale";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { patroMdRail, patroSegBtn } from "@/lib/patro-classes";
import { ArrowLeftRight } from "lucide-react";

const ASIDE_SIDEBAR_MQ = "(min-width: 1280px)";

function anchorDateForBrowseMonth(
  browseYear: number,
  browseMonth: number,
  days: CalendarDay[],
  todayAd: string | undefined,
  isGregorian: boolean,
): Date {
  if (todayAd && days.some((d) => d.date_ad === todayAd)) {
    return parseCivilIsoToDate(todayAd);
  }
  const first = days.find((d) => d.day === 1) ?? days[0];
  if (first?.date_ad) return parseCivilIsoToDate(first.date_ad);
  if (isGregorian) return new Date(browseYear, browseMonth - 1, 1, 12, 0, 0, 0);
  return todayAd ? parseCivilIsoToDate(todayAd) : new Date();
}

type HomePatroView = "calendar" | "panchanga";
export type { HomePatroView };
export const HOME_PATRO_VIEW_KEY = "dhakalPatroHomePatroView";

export function loadHomePatroView(): HomePatroView {
  const saved = getLocalStorageItem(HOME_PATRO_VIEW_KEY);
  return saved === "panchanga" ? "panchanga" : "calendar";
}

export type CalendarMonthContext = {
  year: number;
  month: number;
  days: CalendarDay[];
  /** Gregorian month the grid is showing — an AD month spans two BS months, so
   *  `year`/`month` above only name the one the 1st falls in. */
  adYear: number;
  adMonth: number;
  /** True when the grid is laid out as a Gregorian month, not a BS one. */
  isAdCalendar: boolean;
};

interface Props {
  onDaySelect?: (day: CalendarDay | null) => void;
  onMonthContextChange?: (ctx: CalendarMonthContext) => void;
  aside?: ReactNode;
  /** Rendered under the calendar / monthly patro grid (home left column). */
  belowPatro?: ReactNode;
  holidays?: ReactNode;
  showMonthHeader?: boolean;
  /** Home: toggle between BS calendar and monthly panchanga patro. */
  enablePatroToggle?: boolean;
  patroView?: HomePatroView;
  onPatroViewChange?: (view: HomePatroView) => void;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  todayAd?: string;
  /** URL-backed month/year/era (Home). */
  monthBrowse: PatroMonthBrowse;
}

export function CalendarView({
  onDaySelect,
  onMonthContextChange,
  aside,
  belowPatro,
  holidays,
  showMonthHeader = true,
  enablePatroToggle = false,
  patroView: patroViewProp,
  onPatroViewChange,
  location,
  onLocationChange,
  todayAd,
  monthBrowse,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useLocale();
  const era = monthBrowse.era;
  const year = monthBrowse.year;
  const month = monthBrowse.month;
  const isGregorian = isGregorianEraBrowse(era);
  const adYear = isGregorian ? year : 0;
  const adMonth = isGregorian ? month : 0;
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [internalPatroView, setInternalPatroView] = useState<HomePatroView>(() =>
    enablePatroToggle ? loadHomePatroView() : "calendar",
  );
  const lastMonthContextKey = useRef("");
  const patroView = patroViewProp ?? internalPatroView;
  const isPanchangaPatro = enablePatroToggle && patroView === "panchanga";
  const asideInSidebar = useMediaQuery(ASIDE_SIDEBAR_MQ);

  const switchPatroView = (next: HomePatroView) => {
    if (patroViewProp === undefined) setInternalPatroView(next);
    onPatroViewChange?.(next);
    if (enablePatroToggle) setLocalStorageItem(HOME_PATRO_VIEW_KEY, next);
    setSelected(null);
    onDaySelect?.(null);
  };

  const localDays = useMemo(() => {
    if (isGregorian && !isPanchangaPatro) return buildLocalAdMonthDays(year, month);
    return [];
  }, [isGregorian, isPanchangaPatro, year, month]);

  const prevBs = useMemo(
    () => shiftPatroBrowseMonth(era, year, month, -1),
    [era, year, month],
  );
  const nextBs = useMemo(
    () => shiftPatroBrowseMonth(era, year, month, 1),
    [era, year, month],
  );

  const canFetchPrev =
    era === "bbs"
      ? !(month === 1 && year >= BBS_URL_YEAR_MAX)
      : era === "bs"
        ? !(month === 1 && year <= 1)
        : true;
  const canFetchNext =
    era === "bbs"
      ? !(month === 12 && year <= BBS_URL_YEAR_MIN)
      : era === "bs"
        ? !(month === 12 && year >= (maxBrowseYearForEra("bs") ?? 1))
        : true;

  const prevAd = useMemo(() => shiftAdMonth(year, month, -1), [year, month]);
  const nextAd = useMemo(() => shiftAdMonth(year, month, 1), [year, month]);

  const requiredBsMonths = useMemo(() => {
    if (isPanchangaPatro) return [{ year, month }];
    if (isGregorian) {
      const months = [{ year, month }, prevAd, nextAd];
      return uniqueBsMonths(months, era);
    }
    const months = [{ year, month }];
    if (canFetchPrev) months.push(prevBs);
    if (canFetchNext) months.push(nextBs);
    return uniqueBsMonths(months, era);
  }, [
    isPanchangaPatro,
    isGregorian,
    year,
    month,
    prevBs,
    nextBs,
    prevAd,
    nextAd,
    canFetchPrev,
    canFetchNext,
    era,
  ]);

  const monthFetchEra = era;

  const monthQueries = useQueries({
    queries: requiredBsMonths.map(({ year: bsYear, month: bsMonth }) => ({
      queryKey: panchangaKeys.month(
        bsYear,
        bsMonth,
        location?.params,
        false,
        false,
        monthFetchEra,
      ),
      queryFn: () =>
        fetchMonthCalendar(bsYear, bsMonth, location?.params, {
          full: false,
          era: monthFetchEra,
        }),
      staleTime: 1000 * 60 * 60,
      enabled: !isPanchangaPatro && bsYear !== 0,
    })),
  });

  const monthQueriesTick = monthQueries
    .map((q) => `${q.dataUpdatedAt ?? 0}:${q.status}`)
    .join("|");

  const enrichedCalendarDays = useMemo(() => {
    const byDate = new Map<string, CalendarDay>();
    for (const query of monthQueries) {
      for (const day of query.data?.calendar ?? []) {
        byDate.set(day.date_ad, day);
      }
    }
    return [...byDate.values()];
    // monthQueriesTick intentionally tracks query freshness without the unstable queries array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthQueriesTick]);

  const monthFetchError = monthQueries.some((q) => q.isError);

  const currentMonthQ = monthQueries.find(
    (_q, i) =>
      requiredBsMonths[i]?.year === year && requiredBsMonths[i]?.month === month,
  );

  useEffect(() => {
    applyMonthLimits(currentMonthQ?.data?.limits);
  }, [currentMonthQ?.data?.limits]);

  const prevMonthQ = !isGregorian
    ? monthQueries.find(
        (_q, i) =>
          requiredBsMonths[i]?.year === prevBs.year &&
          requiredBsMonths[i]?.month === prevBs.month,
      )
    : undefined;

  const nextMonthQ = !isGregorian
    ? monthQueries.find(
        (_q, i) =>
          requiredBsMonths[i]?.year === nextBs.year &&
          requiredBsMonths[i]?.month === nextBs.month,
      )
    : undefined;

  const festivalYears = useMemo(
    () =>
      [...new Set(requiredBsMonths.map((m) => m.year))]
        .filter((y) => y >= BS_FESTIVAL_STACK_MIN_YEAR)
        .sort((a, b) => a - b),
    [requiredBsMonths],
  );

  const festivalQueries = useQueries({
    queries: festivalYears.map((bsYear) => ({
      queryKey: holidayKeys.festivals(bsYear),
      queryFn: () => fetchFestivals(bsYear),
      staleTime: 1000 * 60 * 60,
    })),
  });

  /** Stable tick — `useQueries` returns a new array ref every render. */
  const festivalDataTick = festivalQueries
    .map((q) => `${q.dataUpdatedAt ?? 0}:${q.status}`)
    .join("|");

  const yearFestivals = useMemo(() => {
    const byKey = new Map<string, Festival>();
    for (const query of festivalQueries) {
      for (const festival of query.data?.festivals ?? []) {
        if (!festival.start_date) continue;
        byKey.set(`${festival.id}:${festival.start_date}`, festival);
      }
    }
    return [...byKey.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- festivalQueries ref is unstable; festivalDataTick tracks data
  }, [festivalDataTick]);

  const currentMonthCalendar = useMemo(() => {
    const idx = requiredBsMonths.findIndex(
      (m) => m.year === year && m.month === month,
    );
    if (idx < 0) return [];
    return monthQueries[idx]?.data?.calendar ?? [];
    // monthQueriesTick tracks freshness without unstable query array refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthQueriesTick, year, month, requiredBsMonths]);

  const monthDays = useMemo(() => {
    let result = localDays;
    if (result.length && currentMonthCalendar.length) {
      result = mergeEnrichedDays(result, currentMonthCalendar);
    } else if (!result.length) {
      result = currentMonthCalendar;
    }
    if (yearFestivals.length) {
      result = applyHolidaysToDays(result, yearFestivals, lang);
    }
    return result;
  }, [localDays, currentMonthCalendar, yearFestivals, lang]);

  const gridDays = useMemo(() => {
    if (isPanchangaPatro) return monthDays;
    if (isGregorian) {
      let grid = buildAdCalendarGridDays(year, month, enrichedCalendarDays);
      if (yearFestivals.length) {
        grid = applyHolidaysToDays(grid, yearFestivals, lang);
      }
      return grid;
    }
    let grid = buildCalendarGridDays(
      year,
      month,
      {
        prev: prevMonthQ?.data?.calendar,
        current: monthDays,
        next: nextMonthQ?.data?.calendar,
      },
      era,
    );
    if (yearFestivals.length) {
      grid = applyHolidaysToDays(grid, yearFestivals, lang);
    }
    return grid;
  }, [
    isPanchangaPatro,
    isGregorian,
    year,
    month,
    monthDays,
    enrichedCalendarDays,
    prevMonthQ?.data?.calendar,
    nextMonthQ?.data?.calendar,
    yearFestivals,
    lang,
    era,
  ]);

  useEffect(() => {
    if (!onMonthContextChange) return;
    const first = monthDays[0]?.date_ad ?? "";
    const last = monthDays.at(-1)?.date_ad ?? "";
    const contextAd = first ? parseCivilIso(first) : null;
    const contextYear = isGregorian ? year : year;
    const contextMonth = isGregorian ? month : month;
    const ctxAdYear = isGregorian ? year : (contextAd?.year ?? 0);
    const ctxAdMonth = isGregorian ? month : (contextAd?.month ?? 0);
    const key = `${contextYear}|${contextMonth}|${ctxAdYear}|${ctxAdMonth}|${isGregorian}|${monthDays.length}|${first}|${last}|${festivalDataTick}|${monthQueriesTick}`;
    if (lastMonthContextKey.current === key) return;
    lastMonthContextKey.current = key;
    onMonthContextChange({
      year: contextYear,
      month: contextMonth,
      days: monthDays,
      adYear: ctxAdYear,
      adMonth: ctxAdMonth,
      isAdCalendar: isGregorian,
    });
  }, [
    isGregorian,
    adYear,
    adMonth,
    year,
    month,
    monthDays,
    festivalDataTick,
    monthQueriesTick,
    onMonthContextChange,
  ]);

  const publicHolidayDates = useMemo(
    () =>
      new Set<string>(
        yearFestivals
          .filter((f) => f.is_public_holiday && f.start_date)
          .map((f) => f.start_date as string),
      ),
    [yearFestivals],
  );

  const monthEnriching = localDays.length
    ? Boolean(currentMonthQ?.isFetching && !currentMonthQ?.data)
    : monthQueries.some((q) => q.isFetching && !q.data);

  const isEnriching = monthEnriching && !isPanchangaPatro;

  const panchangaGridDate = useMemo(
    () => anchorDateForBrowseMonth(year, month, monthDays, todayAd, isGregorian),
    [year, month, monthDays, todayAd, isGregorian],
  );

  function selectDay(day: CalendarDay) {
    if (isPanchangaPatro && location) {
      const display = { era, language: getLanguageForEra(era) };
      const state = day.date_ad
        ? patroDayFetchFromApiDateAd(day.date_ad, display)
        : patroDayFetchFromApiBsParts({ year, month, day: day.day }, display);
      navigate({
        to: "/panchanga",
        search: buildPatroDaySearch(location, state),
      });
      return;
    }
    setSelected(day);
    onDaySelect?.(day);
  }

  function goToPanchangaDay(d: Date) {
    if (!location) return;
    const display = { era, language: getLanguageForEra(era) };
    navigate({
      to: "/panchanga",
      search: buildPatroDaySearch(
        location,
        patroDayFetchFromApiDateAd(civilIsoFromDate(d), display),
      ),
    });
  }

  function prev() {
    setSelected(null);
    onDaySelect?.(null);
    monthBrowse.stepMonth(-1);
  }

  function nextMonth() {
    setSelected(null);
    onDaySelect?.(null);
    monthBrowse.stepMonth(1);
  }

  function goToday() {
    monthBrowse.goToday(todayAd);
    setSelected(null);
    onDaySelect?.(null);
  }

  const calendarBlock = isPanchangaPatro ? (
    <PanchangaMonthGrid
      date={panchangaGridDate}
      browseYear={year}
      browseMonth={month}
      locationParams={location?.params}
      onPickDay={goToPanchangaDay}
      gridEra={isGregorian ? "ad" : era === "bbs" ? "bbs" : "bs"}
    />
  ) : (
    <>
      {monthFetchError && (
        <div className="mb-3 rounded-xl border border-warning/25 bg-warning-surface px-3.5 py-2 text-sm text-base text-warning">
          {t("calendar.enrich_error")}
        </div>
      )}

      <div className="relative" aria-busy={isEnriching}>
        {isEnriching && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <VedicPatroLoader size={88} label={t("common.enriching")} />
          </div>
        )}
        <BsCalendarGrid
          key={`${lang}-${isGregorian ? `${adYear}-${adMonth}` : `${year}-${month}`}`}
          days={gridDays}
          publicHolidayDates={publicHolidayDates}
          selectedAdDate={selected?.date_ad}
          onSelectDay={selectDay}
          isEnriching={isEnriching}
          todayAd={todayAd}
          primaryDate={isGregorian ? "ad" : "bs"}
        />
      </div>

      {!asideInSidebar && !aside ? (
        <DayDetailModal
          day={selected}
          bsYear={year}
          bsMonth={month}
          publicHolidayDates={publicHolidayDates}
          location={location}
          onClose={() => {
            setSelected(null);
            onDaySelect?.(null);
          }}
        />
      ) : null}
    </>
  );

  const nextPatroView: HomePatroView = patroView === "calendar" ? "panchanga" : "calendar";
  const calendarTabLabel = isGregorian
    ? t("calendar.mode_ad")
    : patroEraShortLabel(era, t);
  const nextPatroLabel =
    nextPatroView === "panchanga" ? t("calendar.mode_panchanga") : calendarTabLabel;

  const patroModeMobileBtn = enablePatroToggle ? (
    <button
      type="button"
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2 text-sm font-semibold transition-colors hover:text-foreground active:bg-muted"
      onClick={() => switchPatroView(nextPatroView)}
      aria-label={t("calendar.patro_mode_switch")}
    >
      <ArrowLeftRight className="size-3.5" aria-hidden />
      {nextPatroLabel}
    </button>
  ) : null;

  const patroModeDesktop = enablePatroToggle ? (
    <div
      className="hidden shrink-0 gap-0.5 rounded-lg border border-border bg-card p-0.5 md:inline-flex"
      role="radiogroup"
      aria-label={t("calendar.patro_mode_aria")}
    >
      <button
        type="button"
        role="radio"
        aria-checked={patroView === "calendar"}
        className={patroSegBtn(patroView === "calendar")}
        onClick={() => switchPatroView("calendar")}
      >
        {calendarTabLabel}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={patroView === "panchanga"}
        className={patroSegBtn(patroView === "panchanga")}
        onClick={() => switchPatroView("panchanga")}
      >
        {t("calendar.mode_panchanga")}
      </button>
    </div>
  ) : (
    <div className="hidden text-xs text-base uppercase tracking-[0.12em] md:block md:text-right">
      {t("calendar.eyebrow")}
    </div>
  );

  const locationControlDesktop =
    location && onLocationChange ? (
      <LocationSelector
        compact
        location={location}
        onLocationChange={onLocationChange}
        className="h-8 min-w-0 w-auto max-w-[12.5rem]"
      />
    ) : null;

  const mobileHeaderToolbar = patroModeMobileBtn ?? undefined;

  const headerToolbarDesktop = (
    <>
      {patroModeDesktop}
      {locationControlDesktop}
    </>
  );

  function changeMonth(nextMonthValue: number) {
    setSelected(null);
    onDaySelect?.(null);
    monthBrowse.setYearMonth(monthBrowse.year, nextMonthValue);
  }

  function changeYear(nextYearValue: number) {
    setSelected(null);
    onDaySelect?.(null);
    monthBrowse.setYearMonth(nextYearValue, monthBrowse.month);
  }

  const limits = getPatroLimits();
  const headerPrevDisabled =
    monthBrowse.month > 1
      ? false
      : isGregorianEraBrowse(era)
        ? era === "bc"
          ? year <= limits.bcBrowseYearMin
          : year <= limits.adBrowseYearMin
        : era === "bbs"
          ? year <= BBS_URL_YEAR_MIN
          : year <= 1;

  const gregorianMax = maxBrowseYearForEra(era) ?? limits.adBrowseYearMin;
  const headerNextDisabled =
    monthBrowse.month < 12
      ? false
      : isGregorianEraBrowse(era)
        ? year >= gregorianMax
        : era === "bbs"
          ? year >= limits.bbsUrlYearMax
          : year >= limits.ephemerisSignedMax;


  const monthHeader = showMonthHeader ? (
    <div className={cn(patroMdRail, "mb-4 mt-2 max-md:pt-3 md:pt-0")}>
      <PatroMonthYearNav
        era={era}
        year={year}
        month={month}
        todayAd={todayAd}
        onToday={goToday}
        onMonthChange={changeMonth}
        onYearChange={changeYear}
        onBrowseCommit={monthBrowse.commitEraYear}
        onPrev={prev}
        onNext={nextMonth}
        prevDisabled={headerPrevDisabled}
        nextDisabled={headerNextDisabled}
        mobileToolbar={mobileHeaderToolbar}
        location={location}
        onLocationChange={onLocationChange}
        desktopToolbar={headerToolbarDesktop}
      />
    </div>
  ) : null;

  if (!showMonthHeader && !aside && !holidays) {
    return <div>{calendarBlock}</div>;
  }

  if (aside || holidays) {
    return (
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-stretch xl:gap-[15px] max-sm:gap-4">
        <div className="min-w-0">
          {monthHeader}
          {calendarBlock}
          {belowPatro}
        </div>
        {aside ? (
          <div className="flex min-w-0 flex-col xl:min-h-full max-sm:px-2.5">{aside}</div>
        ) : null}
        {holidays}
      </div>
    );
  }

  return (
    <>
      {monthHeader}
      {calendarBlock}
    </>
  );
}
