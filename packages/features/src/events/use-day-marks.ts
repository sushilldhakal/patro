import { useQueries } from "@tanstack/react-query";
import { fetchFestivals, fetchHolidays, type LocationParams } from "@vedic-patro/api-client";
import { adToBS } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { useLocale } from "@vedic-patro/i18n/react";

/** What the national calendar marks on a day: festival names, and whether it is a public holiday. */
export type DayMark = { names: string[]; holiday: boolean };

const HOUR = 60 * 60 * 1000;
const parse = (iso: string) => new Date(`${iso}T12:00:00`);

/**
 * Festivals and public holidays by AD date ("YYYY-MM-DD") for the BS years that `from`..`to` touch,
 * for the planner views (a week, a day, a year, a list).
 */
export function useDayMarks(from: string, to: string, location?: LocationParams, enabled = true) {
  const { lang } = useLocale();
  const years = [...new Set([adToBS(parse(from)).year, adToBS(parse(to)).year])];
  const results = useQueries({
    queries: years.flatMap((year) => [
      { queryKey: ["planner", "holidays", year, lang, location], queryFn: () => fetchHolidays(year, "bs", location, lang), staleTime: HOUR, enabled },
      { queryKey: ["planner", "festivals", year, lang, location], queryFn: () => fetchFestivals(year, { era: "bs", location, language: lang }), staleTime: HOUR, enabled },
    ]),
  });

  const marks = new Map<string, DayMark>();
  const add = (start: string | undefined, end: string | undefined, name: string, holiday: boolean) => {
    if (!start) return;
    const last = end && end >= start ? end : start;
    for (let d = start, n = 0; d <= last && n < 20; d = shiftDate(d, 1), n++) {
      const mark = marks.get(d) ?? { names: [], holiday: false };
      if (name && !mark.names.includes(name)) mark.names.push(name);
      mark.holiday = mark.holiday || holiday;
      marks.set(d, mark);
    }
  };
  for (const r of results) {
    const data = r.data as { holidays?: HolidayLike[]; festivals?: HolidayLike[] } | undefined;
    for (const item of [...(data?.holidays ?? []), ...(data?.festivals ?? [])]) {
      const name = (lang === "en" ? (item.name_en ?? item.name ?? item.name_ne) : (item.name_ne ?? item.name ?? item.name_en)) ?? "";
      add(item.start_date, item.end_date, name, Boolean(item.is_public_holiday));
    }
  }
  return { marks, loading: results.some((r) => r.isLoading) };
}

type HolidayLike = { name?: string; name_en?: string; name_ne?: string; start_date?: string; end_date?: string; is_public_holiday?: boolean };
