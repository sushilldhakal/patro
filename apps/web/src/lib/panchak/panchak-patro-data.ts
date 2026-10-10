import type { PanchakPeriodResponse } from "@/lib/api";
import { getCurrentBs } from "@/lib/bs-calendar";

export interface PanchakMoment {
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  timeNe: string;
  timeEn: string;
  ad: string;
}

export interface PanchakPeriod {
  start: PanchakMoment;
  end: PanchakMoment;
  durationNe: string;
  durationEn: string;
}

export function mapPanchakPeriod(row: PanchakPeriodResponse): PanchakPeriod {
  return {
    start: {
      bsYear: row.start.bs_year,
      bsMonth: row.start.bs_month,
      bsDay: row.start.bs_day,
      timeNe: row.start.time_ne,
      timeEn: row.start.time_en,
      // Slice to the bare civil date — `iso` carries the Nepal offset, so the
      // date before "T" is already the Nepal-local day; fmtAdShort re-anchors
      // it to local noon when formatting, matching every other `ad` field.
      ad: row.start.iso.slice(0, 10),
    },
    end: {
      bsYear: row.end.bs_year,
      bsMonth: row.end.bs_month,
      bsDay: row.end.bs_day,
      timeNe: row.end.time_ne,
      timeEn: row.end.time_en,
      ad: row.end.iso.slice(0, 10),
    },
    durationNe: row.duration_ne,
    durationEn: row.duration_en,
  };
}

export function defaultPanchakPatroYear(): number {
  return getCurrentBs().year;
}
