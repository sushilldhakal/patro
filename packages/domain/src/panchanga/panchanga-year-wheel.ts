/**
 * BS year flattened into ordered days for the annual wheel scrub — same module
 * as the mobile app so window slicing and indexing stay in sync.
 */

import { adToBS, bsToAD, BS_SUPPORTED_END_YEAR, BS_SUPPORTED_START_YEAR, getBSMonthLength, shiftBsMonth } from "../calendar/bs-calendar";

export function parseBsDate(value?: string): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
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
