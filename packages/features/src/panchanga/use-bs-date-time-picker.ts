/**
 * The date / time picker, shared by the website's and the app's
 * `components/panchanga/BsDateTimePicker.tsx`: the draft (date, time and
 * browse era) that resets when the committed value changes, the month grid
 * (offline BS table, the API month for BBS or years outside the table, or
 * the AD month), month / year / hour / minute options, month stepping across
 * the BS / BBS year axis, Today, the commit on Done, and copy.
 *
 * The app's live / in-sheet modes pass `onDraftDate` / `onDraftClock` so
 * each draft change is pushed up at once.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMonthCalendarRaw, type CalendarDay, type LocationParams } from "@vedic-patro/api-client";
import {
  BS_MONTH_NAMES,
  WEEKDAYS_MIN,
  WEEKDAYS_SHORT_NE,
  adMonthLabel,
  adToBS,
  bsMonthLabel,
  bsToAdOrNull,
  getBSMonthLength,
} from "@vedic-patro/domain/calendar/bs-calendar";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { formatClockParts } from "@vedic-patro/domain/panchanga/panchanga-mode";
import { DEFAULT_PANCHANGA_LOCATION } from "@vedic-patro/read-models/geography/panchanga-location";
import { civilIsoFromDate, civilIsoWeekday } from "@vedic-patro/domain/calendar/patro-day";
import {
  bbsFromSigned,
  isBbsSigned,
  signedPatroYearFromBrowse,
  stepPatroSignedYear,
} from "@vedic-patro/domain/calendar/patro-year-axis";
import { useLocale } from "@vedic-patro/i18n/react";

export type Meridiem = "AM" | "PM";

function parseClock(clock: string): { hour: number; minute: number } {
  const [h, m] = clock.split(":");
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

function to12h(hour24: number): { hour12: number; meridiem: Meridiem } {
  const base = hour24 % 12;
  return { hour12: base === 0 ? 12 : base, meridiem: hour24 < 12 ? "AM" : "PM" };
}

function from12h(hour12: number, meridiem: Meridiem): number {
  const base = hour12 % 12;
  return meridiem === "AM" ? base : base + 12;
}

/** Month length and weekday of day 1 from the API month (in-month days only). */
function monthGridFromApiCalendar(calendar: CalendarDay[]): { monthLen: number; firstDow: number } | null {
  const days = calendar.filter((d) => !d.outsideMonth);
  // The raw month carries the BS day in `day_bs` when present.
  const day1 = days.find((d) => (d.day_bs ?? d.day) === 1) ?? days[0];
  if (!day1?.date_ad) return null;
  return { monthLen: days.length, firstDow: civilIsoWeekday(day1.date_ad) };
}

function bsMonthGridOffline(year: number, month: number): { monthLen: number; firstDow: number } | null {
  const start = bsToAdOrNull(year, month, 1);
  if (!start) return null;
  return { monthLen: getBSMonthLength(year, month), firstDow: civilIsoWeekday(civilIsoFromDate(start)) };
}

/** Step one Vikram year on month rollover (BS +1 forward; BBS uses the signed axis). */
function stepSignedAcrossVikramYear(signed: number, monthDelta: number): number {
  const up = monthDelta > 0 !== isBbsSigned(signed);
  return stepPatroSignedYear(signed, up ? 1 : -1);
}

function stepBrowseVikramMonth(browseEra: Era, browseYear: number, month: number, delta: number) {
  let signed = signedPatroYearFromBrowse(browseEra, browseYear);
  let m = month + delta;
  while (m < 1) {
    m += 12;
    signed = stepSignedAcrossVikramYear(signed, -1);
  }
  while (m > 12) {
    m -= 12;
    signed = stepSignedAcrossVikramYear(signed, 1);
  }
  return { year: browseEra === "bbs" ? bbsFromSigned(signed) : signed, month: m };
}

const pad = (n: number) => String(n).padStart(2, "0");

export type BsDateTimePickerInput = {
  year: number;
  month: number;
  day: number;
  yearOptions: number[];
  todayAd?: string;
  /** Committed on Done (or on each change through `onDraftDate`). */
  onSelectDate: (year: number, month: number, day: number) => void;
  clock?: string;
  onClockChange?: (clock: string) => void;
  showTime: boolean;
  gridEra?: "bs" | "bbs" | "ad";
  displayEra?: Era;
  onEraChange?: (era: Era) => void;
  /** Observer for BBS month grids (no offline table). */
  locationParams?: LocationParams;
  /** One shot commit (era + y/m/d). */
  onCommitBrowseDay?: (era: Era, year: number, month: number, day: number) => void;
  /** Called after Done commits. */
  afterCommit?: () => void;
  /** Single Done handler — date, era, and time in one shot. */
  onCommitDateTime?: (era: Era, year: number, month: number, day: number, clock: string) => void;
  /** Push each draft date change up at once (the app's live / in-sheet modes). */
  onDraftDate?: (year: number, month: number, day: number) => void;
  /** Push each draft time change up at once. */
  onDraftClock?: (clock: string) => void;
};

export function useBsDateTimePicker({
  year,
  month,
  day,
  yearOptions,
  todayAd,
  onSelectDate,
  clock,
  onClockChange,
  showTime,
  gridEra = "bs",
  displayEra,
  onEraChange,
  locationParams,
  onCommitBrowseDay,
  afterCommit,
  onCommitDateTime,
  onDraftDate,
  onDraftClock,
}: BsDateTimePickerInput) {
  const { t, lang, digits } = useLocale();
  const isAd = gridEra === "ad";

  const [draft, setDraft] = useState({ year, month, day, clock: clock ?? "" });
  const [draftBrowseEra, setDraftBrowseEra] = useState<Era>(displayEra ?? "bs");

  // Reset the draft whenever the committed value changes underneath it —
  // adjusted during render rather than in an effect that would show the stale
  // draft for a frame.
  const draftKey = `${year}-${month}-${day}-${clock ?? ""}-${displayEra ?? ""}`;
  const [prevDraftKey, setPrevDraftKey] = useState(draftKey);
  if (draftKey !== prevDraftKey) {
    setPrevDraftKey(draftKey);
    setDraft({ year, month, day, clock: clock ?? "" });
    setDraftBrowseEra(displayEra ?? "bs");
  }

  const { year: dYear, month: dMonth, day: dDay } = draft;
  const signedGridYear = isAd ? dYear : signedPatroYearFromBrowse(draftBrowseEra, dYear);

  const resolvedLocation = locationParams ?? DEFAULT_PANCHANGA_LOCATION.params;
  const needsApiMonth = !isAd && (draftBrowseEra === "bbs" || bsToAdOrNull(signedGridYear, dMonth, 1) == null);
  const monthQ = useQuery({
    queryKey: ["picker-month", signedGridYear, dMonth, draftBrowseEra, resolvedLocation],
    queryFn: () => fetchMonthCalendarRaw(dYear, dMonth, resolvedLocation, { full: false, era: isAd ? "ad" : draftBrowseEra }),
    enabled: needsApiMonth,
    staleTime: 1000 * 60 * 30,
  });
  const apiCalendar = monthQ.data?.calendar;

  const bsGrid = useMemo(() => {
    if (isAd) return null;
    if (needsApiMonth) return apiCalendar ? monthGridFromApiCalendar(apiCalendar) : null;
    return bsMonthGridOffline(signedGridYear, dMonth);
  }, [isAd, needsApiMonth, apiCalendar, signedGridYear, dMonth]);

  const monthLen = isAd ? new Date(dYear, dMonth, 0).getDate() : (bsGrid?.monthLen ?? getBSMonthLength(signedGridYear, dMonth));
  const firstDow = isAd ? new Date(dYear, dMonth - 1, 1).getDay() : (bsGrid?.firstDow ?? 0);
  const days: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: monthLen }, (_, i) => i + 1),
  ];
  while (days.length % 7 !== 0) days.push(null);

  const todayDate = todayAd ? new Date(`${todayAd}T12:00:00`) : new Date();
  const todayBs = adToBS(todayDate);
  const today = isAd
    ? { year: todayDate.getFullYear(), month: todayDate.getMonth() + 1, day: todayDate.getDate() }
    : { year: todayBs.year, month: todayBs.month, day: todayBs.day };

  const minYear = yearOptions[0] ?? dYear;
  const maxYear = yearOptions[yearOptions.length - 1] ?? dYear;

  const setDraftDate = (y: number, m: number, d: number) => {
    setDraft((prev) => ({ ...prev, year: y, month: m, day: d }));
    onDraftDate?.(y, m, d);
  };

  const setMonthYear = (y: number, m: number) => {
    const maxDay = isAd ? new Date(y, m, 0).getDate() : getBSMonthLength(signedPatroYearFromBrowse(draftBrowseEra, y), m);
    setDraftDate(y, m, Math.min(dDay, maxDay));
  };

  const stepMonth = (delta: number) => {
    let next: { year: number; month: number };
    if (isAd) {
      let m = dMonth + delta;
      let y = dYear;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      next = { year: y, month: m };
    } else {
      next = stepBrowseVikramMonth(draftBrowseEra, dYear, dMonth, delta);
    }
    if (next.year < minYear || next.year > maxYear) return;
    setMonthYear(next.year, next.month);
  };

  const { hour, minute } = draft.clock ? parseClock(draft.clock) : { hour: 0, minute: 0 };
  const { hour12, meridiem } = to12h(hour);
  const setTime = (nextHour12: number, nextMinute: number, nextMeridiem: Meridiem) => {
    const nextClock = formatClockParts(from12h(nextHour12, nextMeridiem), nextMinute);
    setDraft((d) => ({ ...d, clock: nextClock }));
    onDraftClock?.(nextClock);
  };

  // Push the draft to the page (and refetch) — only fires on Done.
  const commit = () => {
    if (onCommitDateTime) {
      onCommitDateTime(draftBrowseEra, draft.year, draft.month, draft.day, showTime ? draft.clock : (clock ?? ""));
      afterCommit?.();
      return;
    }
    const eraChanged = displayEra != null && draftBrowseEra !== displayEra && onEraChange != null;
    const dateChanged = draft.year !== year || draft.month !== month || draft.day !== day;
    const clockChanged = showTime && draft.clock !== (clock ?? "");
    if (onCommitBrowseDay && (eraChanged || dateChanged)) {
      onCommitBrowseDay(draftBrowseEra, draft.year, draft.month, draft.day);
    } else {
      if (eraChanged) onEraChange?.(draftBrowseEra);
      if (dateChanged) onSelectDate(draft.year, draft.month, draft.day);
    }
    if (clockChanged) onClockChange?.(draft.clock);
    afterCommit?.();
  };

  return {
    isAd,
    draft,
    browseEra: draftBrowseEra,
    /** Picks the browse era and year from the year picker. */
    pickBrowseYear: (nextEra: Era, nextYear: number) => {
      setDraftBrowseEra(nextEra);
      setMonthYear(nextYear, dMonth);
    },
    setMonth: (m: number) => setMonthYear(dYear, m),
    setYear: (y: number) => setMonthYear(y, dMonth),
    monthOptions: isAd
      ? Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: adMonthLabel(i + 1, lang) }))
      : BS_MONTH_NAMES.map((_, i) => ({ value: i + 1, label: bsMonthLabel(i + 1, lang) })),
    yearOptions: yearOptions.map((y) => ({ value: y, label: digits(y) })),
    prev: { disabled: dYear <= minYear && dMonth <= 1, go: () => stepMonth(-1), label: t("patro_date.prev_month") },
    next: { disabled: dYear >= maxYear && dMonth >= 12, go: () => stepMonth(1), label: t("patro_date.next_month") },
    /** The API month is still loading and there is no grid to draw yet. */
    gridLoading: needsApiMonth && monthQ.isLoading && !bsGrid,
    weekdays: (lang === "en" ? WEEKDAYS_MIN : WEEKDAYS_SHORT_NE).map((label, i) => ({ label, weekend: i === 0 || i === 6 })),
    cells: days.map((d, i) =>
      d == null
        ? { key: `e-${i}`, day: null }
        : {
            key: `d-${d}`,
            day: d,
            label: digits(d),
            weekend: i % 7 === 0 || i % 7 === 6,
            selected: d === dDay,
            today: today.year === dYear && today.month === dMonth && today.day === d,
            pick: () => setDraftDate(dYear, dMonth, d),
          },
    ),
    time: {
      hour12,
      minute,
      meridiem,
      hourOptions: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: digits(pad(i + 1)) })),
      minuteOptions: Array.from({ length: 60 }, (_, i) => ({ value: i, label: digits(pad(i)) })),
      meridiems: (["AM", "PM"] as const).map((mer) => ({ id: mer, label: mer, active: meridiem === mer })),
      setHour: (h: number) => setTime(h, minute, meridiem),
      setMinute: (m: number) => setTime(hour12, m, meridiem),
      setMeridiem: (mer: Meridiem) => setTime(hour12, minute, mer),
    },
    /** Stages today in the draft (Done still commits it). */
    goToday: () => setDraftDate(today.year, today.month, today.day),
    commit,
    copy: {
      loading: t("common.loading"),
      time: t("common.time"),
      today: t("today"),
      done: t("common.done"),
    },
  };
}
