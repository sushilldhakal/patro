/**
 * BS year flattened into ordered days for the annual wheel scrub — same module
 * as the mobile app so window slicing and indexing stay in sync.
 */

import type { PanchangaDay, YearCalendar } from "@/lib/api";
import {
  adToBS,
  bsToAD,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  getBSMonthLength,
  shiftBsMonth,
} from "@/lib/bs-calendar";

export interface YearWheelDay {
  index: number;
  dateAd: string;
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  p?: PanchangaDay;
}

function parseBsDate(value?: string): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

export function buildYearWheelDays(payload?: YearCalendar): YearWheelDay[] {
  if (!payload?.calendar?.length) return [];

  const months = [...(payload.months ?? [])].sort((a, b) => a.month_bs - b.month_bs);
  let monthIdx = 0;
  let dayInMonth = 0;

  return payload.calendar.map((row, i) => {
    dayInMonth += 1;
    const seg = months[monthIdx];
    if (seg && dayInMonth > seg.month_length) {
      monthIdx += 1;
      dayInMonth = 1;
    }

    const embedded = row.panchanga as PanchangaDay | undefined;
    const parsed = parseBsDate(embedded?.date_bs);

    const walked = months[monthIdx];

    return {
      index: i + 1,
      dateAd: row.date_ad ?? embedded?.date_ad ?? "",
      bsYear: parsed?.year ?? payload.year_bs,
      bsMonth: parsed?.month ?? walked?.month_bs ?? 1,
      bsDay: parsed?.day ?? row.day ?? dayInMonth,
      p: embedded,
    };
  });
}

export function yearWheelIndexOfAdDate(days: YearWheelDay[], dateAd: string): number | null {
  const found = days.findIndex((d) => d.dateAd === dateAd);
  return found < 0 ? null : found + 1;
}

function adDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface WheelWindowBounds {
  startAd: string;
  endAd: string;
  years: number[];
}

export function wheelWindowBounds(
  centre: Date,
  monthsBack = 1,
  monthsFwd = 1,
): WheelWindowBounds {
  const bs = adToBS(centre);
  const back = clampBsMonth(shiftBsMonth(bs.year, bs.month, -Math.max(1, monthsBack)));
  const fwd = clampBsMonth(shiftBsMonth(bs.year, bs.month, Math.max(1, monthsFwd)));

  const startDay = Math.min(bs.day, getBSMonthLength(back.year, back.month));
  const endDay = Math.min(bs.day, getBSMonthLength(fwd.year, fwd.month));

  const start = bsToAD(back.year, back.month, startDay);
  const end = bsToAD(fwd.year, fwd.month, endDay);

  const years: number[] = [];
  for (let y = back.year; y <= fwd.year; y++) years.push(y);

  return { startAd: adDateStr(start), endAd: adDateStr(end), years };
}

function clampBsMonth(at: { year: number; month: number }): { year: number; month: number } {
  if (at.year < BS_SUPPORTED_START_YEAR) return { year: BS_SUPPORTED_START_YEAR, month: 1 };
  if (at.year > BS_SUPPORTED_END_YEAR) return { year: BS_SUPPORTED_END_YEAR, month: 12 };
  return at;
}

export function wheelWindowAtLimit({ startAd, endAd }: WheelWindowBounds): {
  start: boolean;
  end: boolean;
} {
  const from = adToBS(new Date(`${startAd}T12:00:00`));
  const to = adToBS(new Date(`${endAd}T12:00:00`));
  return {
    start: from.year <= BS_SUPPORTED_START_YEAR && from.month <= 1,
    end: to.year >= BS_SUPPORTED_END_YEAR && to.month >= 12,
  };
}

export function sliceWheelWindow(
  days: YearWheelDay[],
  { startAd, endAd }: Pick<WheelWindowBounds, "startAd" | "endAd">,
): YearWheelDay[] {
  return days
    .filter((d) => d.dateAd >= startAd && d.dateAd <= endAd)
    .map((d, i) => ({ ...d, index: i + 1 }));
}
