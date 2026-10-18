/**
 * The monthly panchanga grid's cells, shared by the website's
 * `components/panchanga/PanchangaMonthGrid.tsx` and the app's
 * `components/home/PanchangaMonthGrid.tsx`: weekday headers and, per day, the
 * tithi / nakshatra / rashi / yoga / karana labels, primary and secondary day
 * labels, sun times and moon phase. Each app fetches its own days and draws.
 */
import type { CalendarDay } from "@vedic-patro/api-client";
import { WEEKDAYS_NE, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/bs-calendar";
import { getSecondaryCellDate } from "@vedic-patro/read-models/local-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { getPakshaPhase, moonPhaseTitle } from "@vedic-patro/read-models/month-grid-moon";
import { nakshatraShortLabel } from "@vedic-patro/domain/nakshatra-short";
import { getMonthDayChandraRashi, getMonthDayNakshatra } from "@vedic-patro/read-models/panchanga-format";
import { civilIsoDayOfMonth, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { tithiIndexFromCalendarDay } from "@vedic-patro/read-models/tithi-wheel-data";
import { useLocale } from "@vedic-patro/i18n/react";

export type PanchangaMonthWeekday = { key: string; label: string; short: string; weekend: boolean };

export type PanchangaMonthCell = {
  key: string;
  day: CalendarDay;
  /** The civil date, for `onPickDay`. */
  date: Date;
  isOutside: boolean;
  isToday: boolean;
  isSelected: boolean;
  isKrishna: boolean;
  hasSunTimes: boolean;
  sunrise: string | null;
  sunset: string | null;
  /** "sunrise sunset" for narrow cells. */
  sunTimesLabel: string;
  tithiIndex: number | null;
  moonTitle?: string;
  tithi: string;
  nakshatra: string;
  nakshatraShort: string;
  rashi: string;
  yoga: string;
  karana: string;
  primaryDay: string;
  secondaryLabel: string;
  secondaryLabelShort: string;
  secondaryNamed: boolean;
};

export function usePanchangaMonthGrid({
  days,
  todayAd,
  selectedAd,
  primaryDate = "bs",
}: {
  days: CalendarDay[];
  todayAd: string;
  selectedAd?: string;
  /** AD makes the Gregorian day the big number; always AD in English. */
  primaryDate?: "bs" | "ad";
}) {
  const { lang, monoDigits, isEnglish } = useLocale();
  const isAd = primaryDate === "ad" || isEnglish;

  const weekdays: PanchangaMonthWeekday[] = WEEKDAYS_NE.map((ne, i) => ({
    key: ne,
    label: isEnglish ? WEEKDAYS_SHORT[i]! : ne,
    short: isEnglish ? WEEKDAYS_SHORT[i]! : WEEKDAYS_SHORT_NE[i]!,
    weekend: i === 0 || i === 6,
  }));

  const cells: PanchangaMonthCell[] = days.map((day, i) => {
    const phase = getPakshaPhase(day);
    const primaryDay = isAd ? civilIsoDayOfMonth(day.date_ad) : day.day;
    const secondary = getSecondaryCellDate(day, isAd ? "ad" : "bs", lang, i === 0);
    const nakshatra = getMonthDayNakshatra(day, lang) ?? "—";
    return {
      key: day.date_ad,
      day,
      date: parseCivilIsoToDate(day.date_ad),
      isOutside: day.outsideMonth === true,
      isToday: day.date_ad === todayAd,
      isSelected: day.date_ad === selectedAd,
      isKrishna: phase === "krishna",
      hasSunTimes: Boolean(day.sunrise || day.sunset),
      sunrise: day.sunrise ? monoDigits(day.sunrise) : null,
      sunset: day.sunset ? monoDigits(day.sunset) : null,
      sunTimesLabel: [
        day.sunrise ? monoDigits(day.sunrise) : "—",
        day.sunset ? monoDigits(day.sunset) : "—",
      ].join(" "),
      tithiIndex: tithiIndexFromCalendarDay(day) ?? null,
      moonTitle: moonPhaseTitle(phase, isEnglish),
      tithi: isEnglish ? (day.tithi ?? day.tithi_ne ?? "—") : (day.tithi_ne ?? day.tithi ?? "—"),
      nakshatra,
      nakshatraShort: nakshatraShortLabel(nakshatra, lang) ?? nakshatra,
      rashi: getMonthDayChandraRashi(day, lang) ?? "—",
      yoga: bilingualText(lang, day.yoga_ne ?? day.yoga, day.yoga ?? day.yoga_ne),
      karana: bilingualText(lang, day.karana_ne ?? day.karana, day.karana ?? day.karana_ne),
      primaryDay: monoDigits(primaryDay),
      secondaryLabel: secondary.monthLabel
        ? `${secondary.monthLabel} ${monoDigits(secondary.day)}`
        : monoDigits(secondary.day),
      secondaryLabelShort: secondary.monthLabelShort
        ? `${secondary.monthLabelShort} ${monoDigits(secondary.day)}`
        : monoDigits(secondary.day),
      secondaryNamed: Boolean(secondary.monthLabel),
    };
  });

  const rows: PanchangaMonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return { weekdays, cells, rows };
}
