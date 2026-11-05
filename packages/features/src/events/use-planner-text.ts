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
    /**
     * An hour as Apple Calendar labels it: "7" + "am", "Midday" at noon. Nepali says the part of the
     * day instead: बिहान ७, दिउँसो २, बेलुका ६, राति ९.
     */
    hourParts: (h: number): { num: string; suffix: string } => {
      if (h === 12) return { num: "", suffix: t("calendar.midday") };
      const h12 = h % 12 === 0 ? 12 : h % 12;
      if (en) return { num: String(h12), suffix: h < 12 ? "am" : "pm" };
      const part = h >= 4 && h < 12 ? "calendar.part_morning" : h >= 12 && h < 17 ? "calendar.part_afternoon" : h >= 17 && h < 20 ? "calendar.part_evening" : "calendar.part_night";
      return { num: digits(h12), suffix: t(part) };
    },
    /** "18 Nov" in the reader's language, the Gregorian date beside the BS one. */
    adShort: (iso: string) => parse(iso).toLocaleDateString(en ? "en-GB" : "ne-NP", { day: "numeric", month: "short" }),
    /** "बुधवार – मंसिर २, २०८३": the line under the day strip. */
    dayHeading: (iso: string) => `${text.weekdayFull(iso)} – ${text.bsMonth(iso)} ${text.bsDay(iso)}, ${text.bsYear(iso)}`,
    /** "बुध – २": a column heading in Multi Day. */
    columnHeading: (iso: string) => `${text.weekdayShort(iso)} – ${text.bsDay(iso)}`,
    clock: (minutes: number) => digits(`${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`),
    /** The toolbar title, as Apple Calendar's: the month for a day, days or week; the year; or "Upcoming". */
    title: (view: PlannerViewKind, anchor: string) => {
      if (view === "year") return digits(bs(anchor).year);
      if (view === "list") return t("events.upcoming");
      const shown = view === "week" ? weekDates(anchor)[3]! : anchor;
      return `${text.bsMonth(shown)} ${text.bsYear(shown)}`;
    },
    /** One step back or forward: a day, a week, a year; the list moves by a month. */
    step: (view: PlannerViewKind, anchor: string, dir: 1 | -1) =>
      view === "day" ? shiftDate(anchor, dir) : view === "multi" ? shiftDate(anchor, 2 * dir) : view === "week" ? shiftDate(anchor, 7 * dir) : view === "year" ? shiftDate(anchor, 365 * dir) : shiftDate(anchor, 30 * dir),
  };
  return text;
}
