import { WEEKDAYS_EN, WEEKDAYS_NE, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE, adToBS, bsMonthLabel } from "@vedic-patro/domain/calendar/bs-calendar";
import { useLocale } from "@vedic-patro/i18n/react";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { weekDates, weekdayOf, type PlannerViewKind } from "./calendar-views";

const parse = (iso: string) => new Date(`${iso}T12:00:00`);

/** The words and numbers the planner views print: BS first, the Gregorian day beside it. */
export function usePlannerText() {
  const { t, lang, digits } = useLocale();
  const en = lang === "en";
  const bs = (iso: string) => adToBS(parse(iso));
  const pad = (n: number) => String(n).padStart(2, "0");

  const text = {
    t,
    lang,
    digits,
    weekdayShort: (iso: string) => (en ? WEEKDAYS_SHORT[weekdayOf(iso)]! : WEEKDAYS_SHORT_NE[weekdayOf(iso)]!),
    weekdayFull: (iso: string) => (en ? WEEKDAYS_EN[weekdayOf(iso)]! : WEEKDAYS_NE[weekdayOf(iso)]!),
    bsDay: (iso: string) => digits(bs(iso).day),
    bsMonth: (iso: string) => bsMonthLabel(bs(iso).month, lang),
    bsYear: (iso: string) => digits(bs(iso).year),
    adDay: (iso: string) => digits(Number(iso.slice(8, 10))),
    hour: (h: number) => digits(`${pad(h)}:00`),
    clock: (minutes: number) => digits(`${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`),
    /** "कात्तिक १९ – २५, २०८३": the heading over a week, day, year or list. */
    title: (view: PlannerViewKind, anchor: string) => {
      if (view === "year") return digits(bs(anchor).year);
      if (view === "list") return t("events.upcoming");
      if (view === "day") return `${text.weekdayFull(anchor)} · ${text.bsMonth(anchor)} ${text.bsDay(anchor)}, ${text.bsYear(anchor)}`;
      const days = weekDates(anchor);
      const first = days[0]!;
      const last = days[6]!;
      const sameMonth = bs(first).month === bs(last).month;
      return `${text.bsMonth(first)} ${text.bsDay(first)} – ${sameMonth ? "" : `${text.bsMonth(last)} `}${text.bsDay(last)}, ${text.bsYear(last)}`;
    },
    /** One step back or forward: a day, a week, a year; the list moves by a month. */
    step: (view: PlannerViewKind, anchor: string, dir: 1 | -1) =>
      view === "day" ? shiftDate(anchor, dir) : view === "week" ? shiftDate(anchor, 7 * dir) : view === "year" ? shiftDate(anchor, 365 * dir) : shiftDate(anchor, 30 * dir),
  };
  return text;
}
