import { createContext, useContext } from "react";
import { WEEKDAYS_EN, WEEKDAYS_NE, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE, adMonthLabel, adToBS, bsMonthLabel, bsToAD, getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
import { useLocale } from "@vedic-patro/i18n/react";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { weekDates, weekdayOf, type PlannerViewKind } from "./calendar-views";

const parse = (iso: string) => new Date(`${iso}T12:00:00`);
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Which calendar the planner leads with, as the month grid's वि.सं. / ई.सं. choice: the day
 * numbers, month titles and year grid follow it, and the other calendar's date sits beside them.
 */
export const PlannerPrimaryDateContext = createContext<"bs" | "ad">("bs");

/** One month of the year view: its first day, the blank cells before it, and its days. */
export type PlannerYearMonth = { key: number; first: string; label: string; lead: number; days: { iso: string; n: number }[] };

/** The words and numbers the planner views print: the chosen calendar first, the other one's date beside it. */
export function usePlannerText() {
  const { t, lang, digits } = useLocale();
  const primary = useContext(PlannerPrimaryDateContext);
  const isAd = primary === "ad";
  const en = lang === "en";
  const bs = (iso: string) => adToBS(parse(iso));
  /** Year and month of a date in the chosen calendar. */
  const ym = (iso: string) => (isAd ? { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) } : bs(iso));

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
    /** The day number in the chosen calendar. */
    day: (iso: string) => (isAd ? text.adDay(iso) : text.bsDay(iso)),
    /** The month name in the chosen calendar. */
    month: (iso: string) => (isAd ? adMonthLabel(Number(iso.slice(5, 7)), lang) : text.bsMonth(iso)),
    year: (iso: string) => (isAd ? digits(Number(iso.slice(0, 4))) : text.bsYear(iso)),
    hour: (h: number) => digits(`${pad(h)}:00`),
    /**
     * An hour as Apple Calendar labels it: "7" + "am", in the reader's digits.
     */
    hourParts: (h: number): { num: string; suffix: string } => {
      // "७ am", "१२ pm" in both languages: a clock hour, not बिहान / दिउँसो / राति.
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return { num: en ? String(h12) : digits(h12), suffix: h < 12 ? "am" : "pm" };
    },
    /** The other calendar's date beside the chosen one: "18 Nov" under BS, "कात्तिक २४" under AD. */
    adShort: (iso: string) =>
      isAd ? `${text.bsMonth(iso)} ${text.bsDay(iso)}` : parse(iso).toLocaleDateString(en ? "en-GB" : "ne-NP", { day: "numeric", month: "short" }),
    /** "बुधवार – मंसिर २, २०८३" (or "– नोभेम्बर १८, २०२६" under AD): the line under the day strip. */
    dayHeading: (iso: string) => `${text.weekdayFull(iso)} – ${text.month(iso)} ${text.day(iso)}, ${text.year(iso)}`,
    /** "बुध – २": a column heading in Multi Day. */
    columnHeading: (iso: string) => `${text.weekdayShort(iso)} – ${text.day(iso)}`,
    clock: (minutes: number) => digits(`${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`),
    /** The toolbar title, as Apple Calendar's: the month for a day, days or week; the year; or "Upcoming". */
    title: (view: PlannerViewKind, anchor: string) => {
      if (view === "year") return text.year(anchor);
      if (view === "list") return t("events.upcoming");
      const shown = view === "week" ? weekDates(anchor)[3]! : anchor;
      return `${text.month(shown)} ${text.year(shown)}`;
    },
    /** Whether a date falls in the month the year view is drawing (in the chosen calendar). */
    sameMonth: (a: string, b: string) => {
      const x = ym(a);
      const y = ym(b);
      return x.year === y.year && x.month === y.month;
    },
    /** The twelve months of the anchor's year, in the chosen calendar. */
    yearMonths: (anchor: string): PlannerYearMonth[] => {
      const year = ym(anchor).year;
      return Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const firstDate = isAd ? new Date(year, i, 1, 12) : bsToAD(year, month, 1);
        const length = isAd ? new Date(year, month, 0).getDate() : getBSMonthLength(year, month);
        const first = isoOf(firstDate);
        const days = Array.from({ length }, (_, d) => ({ iso: shiftDate(first, d), n: d + 1 }));
        return { key: month, first, label: text.month(first), lead: firstDate.getDay(), days };
      });
    },
    /** One step back or forward: a day, a week, a year; the list moves by a month. */
    step: (view: PlannerViewKind, anchor: string, dir: 1 | -1) =>
      view === "day" ? shiftDate(anchor, dir) : view === "multi" ? shiftDate(anchor, 2 * dir) : view === "week" ? shiftDate(anchor, 7 * dir) : view === "year" ? shiftDate(anchor, 365 * dir) : shiftDate(anchor, 30 * dir),
  };
  return text;
}
