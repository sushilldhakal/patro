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

function panchakMomentAd(moment: PanchakPeriodResponse["start"]): string {
  if (moment.iso) return moment.iso.slice(0, 10);
  if (moment.date_ad) return moment.date_ad.slice(0, 10);
  return `${moment.bs_year}-${moment.bs_month}-${moment.bs_day}`;
}

export function mapPanchakPeriod(row: PanchakPeriodResponse): PanchakPeriod {
  return {
    start: {
      bsYear: row.start.bs_year,
      bsMonth: row.start.bs_month,
      bsDay: row.start.bs_day,
      timeNe: row.start.time_ne,
      timeEn: row.start.time_en,
      ad: panchakMomentAd(row.start),
    },
    end: {
      bsYear: row.end.bs_year,
      bsMonth: row.end.bs_month,
      bsDay: row.end.bs_day,
      timeNe: row.end.time_ne,
      timeEn: row.end.time_en,
      ad: panchakMomentAd(row.end),
    },
    durationNe: row.duration_ne,
    durationEn: row.duration_en,
  };
}

export function defaultPanchakPatroYear(): number {
  return getCurrentBs().year;
}
