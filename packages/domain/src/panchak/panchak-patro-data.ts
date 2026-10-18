import { getCurrentBs } from "../bs-calendar";

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

export function defaultPanchakPatroYear(): number {
  return getCurrentBs().year;
}
