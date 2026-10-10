import { useMemo, useState } from "react";
import { adToBS, bsToAD, getBSMonthLength } from "@/lib/bs-calendar";
import type { PanchangaDay } from "@/lib/api";
import { PatroDateNav } from "@/components/patro-date/PatroDateNav";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useLocale } from "@/lib/i18n";
import {
  formatGregorianFromDateParts,
  formatPatroCivilDayLabel,
  patroHeadlineDigits,
} from "@/lib/patro-headline-subtitle";
import type { PatroBrowseEra } from "@/lib/patro-era";
import type { ReactNode } from "react";

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
  toolbar?: ReactNode;
  mobileToolbar?: ReactNode;
  className?: string;
  location?: import("@/lib/use-panchanga-location").PanchangaLocation;
  onLocationChange?: (location: import("@/lib/use-panchanga-location").PanchangaLocation) => void;
  era?: PatroBrowseEra;
  onEraChange?: (era: PatroBrowseEra) => void;
  /** Udaya day payload — drives headline (वि.सं., संवत्सर, AD) from server. */
  wheelData?: PanchangaDay;
  /** Civil AD for headline fallback; defaults from `date`. */
  adDateStr?: string;
  hideNavLocation?: boolean;
  /** Override prev/next (e.g. rashifal weekly/monthly window step). */
  onPrev?: () => void;
  onNext?: () => void;
  /** Replace AD subtitle (e.g. rashifal range strip). */
  crossEraSubtitleOverride?: string;
};

/** Panchanga day header — {@link PatroDateNav} mode `year-month-time` (web `PatroDayTimeNav`). */
export function PanchangaDateNav({
  date,
  onDateChange,
  todayAd,
  clock,
  onClockChange,
  toolbar,
  mobileToolbar,
  className,
  location: locationProp,
  onLocationChange: onLocationChangeProp,
  era: eraProp = "bs",
  onEraChange,
  wheelData,
  adDateStr: adDateStrProp,
  hideNavLocation,
  onPrev: onPrevProp,
  onNext: onNextProp,
  crossEraSubtitleOverride,
}: Props) {
  const [browseEra, setBrowseEra] = useState<PatroBrowseEra>(eraProp);
  const handleEraChange = onEraChange ?? setBrowseEra;
  const fallback = usePanchangaLocation();
  const location = locationProp ?? fallback.location;
  const onLocationChange = onLocationChangeProp ?? fallback.setLocation;
  const { lang } = useLocale();
  const digitFn = patroHeadlineDigits(lang);

  const vikram = wheelData?.date_parts?.vikram;
  const gregorian = wheelData?.date_parts?.gregorian;
  const fallbackBs = adToBS(date);

  const navYear = vikram?.year ?? fallbackBs.year;
  const navMonth = vikram?.month ?? fallbackBs.month;
  const navDay = vikram?.day ?? fallbackBs.day;

  const adDateStr = adDateStrProp ?? toAdStr(date);

  const crossEraSubtitle = useMemo(() => {
    if (gregorian?.year && gregorian.month && gregorian.day) {
      return formatGregorianFromDateParts(gregorian, lang, digitFn);
    }
    const civil = wheelData?.date_ad ?? adDateStr;
    if (civil) return formatPatroCivilDayLabel(civil.split("T")[0]!, lang, digitFn);
    return formatPatroCivilDayLabel(toAdStr(date), lang, digitFn);
  }, [gregorian, wheelData?.date_ad, adDateStr, date, lang, digitFn]);

  const vikramEra = (vikram?.era as PatroBrowseEra | undefined) ?? browseEra;

  const stepDay = (delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    onDateChange(next);
  };

  return (
    <PatroDateNav
      className={className}
      mode="year-month-time"
      era={browseEra}
      onEraChange={handleEraChange}
      year={navYear}
      onYearChange={(y) => {
        const safeDay = Math.min(navDay, getBSMonthLength(y, navMonth));
        onDateChange(bsToAD(y, navMonth, safeDay));
      }}
      month={navMonth}
      onMonthChange={(m) => {
        const safeDay = Math.min(navDay, getBSMonthLength(navYear, m));
        onDateChange(bsToAD(navYear, m, safeDay));
      }}
      day={navDay}
      onDayChange={(d) => onDateChange(bsToAD(navYear, navMonth, d))}
      onSelectDate={(y, m, d) => {
        const safeDay = Math.min(d, getBSMonthLength(y, m));
        onDateChange(bsToAD(y, m, safeDay));
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
      vikramEra={vikramEra}
      samvatsara={wheelData?.samvatsara as import("@/lib/samvatsara").SamvatsaraPayload | undefined}
      toolbar={toolbar}
      mobileToolbar={mobileToolbar}
      hideNavLocation={hideNavLocation}
    />
  );
}
