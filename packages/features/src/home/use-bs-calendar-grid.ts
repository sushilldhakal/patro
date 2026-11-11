/**
 * The home month grid, shared by the website's `components/BsCalendarGrid.tsx`
 * and the app's `components/home/BsCalendarGrid.tsx`: weekday headers, one
 * model per cell (flags, tithi, moon phase, primary/secondary day labels,
 * festival placement and badges) and the festival-list dialog the badges
 * open. Each app draws the cells (and the dialog or sheet) itself.
 */
import { useState } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import type { CalendarDay, CalendarEvent, PanchangaDay } from "@vedic-patro/api-client";
import { WEEKDAYS_NE, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { getSecondaryCellDate } from "@vedic-patro/read-models/calendar/local-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { getPakshaPhase, moonPhaseTitle } from "@vedic-patro/read-models/panchanga/month-grid-moon";
import { civilIsoDayOfMonth, parseCivilIsoToDate } from "@vedic-patro/domain/calendar/patro-day";
import { tithiIndexFromCalendarDay } from "@vedic-patro/read-models/panchanga/tithi-wheel-data";
import { useLocale } from "@vedic-patro/i18n/react";
import { eventsOnDate } from "../events/use-day-events";
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
  /**
   * Festivals a phone-width cell does not write out: it names one festival when there are three or
   * more, and every festival when there are one or two.
   */
  hiddenFestCompact: number;
  festivalsTitle: string;
  /** The signed-in user's events, tasks and appointments on this day (titles, earliest first). */
  eventTitles: string[];
  /**
   * A cell's one "+N" badge counts everything it does not show — unwritten festivals and the user's
   * events together — so a cell never carries two badges. Phone width: one festival name is written.
   */
  moreCompact: number;
  moreCompactLabel: string;
  /** Wide cell (web md+): three festivals are written (centre and both edges); events are all in the badge. */
  moreWide: number;
  moreWideLabel: string;
  /** Wide native cell: as `moreWide`, but the first two events are drawn as chips. */
  moreWideChips: number;
  moreWideChipsLabel: string;
  moreAria: string;
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
  events,
}: {
  days: CalendarDay[];
  publicHolidayDates?: Set<string>;
  selectedAdDate?: string;
  todayAd: string;
  /** Which date system is primary in each cell (the calendar preference), independent of the UI language. */
  primaryDate?: "bs" | "ad";
  /** Only the dialog's day is requested, and only while it is open. */
  saitSource?: BsCalendarSaitSource;
  /** The user's events: each cell lists its day's, like festivals (chips on wide cells, a +N badge on narrow ones). */
  events?: CalendarEvent[];
}) {
  const { t, lang, monoDigits, digits } = useLocale();
  const isEn = lang === "en";
  // The language only picks the text; the calendar preference picks the primary date.
  const primaryDate: "bs" | "ad" = primaryDateProp;
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
    const eventTitles = !isOutside && events?.length ? eventsOnDate(events, day.date_ad).map((e) => e.title) : [];
    const eventCount = eventTitles.length;
    const hiddenFestCompact = festCount > 2 ? festCount - 1 : 0;
    const hiddenFestWide = Math.max(0, festCount - 3);
    const moreCompact = hiddenFestCompact + eventCount;
    const moreWide = hiddenFestWide + eventCount;
    const moreWideChips = hiddenFestWide + Math.max(0, eventCount - 2);
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
      hiddenFestCompact,
      festivalsTitle: festivals.join(" · "),
      eventTitles,
      moreCompact,
      moreCompactLabel: `+${monoDigits(moreCompact)}`,
      moreWide,
      moreWideLabel: `+${monoDigits(moreWide)}`,
      moreWideChips,
      moreWideChipsLabel: `+${monoDigits(moreWideChips)}`,
      moreAria: t("calendar.festivals_more", { count: Math.max(moreCompact, moreWide) }),
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
