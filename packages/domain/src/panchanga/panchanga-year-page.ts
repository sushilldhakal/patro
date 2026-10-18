/** Shared by apps/web/src/pages/PanchangaYear.tsx and apps/mobile/app/(tabs)/panchanga/year.tsx (moved here from both, unchanged). */
import { adToBS, shiftBsMonth, bsToAD, getBSMonthLength } from "../calendar/bs-calendar";

export function parseAdStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function shiftAnchorMonths(centre: Date, delta: number): Date {
  const bs = adToBS(centre);
  const next = shiftBsMonth(bs.year, bs.month, delta);
  return bsToAD(next.year, next.month, Math.min(bs.day, getBSMonthLength(next.year, next.month)));
}
