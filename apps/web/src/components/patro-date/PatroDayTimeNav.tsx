import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import type { Era, Language } from "@/lib/era";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePatroDisplayLocale } from "@/hooks/use-patro-display-locale";
import { adToBS } from "@/lib/bs-calendar";
import { formatGregorianFromDateParts, formatPatroCivilDayLabel, formatPatroDayCrossEraSubtitle } from "@/lib/patro-headline-subtitle";
import { cn } from "@/lib/utils";
import {
  buildAdDayOptions,
  buildBsDayOptions,
  isAtMaxAdDay,
  isAtMaxBsDay,
  isAtMinAdDay,
  isAtMinBsDay,
  pickAdDate,
  pickBrowseVikramDate,
  stepBrowseVikramDay,
} from "@/lib/patro-date-options";
import { signedPatroYearFromBrowse } from "@/lib/patro-year-axis";
import { addCivilDays, civilPartsFromPickerDate, parseCivilIsoToDate, toAdStr } from "@/lib/patro-day";
import { isGregorianEraBrowse } from "./patro-month-labels";
import { PatroDateNavCore } from "./PatroDateNavCore";

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
  toolbar?: ReactNode;
  mobileToolbar?: ReactNode;
  mobileToolbarLower?: ReactNode;
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
  toolbar,
  mobileToolbar,
  mobileToolbarLower,
  className,
  subtitleOverride,
  stepOverride,
}: PatroDayTimeNavProps) {
  const { t } = useTranslation();
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

  /**
   * Era for the headline, which must match the number sitting next to it.
   *
   * The year shown comes from `vikram` once the day resolves, and from `adToBS`
   * before then — and `adToBS` only ever speaks BS. Labelling that fallback with
   * the URL's browse era printed a BS year under a BBS heading ("२०८३ पू.वि.सं."
   * beside 1 August 2026), which is true in no calendar. The nav *controls*
   * still follow `era`, so switching BS↔BBS stays instant.
   */
  const headlineVikramEra: Era | undefined = isGregorian
    ? undefined
    : (vikram?.era ?? "bs");

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

  const dayOptions = isGregorian
    ? buildAdDayOptions(navYear, navMonth, digits)
    : buildBsDayOptions(signedNavYear, navMonth, digits);

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

  const handleBrowseCommit = useCallback(
    (nextEra: Era, nextYear: number) => {
      commitBrowseDay(nextEra, nextYear, navMonth, navDay);
    },
    [commitBrowseDay, navMonth, navDay],
  );

  const locationDesktop =
    toolbar ??
    (location && onLocationChange ? (
      <LocationSelector
        compact
        location={location}
        onLocationChange={onLocationChange}
        className="h-8 min-w-0 w-auto max-w-[12.5rem]"
      />
    ) : null);

  const resolvedMobileToolbar = mobileToolbar;

  return (
    <div
      className={cn(
        "w-full flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <PatroDateNavCore
          era={era}
          vikramEra={headlineVikramEra}
          crossEraSubtitle={subtitleOverride ?? crossEraSubtitle}
          displayLanguage={displayLanguage}
          year={navYear}
          month={navMonth}
          day={navDay}
          dayOptions={dayOptions}
          onDayChange={(nextDay) => pickDate(navYear, navMonth, nextDay)}
          onSelectDate={(y, m, d) => pickDate(y, m, d)}
          dayAriaLabel={t("calendar.day_aria")}
          todayAd={todayAd}
          onToday={() =>
            onDateChange(todayAd ? parseCivilIsoToDate(todayAd) : new Date())
          }
          todayAriaLabel={t("calendar.today_btn")}
          onMonthChange={(nextMonth) => pickDate(navYear, nextMonth, navDay)}
          onYearChange={(nextYear) => pickDate(nextYear, navMonth, navDay)}
          onEraChange={handleEraChange}
          onBrowseCommit={onEraChange ? handleBrowseCommit : undefined}
          onCommitBrowseDay={onEraChange ? commitBrowseDay : undefined}
          monthAriaLabel={t("calendar.month_aria")}
          yearAriaLabel={t("calendar.year_aria")}
          onPrev={stepOverride?.onPrev ?? (() => stepDay(-1))}
          onNext={stepOverride?.onNext ?? (() => stepDay(1))}
          prevDisabled={
            stepOverride
              ? false
              : isGregorian
                ? isAtMinAdDay(navYear, navMonth, navDay)
                : isAtMinBsDay(signedNavYear, navMonth, navDay)
          }
          nextDisabled={
            stepOverride
              ? false
              : isGregorian
                ? isAtMaxAdDay(navYear, navMonth, navDay)
                : isAtMaxBsDay(signedNavYear, navMonth, navDay)
          }
          prevAriaLabel={t("calendar.prev_day")}
          nextAriaLabel={t("calendar.next_day")}
          clock={clock}
          onClockChange={onClockChange}
          hourAriaLabel={clock ? t("panchanga.hour_aria") : undefined}
          minuteAriaLabel={clock ? t("panchanga.minute_aria") : undefined}
          mobileDateTimeDrawer
          mobileToolbar={resolvedMobileToolbar ?? toolbar}
          mobileToolbarLower={mobileToolbarLower}
          location={location}
          onLocationChange={onLocationChange}
        />
      </div>
      {locationDesktop ? (
        <div className="hidden shrink-0 md:flex md:w-auto md:flex-col md:items-end md:pt-0.5">
          {locationDesktop}
        </div>
      ) : null}
    </div>
  );
}
