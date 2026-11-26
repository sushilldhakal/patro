import { useMemo, useState } from "react";
import { adToBS, bsToAD, getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
import type { PanchangaDay } from "@/lib/api";
import { PatroDateNav } from "@/components/patro-date/PatroDateNav";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useLocale } from "@/lib/i18n";
import {
  formatGregorianFromDateParts,
  formatPatroCivilDayLabel,
  patroHeadlineDigits,
} from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { isGregorianEra, type Era } from "@vedic-patro/domain/calendar/era";
import { formatBsDate } from "@vedic-patro/domain/calendar/bs-date-format";
import type { PatroHeaderTab } from "@/components/patro-date/PatroHeaderTabs";

function toAdStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  date: Date;
  onDateChange: (d: Date) => void;
  todayAd: string;
  clock?: string;
  onClockChange?: (clock: string) => void;
  /** Toggle beside the date picker (day-night | calendar day); one phone button when it has two options. */
  tabs?: PatroHeaderTab[];
  tabsLabel?: string;
  className?: string;
  location?: import("@/lib/use-panchanga-location").PanchangaLocation;
  onLocationChange?: (location: import("@/lib/use-panchanga-location").PanchangaLocation) => void;
  era?: Era;
  onEraChange?: (era: Era) => void;
  /** Udaya day payload — drives headline (वि.सं., संवत्सर, AD) from server. */
  wheelData?: PanchangaDay;
  /** Civil AD for headline fallback; defaults from `date`. */
  adDateStr?: string;
  /** Override prev/next (e.g. rashifal weekly/monthly window step). */
  onPrev?: () => void;
  onNext?: () => void;
  /** Replace AD subtitle (e.g. rashifal range strip). */
  crossEraSubtitleOverride?: string;
  /** What the picker chooses: a day (default), a month, or a year (rashifal's monthly / yearly views). */
  precision?: "day" | "month" | "year";
};

/** Panchanga day header — {@link PatroDateNav} mode `year-month-time` (web `PatroDayTimeNav`). */
export function PanchangaDateNav({
  date,
  onDateChange,
  todayAd,
  clock,
  onClockChange,
  tabs,
  tabsLabel,
  className,
  location: locationProp,
  onLocationChange: onLocationChangeProp,
  era: eraProp = "bs",
  onEraChange,
  wheelData,
  adDateStr: adDateStrProp,
  onPrev: onPrevProp,
  onNext: onNextProp,
  crossEraSubtitleOverride,
  precision = "day",
}: Props) {
  const [browseEra, setBrowseEra] = useState<Era>(eraProp);
  const handleEraChange = onEraChange ?? setBrowseEra;
  const fallback = usePanchangaLocation();
  const location = locationProp ?? fallback.location;
  const onLocationChange = onLocationChangeProp ?? fallback.setLocation;
  const { lang } = useLocale();
  const digitFn = patroHeadlineDigits(lang);

  const vikram = wheelData?.date_parts?.vikram;
  const gregorian = wheelData?.date_parts?.gregorian;
  const fallbackBs = adToBS(date);

  // The header follows the app's BS | AD setting: in AD the date parts, picks and month lengths
  // are Gregorian; in BS they are Vikram.
  const ad = isGregorianEra(browseEra);
  const bsYear = vikram?.year ?? fallbackBs.year;
  const bsMonth = vikram?.month ?? fallbackBs.month;
  const bsDay = vikram?.day ?? fallbackBs.day;
  const navYear = ad ? date.getFullYear() : bsYear;
  const navMonth = ad ? date.getMonth() + 1 : bsMonth;
  const navDay = ad ? date.getDate() : bsDay;
  const monthLength = (y: number, m: number) => (ad ? new Date(y, m, 0).getDate() : getBSMonthLength(y, m));
  const toDate = (y: number, m: number, d: number) => (ad ? new Date(y, m - 1, d, 12) : bsToAD(y, m, d));

  const adDateStr = adDateStrProp ?? toAdStr(date);

  const crossEraSubtitle = useMemo(() => {
    if (ad) return formatBsDate({ year: bsYear, month: bsMonth, day: bsDay }, lang, digitFn);
    if (gregorian?.year && gregorian.month && gregorian.day) {
      return formatGregorianFromDateParts(gregorian, lang, digitFn);
    }
    const civil = wheelData?.date_ad ?? adDateStr;
    if (civil) return formatPatroCivilDayLabel(civil.split("T")[0]!, lang, digitFn);
    return formatPatroCivilDayLabel(toAdStr(date), lang, digitFn);
  }, [ad, bsYear, bsMonth, bsDay, gregorian, wheelData?.date_ad, adDateStr, date, lang, digitFn]);

  const stepDay = (delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    onDateChange(next);
  };

  const shared = {
    className,
    era: browseEra,
    onEraChange: handleEraChange,
    year: navYear,
    onYearChange: (y: number) => onDateChange(toDate(y, navMonth, Math.min(navDay, monthLength(y, navMonth)))),
    location,
    onLocationChange,
    onToday: () => onDateChange(new Date(`${todayAd}T12:00:00`)),
    crossEraSubtitle: crossEraSubtitleOverride ?? crossEraSubtitle,
    tabs,
    tabsLabel,
  };
  if (precision === "year") return <PatroDateNav {...shared} mode="year" />;
  if (precision === "month") {
    const browse = (y: number, m: number) => onDateChange(toDate(y, m, Math.min(navDay, monthLength(y, m))));
    return (
      <PatroDateNav
        {...shared}
        mode="year-month"
        month={navMonth}
        onMonthChange={(m) => browse(navYear, m)}
        onBrowse={({ year: y, month: m }) => browse(y, m)}
      />
    );
  }

  return (
    <PatroDateNav
      className={className}
      mode="year-month-time"
      era={browseEra}
      onEraChange={handleEraChange}
      year={navYear}
      onYearChange={shared.onYearChange}
      month={navMonth}
      onMonthChange={(m) => {
        const safeDay = Math.min(navDay, monthLength(navYear, m));
        onDateChange(toDate(navYear, m, safeDay));
      }}
      day={navDay}
      weekday={date.getDay()}
      onDayChange={(d) => onDateChange(toDate(navYear, navMonth, d))}
      onSelectDate={(y, m, d) => {
        const safeDay = Math.min(d, monthLength(y, m));
        onDateChange(toDate(y, m, safeDay));
      }}
      clock={clock}
      onClockChange={onClockChange}
      todayAd={todayAd}
      location={location}
      onLocationChange={onLocationChange}
      onToday={() => onDateChange(new Date(`${todayAd}T12:00:00`))}
      onPrev={onPrevProp ?? (() => stepDay(-1))}
      onNext={onNextProp ?? (() => stepDay(1))}
      crossEraSubtitle={crossEraSubtitleOverride ?? crossEraSubtitle}
      tabs={tabs}
      tabsLabel={tabsLabel}
    />
  );
}
