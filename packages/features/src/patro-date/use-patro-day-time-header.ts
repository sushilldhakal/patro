/**
 * The day + month + year picker (with an optional time) shared by the website
 * and the app: the badge (jumps to today), the title with weekday and time,
 * prev/next day, and one button opening a panel. The panel shows the day grid;
 * the month and year crumbs swap it for a month grid or a year view (jump box +
 * twelve years), and choosing returns to the days. Time steppers and "now" sit
 * under the days when the page has a clock.
 *
 * The apps only draw what this returns; the date itself lives with the caller
 * (`onSelect` receives the new year, month and day in the browsing era).
 */
import { useState } from "react";
import type { Era } from "@vedic-patro/domain/era";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { monthLengthInBrowseEra } from "@vedic-patro/domain/patro-browse-range";
import { patroEraShortLabel } from "@vedic-patro/domain/patro-era-label";
import { adMonthLabel, bsMonthLabel, isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { shiftPatroBrowseMonth } from "@vedic-patro/domain/patro-year-browse-step";
import { useLocale } from "@vedic-patro/i18n/react";
import { dayCells, firstWeekdayOfMonth, formatClock, monthOptions, parseClock, stepClock } from "./calendar-header-model";
import { usePatroYearEraToggle } from "./use-patro-year-era-toggle";
import { useSamvatsaraLabel } from "./use-samvatsara-label";
import { useYearJump } from "./use-year-jump";

export type DayTimePanelView = "days" | "months" | "years";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type Ymd = { year: number; month: number; day: number };

export function usePatroDayTimeHeader({
  era,
  year,
  month,
  day,
  weekday,
  today,
  clock,
  nowClock,
  onSelect,
  onStepDay,
  onToday,
  onClockChange,
  subtitleOverride,
  crossEraText,
}: {
  era: Era;
  year: number;
  month: number;
  day: number;
  /** Weekday of the selected day, 0 = Sunday. */
  weekday: number;
  /** Today in the browsing era, to outline in the grid. */
  today?: Ymd | null;
  /** "HH:MM"; with `onClockChange` the panel gets the time steppers. */
  clock?: string;
  /** What "now" sets the time to (the place's clock); defaults to the device's. */
  nowClock?: string;
  onSelect: (year: number, month: number, day: number) => void;
  onStepDay: (delta: 1 | -1) => void;
  onToday: () => void;
  onClockChange?: (clock: string) => void;
  /** Replaces the weekday (and `crossEraText`) under the title. */
  subtitleOverride?: string;
  /** The same day in the other calendar, after the weekday. */
  crossEraText?: string;
}) {
  const { t, lang } = useLocale();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DayTimePanelView>("days");

  const digits = (v: string | number) => toNepaliDigits(v, lang);
  const pad = (n: number) => digits(String(n).padStart(2, "0"));
  const monthName = (m: number) => (isGregorianEraBrowse(era) ? adMonthLabel : bsMonthLabel)(m, lang);
  const lengthOf = (y: number, m: number) => monthLengthInBrowseEra(era, y, m);
  const select = (y: number, m: number, d: number) => onSelect(y, m, Math.min(d, lengthOf(y, m)));

  const samvatsara = useSamvatsaraLabel(era, year);
  const eraToggle = usePatroYearEraToggle(era);
  // Fixed order (BS before AD) so the segments do not swap places when pressed.
  const eras = eraToggle
    ? [
        { era, label: patroEraShortLabel(era, lang), active: true },
        { era: eraToggle.targetEra, label: eraToggle.label, active: false },
      ].sort((a, b) => Number(isGregorianEraBrowse(a.era)) - Number(isGregorianEraBrowse(b.era)))
    : [];
  const hasTime = clock !== undefined && onClockChange !== undefined;
  const parts = parseClock(clock);
  const timeText = hasTime ? `${pad(parts.hour)}:${pad(parts.minute)}` : null;
  const setParts = (next: ReturnType<typeof parseClock>) => onClockChange?.(formatClock(next));

  const jump = useYearJump({
    era,
    year,
    onApply: (y) => {
      select(y, month, day);
      setView("days");
    },
  });

  const first = firstWeekdayOfMonth(day, weekday);
  const weekdayLong = t(`weekdays.${WEEKDAY_KEYS[weekday] ?? "sun"}_long`);

  const stepMonth = (delta: 1 | -1) => {
    const next = shiftPatroBrowseMonth(era, year, month, delta);
    select(next.year, next.month, day);
  };

  const openView = (next: DayTimePanelView) => {
    if (next === "years" && view !== "years") jump.reset(year);
    setView(view === next ? "days" : next);
  };

  return {
    open,
    view,
    toggle: () => {
      setOpen(!open);
      setView("days");
    },
    close: () => setOpen(false),

    badge: { top: monthName(month), bottom: digits(day) },
    title: {
      main: [digits(year), monthName(month), digits(day), samvatsara].filter(Boolean).join(" "),
      sub: [...(subtitleOverride ? [subtitleOverride] : [weekdayLong, crossEraText]), timeText].filter(Boolean).join(" · "),
      era: patroEraShortLabel(era, lang),
      samvatsara,
    },
    buttonText: `${monthName(month)} ${digits(day)}, ${digits(year)}`,
    /** The same without the year, for narrow phones (the title already shows it). */
    buttonTextShort: `${monthName(month)} ${digits(day)}`,
    timeText,
    goToday: () => {
      setOpen(false);
      setView("days");
      onToday();
    },
    stepDay: onStepDay,
    /** The era switch at the top of the panel (empty when the era has no pair). */
    eras,
    eraAria: t("calendar.era_aria"),

    crumbs: {
      month: { label: monthName(month), active: view === "months", toggle: () => openView("months") },
      year: { label: digits(year), active: view === "years", toggle: () => openView("years") },
      prevMonth: () => stepMonth(-1),
      nextMonth: () => stepMonth(1),
    },

    weekdays: WEEKDAY_KEYS.map((k, i) => ({ label: t(`weekdays.${k}`), saturday: i === 6 })),
    cells: dayCells(lengthOf(year, month), first).map((c, i) => ({
      key: c.day === null ? `blank-${i}` : String(c.day),
      day: c.day,
      label: c.day === null ? "" : digits(c.day),
      saturday: c.weekday === 6,
      today: c.day !== null && today?.year === year && today.month === month && today.day === c.day,
      selected: c.day === day,
      pick: () => {
        if (c.day === null) return;
        onSelect(year, month, c.day);
        if (!hasTime) setOpen(false);
      },
    })),

    months: monthOptions(era, month, lang).map((m) => ({
      ...m,
      current: today?.year === year && today.month === m.month,
      pick: () => {
        select(year, m.month, day);
        setView("days");
      },
    })),

    years: jump.page.years.map((y) => ({
      year: y,
      label: digits(y),
      selected: y === year,
      current: y === today?.year,
      pick: () => {
        select(y, month, day);
        setView("days");
      },
    })),
    yearInput: jump.input,
    yearPage: jump.page,

    time: hasTime
      ? {
          hour: pad(parts.hour),
          minute: pad(parts.minute),
          step: (field: "hour" | "minute", direction: 1 | -1) => setParts(stepClock(parts, field, direction)),
          setNow: () => {
            const now = nowClock ?? formatClock({ hour: new Date().getHours(), minute: new Date().getMinutes() });
            onClockChange?.(formatClock(parseClock(now)));
          },
        }
      : null,

    labels: {
      today: t("calendar.today_jump"),
      prevDay: t("calendar.prev_day"),
      nextDay: t("calendar.next_day"),
      prevMonth: t("calendar.prev_month"),
      nextMonth: t("calendar.next_month"),
      picker: hasTime ? t("calendar.pick_date_time") : t("patro_date.change_date"),
      pickMonth: t("calendar.pick_month"),
      pickYear: t("calendar.pick_year"),
      time: t("common.time"),
      now: t("calendar.time_now"),
      todayShort: t("today"),
      ok: t("calendar.time_ok"),
      hourUp: t("calendar.hour_up"),
      hourDown: t("calendar.hour_down"),
      minuteUp: t("calendar.minute_up"),
      minuteDown: t("calendar.minute_down"),
      ...jump.labels,
    },
  };
}
