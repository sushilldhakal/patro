/**
 * BS year flattened into ordered days for the annual wheel scrub — same module
 * as the mobile app so window slicing and indexing stay in sync.
 */

import type { PanchangaDay, YearWheelCalendar } from "@vedic-patro/api-client";
import { type WheelWindowBounds, parseBsDate } from "@vedic-patro/domain/panchanga/panchanga-year-wheel";

export * from "@vedic-patro/domain/panchanga/panchanga-year-wheel";

export interface YearWheelDay {
  index: number;
  dateAd: string;
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  p?: PanchangaDay;
}

export function buildYearWheelDays(payload?: YearWheelCalendar): YearWheelDay[] {
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

export function sliceWheelWindow(
  days: YearWheelDay[],
  { startAd, endAd }: Pick<WheelWindowBounds, "startAd" | "endAd">,
): YearWheelDay[] {
  return days
    .filter((d) => d.dateAd >= startAd && d.dateAd <= endAd)
    .map((d, i) => ({ ...d, index: i + 1 }));
}
