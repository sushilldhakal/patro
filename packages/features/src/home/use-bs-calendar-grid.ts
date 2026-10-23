/**
 * The home month grid, shared by the website's `components/BsCalendarGrid.tsx`
 * and the app's `components/home/BsCalendarGrid.tsx`: weekday headers, one
 * model per cell (flags, tithi, moon phase, primary/secondary day labels,
 * festival placement and badges) and the festival-list dialog the badges
 * open. Each app draws the cells (and the dialog or sheet) itself.
 */
import { useState } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import { WEEKDAYS_NE, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { getSecondaryCellDate } from "@vedic-patro/read-models/calendar/local-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { getPakshaPhase, moonPhaseTitle } from "@vedic-patro/read-models/panchanga/month-grid-moon";
import { civilIsoDayOfMonth, parseCivilIsoToDate } from "@vedic-patro/domain/calendar/patro-day";
import { tithiIndexFromCalendarDay } from "@vedic-patro/read-models/panchanga/tithi-wheel-data";
import { useLocale } from "@vedic-patro/i18n/react";
import { buildSaitRows, saitNote, type SaitRow } from "../_shared/sait-rows";

export type BsCalendarWeekday = {
  key: string;
  /** Full Nepali name, or the short English one in English. */
  label: string;
  /** Short Nepali name (narrow screens); same as `label` in English. */
  short: string;
  weekend: boolean;
};

export type BsCalendarCell = {
  key: string;
  day: CalendarDay;
  index: number;
  isOutside: boolean;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  isPublicHoliday: boolean;
  festivals: string[];
  /** A festival that is not a public holiday. */
  hasFestival: boolean;
  mainFest?: string;
  leftFest?: string;
  rightFest?: string;
  /** Festivals beyond the two edge labels (`+n` badge in AD mode). */
  extraFestCount: number;
  extraFestLabel: string;
  extraFestAria: string;
  /** BS patro on narrow screens: tint + count badge only, no labels. */
  bsFestCompact: boolean;
  festCountLabel: string;
  festCountAria: string;
  festivalsTitle: string;
  tithi: string;
  tithiIndex: number | null;
  moonTitle?: string;
  primaryDay: string;
  secondaryLabel: string;
  secondaryLabelShort: string;
  /** The counterpart date carries a month name (month turnover). */
  secondaryNamed: boolean;
  ariaLabel: string;
};

/** How a day's panchanga (and so its saits) is requested, for the festival dialog. */
export type BsCalendarSaitSource = (day: CalendarDay) => { queryKey: QueryKey; queryFn: () => Promise<PanchangaDay> };

export type BsCalendarFestivalDialog = {
  title: string;
  description: string;
  festivals: string[];
  /** The festival names on one line, "A / B / C". */
  festivalLine: string;
  saitHeading: string;
  /** Rites with a sait on this day; empty while loading or when there is none. */
  saits: SaitRow[];
  saitNote: string;
};

export function useBsCalendarGrid({
  days,
  publicHolidayDates,
  selectedAdDate,
  todayAd,
  primaryDate: primaryDateProp = "bs",
  saitSource,
}: {
  days: CalendarDay[];
  publicHolidayDates?: Set<string>;
  selectedAdDate?: string;
  todayAd: string;
  /** Which date system is primary in each cell; always AD in English. */
  primaryDate?: "bs" | "ad";
  /** Only the dialog's day is requested, and only while it is open. */
  saitSource?: BsCalendarSaitSource;
}) {
  const { t, lang, monoDigits, digits } = useLocale();
  const isEn = lang === "en";
  const primaryDate: "bs" | "ad" = primaryDateProp === "ad" || isEn ? "ad" : "bs";
  const [festivalDay, setFestivalDay] = useState<{ day: CalendarDay; festivals: string[] } | null>(null);
  const saitRequest = festivalDay && saitSource ? saitSource(festivalDay.day) : null;
  const saitQuery = useQuery({
    queryKey: saitRequest?.queryKey ?? (["bs-calendar", "dialog-sait", "idle"] as const),
    queryFn: saitRequest?.queryFn ?? (() => Promise.reject(new Error("idle"))),
    enabled: saitRequest != null,
    staleTime: 1000 * 60 * 5,
  });

  const weekdays: BsCalendarWeekday[] = WEEKDAYS_NE.map((ne, i) => ({
    key: ne,
    label: isEn ? WEEKDAYS_SHORT[i]! : ne,
    short: isEn ? WEEKDAYS_SHORT[i]! : WEEKDAYS_SHORT_NE[i]!,
    weekend: i === 0 || i === 6,
  }));

  const padded: (CalendarDay | null)[] = [...days];
  while (padded.length % 7 !== 0) padded.push(null);

  const cells: (BsCalendarCell | null)[] = padded.map((day, i) => {
    if (!day) return null;
    const col = i % 7;
    const isOutside = day.outsideMonth === true;
    const isToday = day.date_ad === todayAd;
    const isPublicHoliday = !isOutside && (publicHolidayDates?.has(day.date_ad) ?? false);
    const festivals = !isOutside ? day.festivals.filter(Boolean) : [];
    const festCount = festivals.length;
    const extraFestCount = festCount > 2 ? festCount - 2 : 0;
    const primaryDayNum = primaryDate === "ad" ? civilIsoDayOfMonth(day.date_ad) : day.day;
    const secondary = getSecondaryCellDate(day, primaryDate, lang, i === 0);
    // The cell shows only the other calendar's day number; the month names are in
    // the page header. The spoken label keeps the month.
    const secondaryLabel = monoDigits(secondary.day);
    const secondaryLabelShort = secondaryLabel;
    const secondarySpoken = secondary.monthLabel ? `${secondary.monthLabel} ${secondaryLabel}` : secondaryLabel;
    return {
      key: day.date_ad,
      day,
      index: i,
      isOutside,
      isToday,
      isSelected: day.date_ad === selectedAdDate && !isToday,
      isWeekend: col === 0 || col === 6,
      isPublicHoliday,
      festivals,
      hasFestival: festCount > 0 && !isPublicHoliday,
      mainFest: festivals[0],
      leftFest: festivals[1],
      rightFest: festivals[2],
      extraFestCount,
      extraFestLabel: `+${monoDigits(extraFestCount)}`,
      extraFestAria: t("calendar.festivals_more", { count: extraFestCount }),
      bsFestCompact: primaryDate === "bs" && festCount > 0,
      festCountLabel: `+${monoDigits(festCount)}`,
      festCountAria: t("calendar.festivals_more", { count: festCount }),
      festivalsTitle: festivals.join(" · "),
      tithi: bilingualText(lang, day.tithi_ne ?? day.tithi, day.tithi ?? day.tithi_ne),
      tithiIndex: tithiIndexFromCalendarDay(day) ?? null,
      moonTitle: moonPhaseTitle(getPakshaPhase(day), isEn),
      primaryDay: monoDigits(primaryDayNum),
      secondaryLabel,
      secondaryLabelShort,
      secondaryNamed: false,
      ariaLabel: `${monoDigits(primaryDayNum)} (${secondarySpoken}), ${day.date_ad}`,
    };
  });

  const rows: (BsCalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  let festivalDialog: BsCalendarFestivalDialog | null = null;
  if (festivalDay) {
    const { day } = festivalDay;
    const weekday = bilingualText(lang, day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday);
    const adDate = parseCivilIsoToDate(day.date_ad).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    festivalDialog = {
      title: t("calendar.festivals_dialog_title"),
      description: t("calendar.festivals_dialog_desc", { weekday, bsDay: monoDigits(day.day), adDate }),
      festivals: festivalDay.festivals,
      festivalLine: festivalDay.festivals.join(" / "),
      saitHeading: t("ui.home.sait_heading"),
      saits: buildSaitRows(saitQuery.data?.festival_saits, { t, lang, digits, selectedAdDate: day.date_ad }),
      saitNote: saitNote(saitQuery.data?.festival_saits, t),
    };
  }

  return {
    primaryDate,
    weekdays,
    cells,
    rows,
    todayBadge: t("calendar.today_badge"),
    festivalDialog,
    openFestivals: (cell: BsCalendarCell) => setFestivalDay({ day: cell.day, festivals: cell.festivals }),
    closeFestivals: () => setFestivalDay(null),
  };
}
