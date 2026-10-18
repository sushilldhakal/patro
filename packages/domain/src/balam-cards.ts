import { formatShortClock } from "./panchanga-format";

export function parseClockToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatBalamTimeRange(start?: string | null, end?: string | null): string | undefined {
  const a = formatShortClock(start);
  const b = formatShortClock(end);
  if (!a || !b) return undefined;
  return `${a}-${b}`;
}

export function isClockInRange(clockMin: number, startMin: number | null, endMin: number | null): boolean {
  if (startMin == null || endMin == null) return false;
  if (endMin > startMin) return clockMin >= startMin && clockMin < endMin;
  return clockMin >= startMin || clockMin < endMin;
}
