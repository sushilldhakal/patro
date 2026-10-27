import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useNavigate } from "@tanstack/react-router";
import { useHomeMonth, type CalendarMonthContext } from "@vedic-patro/features/home";
import { fetchMonthCalendar, fetchPanchangaDay, panchangaKeys, type CalendarDay } from "@/lib/api";
import { applyMonthLimits } from "@/hooks/use-patro-capabilities";
import { civilIsoFromDate, parseCivilIsoToDate } from "@vedic-patro/domain/calendar/patro-day";

import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { PanchangaMonthGrid } from "@/components/panchanga/PanchangaMonthGrid";
import { buildPatroDaySearch } from "@/lib/url-state";
import {
  patroDayFetchFromApiBsParts,
  patroDayFetchFromApiDateAd,
} from "@/lib/patro-day-url";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import { PatroCalendarHeader } from "@/components/patro-date";
import { patroEraShortLabel } from "@vedic-patro/domain/calendar/patro-era-label";
import { isGregorianEraBrowse } from "@vedic-patro/domain/calendar/patro-month-labels";
import type { PatroMonthBrowse } from "@/hooks/use-patro-month-browse";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { BsCalendarGrid } from "@vedic-patro/ui/kit/shell";
import { VedicPatroLoader } from "./VedicPatroLoader";
import { DayDetailModal } from "./DayDetailModal";
import { useLocale } from "@/i18n/locale";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@vedic-patro/design-tokens/cn";
import { patroMdRail } from "@/lib/patro-classes";
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
      const display = { era, language: lang };
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
    const display = { era, language: lang };
    navigate({
      to: "/panchanga",
      search: buildPatroDaySearch(
        location,
        patroDayFetchFromApiDateAd(civilIsoFromDate(d), display),
      ),
    });
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
          saitSource={(day) => {
            const state = patroDayFetchFromApiDateAd(day.date_ad, { era, language: lang });
            return { queryKey: panchangaKeys.daySelection(state, location?.params), queryFn: () => fetchPanchangaDay(state, location?.params) };
          }}
          className={calendarClasses.gridWide}
          moon={(info) => <CalendarMoonPhaseIcon tithiIndex={info.tithiIndex} title={info.title} className="size-full" />}
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

  const calendarTabLabel = isGregorian
    ? t("calendar.mode_ad")
    : patroEraShortLabel(era);

  const headerPrevDisabled = homeMonth.prevDisabled;
  const headerNextDisabled = homeMonth.nextDisabled;

  const monthHeader = showMonthHeader ? (
    <div className={cn(patroMdRail, "mb-4 mt-2 max-md:pt-3 md:pt-0")}>
      {/* वि.सं. / ई.सं. lives in the site header (tablet, desktop) and the menu drawer (phone), not here. */}
      <PatroCalendarHeader
      era={era}
          year={year}
          month={month}
          onChange={(next) => {
            setSelected(null);
            onDaySelect?.(null);
            monthBrowse.setYearMonth(next.year, next.month);
          }}
          onEraChange={(nextEra) => monthBrowse.commitEraYear(nextEra, year)}
          segments={
            enablePatroToggle
              ? [
                  { key: "calendar", label: calendarTabLabel, active: patroView === "calendar", onPress: () => switchPatroView("calendar") },
                  { key: "panchanga", label: t("calendar.mode_panchanga"), active: patroView === "panchanga", onPress: () => switchPatroView("panchanga") },
                ]
              : undefined
          }
          segmentsLabel={t("calendar.patro_mode_aria")}
          prevDisabled={headerPrevDisabled}
          nextDisabled={headerNextDisabled}
          location={location}
          onLocationChange={onLocationChange}
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
