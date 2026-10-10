import type { CalendarDay } from "@/lib/api";
import { bsToAdOrNull, getBSMonthLength } from "@/lib/bs-calendar";
import { civilIsoFromDate, civilIsoWeekday } from "@/lib/patro-day";

/** True when Vikram month day 1 maps via the embedded JSON table (not BBS-only). */
export function bsMonthHasOfflineTable(year: number, month: number): boolean {
  return bsToAdOrNull(year, month, 1) != null;
}

export function inMonthDaysFromCalendar(calendar: CalendarDay[]): CalendarDay[] {
  return calendar.filter((d) => !d.outsideMonth);
}

export function monthGridFromApiCalendar(calendar: CalendarDay[]): {
  monthLen: number;
  firstDow: number;
} | null {
  const days = inMonthDaysFromCalendar(calendar);
  const day1 = days.find((d) => d.day === 1) ?? days[0];
  if (!day1?.date_ad) return null;
  return {
    monthLen: days.length,
    firstDow: civilIsoWeekday(day1.date_ad),
  };
}

export function bsMonthGridOffline(year: number, month: number): {
  monthLen: number;
  firstDow: number;
} | null {
  const start = bsToAdOrNull(year, month, 1);
  if (!start) return null;
  return {
    monthLen: getBSMonthLength(year, month),
    firstDow: civilIsoWeekday(civilIsoFromDate(start)),
  };
}
