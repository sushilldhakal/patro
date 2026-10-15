import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useNavigate } from "@tanstack/react-router";
import { useHomeMonth, type CalendarMonthContext } from "@vedic-patro/features/home";
import { fetchMonthCalendar, type CalendarDay } from "@/lib/api";
import { applyMonthLimits } from "@/hooks/use-patro-capabilities";
import { civilIsoFromDate, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";

import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { PanchangaMonthGrid } from "@/components/panchanga/PanchangaMonthGrid";
import { buildPatroDaySearch } from "@/lib/url-state";
import { getLanguageForEra } from "@vedic-patro/domain/era";
import {
  patroDayFetchFromApiBsParts,
  patroDayFetchFromApiDateAd,
} from "@/lib/patro-day-url";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import { PatroMonthYearNav } from "@/components/patro-date";
import { patroEraShortLabel } from "@vedic-patro/domain/patro-era-label";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import type { PatroMonthBrowse } from "@/hooks/use-patro-month-browse";
import { BsCalendarGrid } from "./BsCalendarGrid";
import { VedicPatroLoader } from "./VedicPatroLoader";
import { DayDetailModal } from "./DayDetailModal";
import { useLocale } from "@/i18n/locale";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@vedic-patro/domain/utils";
import { patroMdRail, patroSegBtn } from "@/lib/patro-classes";
import { ArrowLeftRight } from "lucide-react";
import { minWidthQuery } from "@vedic-patro/design-tokens";
import { calendarClasses } from "@vedic-patro/design-tokens/classes/calendar-classes";

const ASIDE_SIDEBAR_MQ = minWidthQuery("xl");

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

export type { CalendarMonthContext };

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
  const lastMonthDays = useRef<CalendarDay[] | null>(null);
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

  const homeMonth = useHomeMonth({
    era,
    year,
    month,
    location: location?.params,
    fetchMonth: fetchMonthCalendar,
    panchangaView: isPanchangaPatro,
    onLimits: applyMonthLimits,
  });
  const { monthDays, gridDays, publicHolidayDates, context: monthContext } = homeMonth;
  const monthFetchError = homeMonth.error;
  const isEnriching = homeMonth.enriching;

  useEffect(() => {
    if (!onMonthContextChange) return;
    const key = `${monthContext.year}|${monthContext.month}|${monthContext.adYear}|${monthContext.adMonth}|${monthContext.isAdCalendar}|${monthDays.length}`;
    if (lastMonthContextKey.current === key && lastMonthDays.current === monthDays) return;
    lastMonthContextKey.current = key;
    lastMonthDays.current = monthDays;
    onMonthContextChange(monthContext);
  }, [monthContext, monthDays, onMonthContextChange]);

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
    : patroEraShortLabel(era);
  const nextPatroLabel =
    nextPatroView === "panchanga" ? t("calendar.mode_panchanga") : calendarTabLabel;

  const patroModeMobileBtn = enablePatroToggle ? (
    <button
      type="button"
      className={cn("inline-flex cursor-pointer transition-colors hover:text-foreground active:bg-muted", calendarClasses.viewSwap, calendarClasses.viewSwapText)}
      onClick={() => switchPatroView(nextPatroView)}
      aria-label={t("calendar.patro_mode_switch")}
    >
      <ArrowLeftRight className="size-3.5" aria-hidden />
      {nextPatroLabel}
    </button>
  ) : null;

  const patroModeDesktop = enablePatroToggle ? (
    <div
      className={cn("hidden md:inline-flex", calendarClasses.viewSegGroup)}
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
    <div className="hidden text-xs text-base uppercase tracking-eyebrow md:block md:text-right">
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

  const headerPrevDisabled = homeMonth.prevDisabled;
  const headerNextDisabled = homeMonth.nextDisabled;

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
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-stretch xl:gap-3.75 max-sm:gap-4">
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
