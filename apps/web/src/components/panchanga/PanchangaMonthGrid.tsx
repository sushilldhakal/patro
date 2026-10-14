import { useMemo } from "react";
import { useQueries, keepPreviousData } from "@tanstack/react-query";
import {
  fetchMonthCalendar,
  panchangaKeys,
  type CalendarDay,
  type LocationParams,
} from "@/lib/api";
import {
  BBS_URL_YEAR_MAX,
  BBS_URL_YEAR_MIN,
} from "@vedic-patro/domain/patro-year-axis";
import type { Era } from "@vedic-patro/domain/era";
import { BS_SUPPORTED_END_YEAR, BS_SUPPORTED_START_YEAR, adToBS } from "@vedic-patro/domain/bs-calendar";
import {
  buildAdCalendarGridDays,
  buildCalendarGridDays,
  getBsMonthsOverlappingAdMonth,
  shiftAdMonth,
  uniqueBsMonths,
} from "@vedic-patro/domain/local-calendar";
import { shiftPatroBrowseMonth } from "@vedic-patro/domain/patro-year-browse-step";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale } from "@/i18n/locale";
import { usePanchangaMonthGrid, type PanchangaMonthCell } from "@vedic-patro/features/home";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { VedicPatroLoader } from "@/components/VedicPatroLoader";
import { VerticalEdgeLabel } from "@/components/VerticalEdgeLabel";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";

interface Props {
  date: Date;
  /** URL-backed Vikram month (Home browse). When set, overrides `date` → BS mapping. */
  browseYear?: number;
  browseMonth?: number;
  locationParams?: LocationParams;
  onPickDay: (d: Date) => void;
  /** Month grid labels and API era for month fetch. */
  gridEra?: "bs" | "bbs" | "ad";
}

function toAdIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PanchangaMonthGrid({
  date,
  browseYear,
  browseMonth,
  locationParams,
  onPickDay,
  gridEra = "bs",
}: Props) {
  const { isEnglish } = useLocale();
  const calendarEra = useCalendarEra();
  const isAdCalendar = gridEra === "ad" || calendarEra === "ad" || isEnglish;
  const monthFetchEra: Era = isAdCalendar ? "ad" : gridEra === "bbs" ? "bbs" : "bs";
  const bsFromDate = adToBS(date);
  const bs = useMemo(
    () =>
      browseYear != null && browseMonth != null
        ? { year: browseYear, month: browseMonth }
        : bsFromDate,
    // `bsFromDate` is a fresh object every render (`adToBS(date)` above); its
    // year/month are the values that actually decide this, so those are
    // listed instead of the object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [browseYear, browseMonth, bsFromDate.year, bsFromDate.month],
  );
  const adYear = date.getFullYear();
  const adMonth = date.getMonth() + 1;
  const selectedAd = toAdIso(date);
  const todayAd = toAdIso(new Date());

  const prevAd = useMemo(() => shiftAdMonth(adYear, adMonth, -1), [adYear, adMonth]);
  const nextAd = useMemo(() => shiftAdMonth(adYear, adMonth, 1), [adYear, adMonth]);
  const prevBs = useMemo(
    () => shiftPatroBrowseMonth(monthFetchEra, bs.year, bs.month, -1),
    [monthFetchEra, bs.year, bs.month],
  );
  const nextBs = useMemo(
    () => shiftPatroBrowseMonth(monthFetchEra, bs.year, bs.month, 1),
    [monthFetchEra, bs.year, bs.month],
  );

  const canFetchPrev = isAdCalendar
    ? true
    : monthFetchEra === "bbs"
      ? !(bs.month === 1 && bs.year >= BBS_URL_YEAR_MAX)
      : prevBs.year >= BS_SUPPORTED_START_YEAR && prevBs.year <= BS_SUPPORTED_END_YEAR;
  const canFetchNext = isAdCalendar
    ? true
    : monthFetchEra === "bbs"
      ? !(bs.month === 12 && bs.year <= BBS_URL_YEAR_MIN)
      : nextBs.year >= BS_SUPPORTED_START_YEAR && nextBs.year <= BS_SUPPORTED_END_YEAR;

  const requiredBsMonths = useMemo(() => {
    if (!isAdCalendar) {
      const months = [{ year: bs.year, month: bs.month }];
      if (canFetchPrev) months.push(prevBs);
      if (canFetchNext) months.push(nextBs);
      return uniqueBsMonths(months, monthFetchEra);
    }
    return uniqueBsMonths(
      [
        ...getBsMonthsOverlappingAdMonth(adYear, adMonth),
        ...getBsMonthsOverlappingAdMonth(prevAd.year, prevAd.month),
        ...getBsMonthsOverlappingAdMonth(nextAd.year, nextAd.month),
      ],
      "bs",
    );
  }, [
    isAdCalendar,
    monthFetchEra,
    bs.year,
    bs.month,
    prevBs,
    nextBs,
    canFetchPrev,
    canFetchNext,
    adYear,
    adMonth,
    prevAd,
    nextAd,
  ]);

  const monthQueries = useQueries({
    queries: requiredBsMonths.map(({ year, month }) => ({
      queryKey: panchangaKeys.month(
        year,
        month,
        locationParams,
        false,
        true,
        monthFetchEra,
      ),
      queryFn: () =>
        fetchMonthCalendar(year, month, locationParams, {
          full: false,
          excludeInternational: true,
          era: monthFetchEra,
        }),
      staleTime: 1000 * 60 * 60,
      placeholderData: keepPreviousData,
    })),
  });

  const monthQueriesTick = monthQueries.map((q) => `${q.dataUpdatedAt ?? 0}:${q.status}`).join("|");

  const enrichedDays = useMemo(() => {
    const byDate = new Map<string, CalendarDay>();
    for (const query of monthQueries) {
      for (const day of query.data?.calendar ?? []) {
        byDate.set(day.date_ad, day);
      }
    }
    return [...byDate.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthQueriesTick]);

  const currentMonthQ = monthQueries.find(
    (_q, i) => requiredBsMonths[i]?.year === bs.year && requiredBsMonths[i]?.month === bs.month,
  );
  const prevMonthQ = !isAdCalendar
    ? monthQueries.find(
        (_q, i) => requiredBsMonths[i]?.year === prevBs.year && requiredBsMonths[i]?.month === prevBs.month,
      )
    : undefined;
  const nextMonthQ = !isAdCalendar
    ? monthQueries.find(
        (_q, i) => requiredBsMonths[i]?.year === nextBs.year && requiredBsMonths[i]?.month === nextBs.month,
      )
    : undefined;

  const days = useMemo(() => {
    if (isAdCalendar) {
      return buildAdCalendarGridDays(adYear, adMonth, enrichedDays);
    }
    return buildCalendarGridDays(
      bs.year,
      bs.month,
      {
        prev: prevMonthQ?.data?.calendar,
        current: currentMonthQ?.data?.calendar,
        next: nextMonthQ?.data?.calendar,
      },
      monthFetchEra,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdCalendar,
    adYear,
    adMonth,
    enrichedDays,
    bs.year,
    bs.month,
    monthFetchEra,
    currentMonthQ?.data?.calendar,
    prevMonthQ?.data?.calendar,
    nextMonthQ?.data?.calendar,
    monthQueriesTick,
  ]);

  const isFetching = monthQueries.some((q) => q.isFetching);
  const isPlaceholderData = monthQueries.some((q) => q.isPlaceholderData);
  const hasData = monthQueries.some((q) => q.data);
  const isLoadingFresh = isFetching && (isPlaceholderData || !hasData);

  const cellClass = ({ isOutside, isToday, isSelected: isSel, isKrishna }: PanchangaMonthCell) => {
    return cn(
      "relative min-h-[118px] p-1.5 text-left cursor-pointer flex flex-col overflow-visible transition-colors border-0",
      "max-md:min-h-0 max-md:h-auto max-md:p-1",
      isOutside
        ? "bg-surface-muted/70 text-foreground/70"
        : isKrishna
          ? "bg-background text-foreground dark:text-foreground dark:bg-background"
          : "bg-white text-foreground dark:text-foreground dark:bg-background",
      isSel && "ring-2 ring-primary ring-inset",
      isToday && !isOutside && !isKrishna && "bg-surface-today",
      isToday && !isOutside && isKrishna && "bg-surface-today ring-2 ring-danger/30 ring-inset",
    );
  };

  const grid = usePanchangaMonthGrid({
    days,
    todayAd,
    selectedAd,
    primaryDate: isAdCalendar ? "ad" : "bs",
  });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-border shadow-sm shadow-ring-soft",
        // No rows yet (first fetch for this location) — reserve space so the
        // loader overlay isn't clipped by a collapsed grid.
        days.length === 0 && "min-h-[420px]",
      )}
      aria-busy={isLoadingFresh}
    >
      {isLoadingFresh && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
        >
          <VedicPatroLoader size={88} />
        </div>
      )}
      <div className="grid grid-cols-7 gap-px  border-b border-border">
        {grid.weekdays.map((w) => {
          const weekend = w.weekend;
          return (
            <div
              key={w.key}
              className="flex min-w-0 items-center justify-center bg-background px-1 py-1.5 min-h-[40px]"
            >
              <span
                className={cn(
                  "truncate text-center text-sm font-semibold leading-tight sm:text-sm",
                  weekend && "text-danger",
                )}
              >
                <span className="max-md:hidden">{w.label}</span>
                <span className="hidden max-md:inline">{w.short}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-px auto-rows-min">
          {grid.cells.map((cell) => {
            const { day, hasSunTimes, tithi: tithiLabel, nakshatra: nakshatraLabel, rashi: rashiLabel, yoga: yogaLabel, karana: karanaLabel, sunTimesLabel } = cell;

            return (
              <button
                key={day.date_ad}
                type="button"
                className={cn(cellClass(cell), hasSunTimes && "md:px-3.5")}
                onClick={() => onPickDay(cell.date)}
              >
                {cell.tithiIndex != null ? (
                  <CalendarMoonPhaseIcon
                    tithiIndex={cell.tithiIndex}
                    title={cell.moonTitle}
                    className="pointer-events-none absolute right-0.5 top-0.5 z-[2] size-3.5 sm:size-4 max-md:right-0 max-md:top-0 md:right-1 md:top-1"
                  />
                ) : null}

                {/* Mobile: stacked left, full text wraps (no ellipsis) */}
                <div className="flex w-full flex-col items-start gap-px md:hidden">
                  <span className="flex flex-wrap items-baseline gap-x-1 leading-none">
                    <span className="font-num text-sm font-bold tabular-nums">
                      {cell.primaryDay}
                    </span>
                    <span
                      className={cn(
                        "font-num font-semibold tabular-nums text-muted-foreground",
                        cell.secondaryNamed ? "text-diagram-xs" : "text-xs",
                      )}
                    >
                      {cell.secondaryLabelShort}
                    </span>
                  </span>
                  <div className="flex w-full flex-col items-start gap-px text-xs font-semibold leading-tight">
                    <span className="w-full [overflow-wrap:anywhere] whitespace-normal text-foreground">{tithiLabel}</span>
                    <span
                      className="w-full [overflow-wrap:anywhere] whitespace-normal text-panchang dark:text-accent"
                      title={nakshatraLabel !== "—" ? nakshatraLabel : undefined}
                    >
                      {cell.nakshatraShort}
                    </span>
                    <span className="w-full [overflow-wrap:anywhere] whitespace-normal text-panchang dark:text-accent">{rashiLabel}</span>
                    <span className="w-full [overflow-wrap:anywhere] whitespace-normal text-foreground">{yogaLabel}</span>
                    <span className="w-full [overflow-wrap:anywhere] whitespace-normal text-foreground">{karanaLabel}</span>
                  </div>
                  <span className="font-num text-diagram-xs font-bold leading-none tabular-nums text-muted-foreground">
                    {sunTimesLabel}
                  </span>
                </div>

                {/* Desktop: centered layout with vertical sun times */}
                <div className="hidden w-full flex-col gap-0.5 md:flex">
                  {cell.sunrise ? (
                    <VerticalEdgeLabel
                      text={cell.sunrise}
                      side="left"
                      className="font-normal tabular-nums text-muted-foreground"
                    />
                  ) : null}
                  {cell.sunset ? (
                    <VerticalEdgeLabel
                      text={cell.sunset}
                      side="right"
                      className="font-normal tabular-nums text-muted-foreground"
                    />
                  ) : null}

                  <p className="m-0 w-full [overflow-wrap:anywhere] whitespace-normal text-center text-xs font-semibold leading-snug text-foreground sm:text-xs">
                    {tithiLabel}
                  </p>
                  <p className="m-0 w-full [overflow-wrap:anywhere] whitespace-normal text-center text-xs font-semibold leading-tight text-panchang dark:text-accent sm:text-xs">
                    {nakshatraLabel}
                  </p>

                  <div className="flex flex-wrap items-baseline justify-center gap-x-1 px-0.5 py-0.5">
                    <span className="font-num text-lg font-bold leading-none tabular-nums sm:text-lg">
                      {cell.primaryDay}
                    </span>
                    <span
                      className={cn(
                        "font-num font-semibold leading-none text-muted-foreground",
                        cell.secondaryNamed ? "text-diagram-xs" : "text-xs",
                      )}
                    >
                      {cell.secondaryLabel}
                    </span>
                  </div>

                  <div className="flex w-full flex-col gap-0.5 text-center text-xs font-bold leading-tight sm:text-xs">
                    <div className="grid w-full grid-cols-2 gap-0.5">
                      <span className="[overflow-wrap:anywhere] whitespace-normal font-bold text-panchang dark:text-accent">{rashiLabel}</span>
                      <span className="[overflow-wrap:anywhere] whitespace-normal font-bold">{karanaLabel}</span>
                    </div>
                    <span className="[overflow-wrap:anywhere] whitespace-normal font-bold">{yogaLabel}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
    </div>
  );
}
