import { useCallback, useMemo } from "react";
import { PatroHeaderLocation } from "./PatroHeaderLocation";
import { PatroHeaderSwap, PatroHeaderTabs, type PatroHeaderTab } from "./PatroHeaderTabs";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import type { Era, Language } from "@vedic-patro/domain/era";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePatroDisplayLocale } from "@/hooks/use-patro-display-locale";
import { adToBS } from "@vedic-patro/domain/bs-calendar";
import { formatGregorianFromDateParts, formatPatroCivilDayLabel, formatPatroDayCrossEraSubtitle } from "@vedic-patro/domain/patro-headline-subtitle";
import { calendarPickerClasses as pickerClasses } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import {
  isAtMaxAdDay,
  isAtMaxBsDay,
  isAtMinAdDay,
  isAtMinBsDay,
  pickAdDate,
  pickBrowseVikramDate,
  stepBrowseVikramDay,
} from "@/lib/patro-date-options";
import { signedPatroYearFromBrowse } from "@vedic-patro/domain/patro-year-axis";
import { addCivilDays, civilPartsFromPickerDate, parseCivilIsoToDate, toAdStr } from "@vedic-patro/domain/patro-day";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { PatroDayTimeHeader } from "@vedic-patro/ui/kit/shell";

export type PatroDayTimeNavProps = {
  date: Date;
  onDateChange: (d: Date) => void;
  todayAd?: string;
  era?: Era;
  /**
   * Vikram parts as the backend resolved them (`date_parts.vikram`).
   *
   * Takes precedence over the offline `adToBS` table, which is built from
   * Vikram-era month lengths and so cannot date a day before the epoch — a BBS
   * day fell back to year 1 whatever was asked for. The table stays as the
   * pre-response skeleton only.
   */
  vikram?: { era: Era; year: number; month: number; day: number } | null;
  /** API civil day (`date_ad`) — avoids BCE corrupting via `Date` round-trip. */
  civilDateAd?: string | null;
  /** API `date_parts.gregorian` — preferred for the cross-era subtitle. */
  gregorian?: { era?: string; year: number; month: number; day: number } | null;
  displayLanguage?: Language;
  onEraChange?: (era: Era, calendar?: { year: number; month: number; day: number }) => void;
  /** When set, shows hour/minute pickers (panchanga at-time mode). */
  clock?: string;
  onClockChange?: (clock: string) => void;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  /** Tabs beside the header (e.g. day-night | calendar day); on a phone they become one swap button. */
  tabs?: PatroHeaderTab[];
  tabsLabel?: string;
  className?: string;
  /**
   * Replaces the computed single-day subtitle (normally "११ अगस्त २०२६") with
   * a caller-supplied string — a week/month/year range, for pages whose
   * "day" concept is really a window. `BsHeadline`'s own `gregorian` slot is
   * already documented as a "date / range" subtitle, so this needs no change
   * to the rendering underneath, only to what text reaches it.
   */
  subtitleOverride?: string;
  /**
   * Replaces prev/next's single-civil-day step with caller-supplied handlers
   * — e.g. stepping a whole week/BS-month/BS-year at once. Leaves every other
   * page's day-stepping untouched; only a caller that passes this opts in.
   */
  stepOverride?: { onPrev: () => void; onNext: () => void };
};

/** Map legacy UI default (language-only) to full {@link Era}. */
function defaultEraFromUi(raw: ReturnType<typeof useCalendarEra>): Era {
  if (raw === "ad") return "ad";
  if (raw === "bbs") return "bbs";
  return "bs";
}

/**
 * Day + month + year navigation, with optional time — panchanga day view and
 * day-browse pages (graha sthiti, element tables). Pass `clock` for time.
 */
export function PatroDayTimeNav({
  date,
  onDateChange,
  todayAd,
  era: eraProp,
  vikram,
  civilDateAd,
  gregorian,
  displayLanguage,
  onEraChange,
  clock,
  onClockChange,
  location,
  onLocationChange,
  tabs,
  tabsLabel,
  className,
  subtitleOverride,
  stepOverride,
}: PatroDayTimeNavProps) {
  const { lang, digits } = usePatroDisplayLocale(displayLanguage);
  const langEra = useCalendarEra();
  const era = eraProp ?? defaultEraFromUi(langEra);
  const isGregorian = isGregorianEraBrowse(era);

  const civil = civilPartsFromPickerDate(date);
  const dateAd = toAdStr(date);

  const bsFromDate = useMemo(
    () => (isGregorian ? null : (vikram ?? adToBS(date))),
    [isGregorian, vikram, date],
  );

  /**
   * Cross-era subtitle only: which Vikram side the resolved day is on.
   * Nav controls (year label, BS↔BBS toggle) follow the URL browse era so a
   * display toggle updates immediately; `vikram` catches up on the next fetch.
   */
  const resolvedEra: Era = isGregorian ? era : (vikram?.era ?? era);

  const navYear = isGregorian ? civil.year : (bsFromDate?.year ?? civil.year);
  const navMonth = isGregorian ? civil.month : (bsFromDate?.month ?? civil.month);
  const navDay = isGregorian ? civil.day : (bsFromDate?.day ?? civil.day);
  const signedNavYear = isGregorian
    ? navYear
    : signedPatroYearFromBrowse(era, navYear);

  const crossEraSubtitle = useMemo(() => {
    if (isGregorian) {
      return formatPatroDayCrossEraSubtitle(dateAd, era, lang, digits);
    }
    if (gregorian?.year && gregorian.month && gregorian.day) {
      return formatGregorianFromDateParts(
        {
          era: gregorian.era,
          year: gregorian.year,
          month: gregorian.month,
          day: gregorian.day,
        },
        lang,
        digits,
      );
    }
    const adIso = (civilDateAd && civilDateAd.trim()) || dateAd;
    if (adIso) {
      return formatPatroCivilDayLabel(adIso, lang, digits);
    }
    return formatPatroDayCrossEraSubtitle(dateAd, resolvedEra, lang, digits);
  }, [
    isGregorian,
    era,
    gregorian,
    civilDateAd,
    dateAd,
    resolvedEra,
    lang,
    digits,
  ]);

  const pickDate = (y: number, m: number, d: number) =>
    isGregorian
      ? pickAdDate(onDateChange, y, m, d)
      : pickBrowseVikramDate(onDateChange, era, y, m, d, location?.params);

  const commitBrowseDay = useCallback(
    (nextEra: Era, y: number, m: number, d: number) => {
      if (!onEraChange) return;
      onEraChange(nextEra, { year: y, month: m, day: d });
    },
    [onEraChange],
  );

  const stepDay = (delta: number) => {
    if (isGregorian) {
      onDateChange(addCivilDays(date, delta));
      return;
    }
    if (!bsFromDate) return;
    const next = stepBrowseVikramDay(era, navYear, navMonth, navDay, delta);
    if (onEraChange) {
      commitBrowseDay(era, next.year, next.month, next.day);
      return;
    }
    pickBrowseVikramDate(
      onDateChange,
      era,
      next.year,
      next.month,
      next.day,
      location?.params,
    );
  };

  const handleEraChange = useCallback(
    (nextEra: Era) => {
      if (!onEraChange) return;
      const calendar = isGregorian
        ? { year: civil.year, month: civil.month, day: civil.day }
        : { year: navYear, month: navMonth, day: navDay };
      onEraChange(nextEra, calendar);
    },
    [onEraChange, isGregorian, civil.year, civil.month, civil.day, navYear, navMonth, navDay],
  );


  const todayParts = useMemo(() => {
    if (!todayAd) return null;
    const d = parseCivilIsoToDate(todayAd);
    if (isGregorian) {
      const c = civilPartsFromPickerDate(d);
      return { year: c.year, month: c.month, day: c.day };
    }
    return era === "bs" ? adToBS(d) : null;
  }, [todayAd, isGregorian, era]);

  const header = (
        <PatroDayTimeHeader
            className="contents"
            era={era}
            year={navYear}
            month={navMonth}
            day={navDay}
            weekday={date.getDay()}
            today={todayParts}
            clock={clock}
            onClockChange={onClockChange}
            onEraChange={onEraChange ? handleEraChange : undefined}
            onSelect={pickDate}
            onStepDay={(delta) => (stepOverride ? (delta < 0 ? stepOverride.onPrev() : stepOverride.onNext()) : stepDay(delta))}
            onToday={() => onDateChange(todayAd ? parseCivilIsoToDate(todayAd) : new Date())}
            prevDisabled={
              stepOverride ? false : isGregorian ? isAtMinAdDay(navYear, navMonth, navDay) : isAtMinBsDay(signedNavYear, navMonth, navDay)
            }
            nextDisabled={
              stepOverride ? false : isGregorian ? isAtMaxAdDay(navYear, navMonth, navDay) : isAtMaxBsDay(signedNavYear, navMonth, navDay)
            }
            subtitle={subtitleOverride}
            crossEraText={crossEraSubtitle ?? undefined}
          />
  );

  return (
      <div className={cn(pickerClasses.webDtGrid, className)}>
        {header}
        {tabs ? <PatroHeaderTabs tabs={tabs} label={tabsLabel} className={pickerClasses.webDtTabs} /> : null}
        {tabs ? <PatroHeaderSwap tabs={tabs} className={pickerClasses.webDtSwap} /> : null}
        {location && onLocationChange ? (
          <PatroHeaderLocation location={location} onLocationChange={onLocationChange} className={tabs ? pickerClasses.webDtLocation : pickerClasses.webDtLocationSolo} />
        ) : null}
      </div>
  );
}
