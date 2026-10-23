/**
 * Pure parts of the calendar header (month + year picker, jump-to-year box):
 * no React, no copy. `use-patro-calendar-header.ts` wraps these; the tests in
 * `test/patro-calendar-header.test.ts` pin them down.
 */
import type { Era } from "@vedic-patro/domain/calendar/era";
import { monthLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { isValidBrowseYear, maxBrowseYearForEra } from "@vedic-patro/domain/calendar/patro-year-axis";

const DEVANAGARI_ZERO = 0x0966;

/** "२०८३", "2083" or "२0८3" → "2083"; anything that is not a digit is dropped. */
export function digitsToLatin(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= DEVANAGARI_ZERO && code < DEVANAGARI_ZERO + 10) out += String(code - DEVANAGARI_ZERO);
    else if (ch >= "0" && ch <= "9") out += ch;
  }
  return out;
}

/** The year typed in the jump box, or `null` when it is empty or outside the era's range. */
export function parseYearInput(text: string, era: Era): number | null {
  const digits = digitsToLatin(text);
  if (!digits) return null;
  const year = Number.parseInt(digits, 10);
  return isValidBrowseYear(era, year) ? year : null;
}

export type MonthOption = { month: number; label: string; selected: boolean };

/** The twelve month buttons of the picker, named for the era being browsed in the UI language (English BS → Baisakh…). */
export function monthOptions(era: Era, selectedMonth: number, lang: string): MonthOption[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: monthLabel(era, i + 1, lang),
    selected: i + 1 === selectedMonth,
  }));
}

// ─── Year grid (the paged 12-year chips of the year and date pickers) ─────────

export const YEAR_PAGE_SIZE = 12;

/** The page of years that shows `year` (with four before it, as the picker opens). */
export function yearPageStart(year: number): number {
  return Math.max(1, year - 4);
}

/** The page after moving `delta` pages, kept inside the era's range. */
export function shiftYearPage(era: Era, start: number, delta: 1 | -1): number {
  const max = maxBrowseYearForEra(era);
  let next = Math.max(1, start + delta * YEAR_PAGE_SIZE);
  if (max != null) next = Math.min(next, Math.max(1, max - YEAR_PAGE_SIZE + 1));
  return next;
}

/** The years of one page that the era can browse. */
export function yearPageYears(era: Era, start: number): number[] {
  return Array.from({ length: YEAR_PAGE_SIZE }, (_, i) => start + i).filter((y) => isValidBrowseYear(era, y));
}

/** The Gregorian years a Bikram Sambat year spans (`[2083 → 2026, 2027]`); null for other eras. */
export function gregorianSpanOfBsYear(era: Era, year: number): [number, number] | null {
  return era === "bs" ? [year - 57, year - 56] : null;
}

// ─── Day grid ────────────────────────────────────────────────────────────────

/** Weekday (0 = Sunday) of the first of the month, from any day of it and that day's weekday. */
export function firstWeekdayOfMonth(day: number, weekdayOfDay: number): number {
  return (((weekdayOfDay - (day - 1)) % 7) + 7) % 7;
}

export type DayCell = { day: number | null; weekday: number };

/** Cells of the month grid: blanks for the days before the 1st, then 1..daysInMonth. */
export function dayCells(daysInMonth: number, firstWeekday: number): DayCell[] {
  const cells: DayCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, weekday: i });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, weekday: (firstWeekday + d - 1) % 7 });
  return cells;
}

// ─── Clock ───────────────────────────────────────────────────────────────────

export type ClockParts = { hour: number; minute: number };

export const MINUTE_STEP = 5;

/** "09:30" → `{ hour: 9, minute: 30 }`; anything unreadable is 00:00. */
export function parseClock(clock: string | undefined): ClockParts {
  const [h, m] = (clock ?? "").split(":");
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.trunc(hour))) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, Math.trunc(minute))) : 0,
  };
}

export function formatClock({ hour, minute }: ClockParts): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** One press of a stepper: hours move by 1, minutes by five; both wrap round. */
export function stepClock(parts: ClockParts, field: "hour" | "minute", direction: 1 | -1): ClockParts {
  if (field === "hour") return { ...parts, hour: (parts.hour + direction + 24) % 24 };
  return { ...parts, minute: (parts.minute + direction * MINUTE_STEP + 60) % 60 };
}
