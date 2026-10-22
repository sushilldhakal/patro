/**
 * A screen's chosen day that follows the reader's browsed month: it opens on the
 * month last browsed anywhere (today's day number), and a day picked here becomes
 * that month for every other page. The app's day screens (rashifal, gochar,
 * element tables, the year wheel) keep their date in this instead of `useState`.
 */
import { useEffect, useState } from "react";
import { adToBS } from "@vedic-patro/domain/calendar/bs-calendar";
import { rememberBrowse, rememberedDayDate } from "@vedic-patro/domain/calendar/remembered-browse";

export function useBrowsedDay(fallback: () => Date) {
  const [date, setDate] = useState<Date>(() => {
    const last = rememberedDayDate();
    return last ? new Date(last.getFullYear(), last.getMonth(), last.getDate(), 12) : fallback();
  });
  useEffect(() => {
    const bs = adToBS(date);
    rememberBrowse("bs", bs.year, bs.month);
  }, [date]);
  return [date, setDate] as const;
}

/** The same for a screen that browses a BS month (year + month state). */
export function useBrowsedBsMonth(today: { year: number; month: number }) {
  const [initial] = useState(() => {
    const last = rememberedDayDate();
    if (!last) return today;
    const bs = adToBS(last);
    return { year: bs.year, month: bs.month };
  });
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  useEffect(() => {
    rememberBrowse("bs", year, month);
  }, [year, month]);
  return { year, setYear, month, setMonth };
}
