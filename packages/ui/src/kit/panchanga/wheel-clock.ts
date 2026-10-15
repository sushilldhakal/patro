import type { LocationParams, PanchangaDay } from "@vedic-patro/api-client";

export function parseClockParts(clock: string): { hour: number; minute: number } {
  const [h, m] = clock.split(":");
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

/** Sunrise-anchored scrub position as an at-time datetime (app native fetch). */
export function scrubGToDatetime(anchorAd: string, scrubG: number, sunriseMin: number): string {
  const totalMin = sunriseMin + scrubG * 24;
  const dayOffset = Math.floor(totalMin / 1440);
  const minsInDay = totalMin - dayOffset * 1440;
  const h = Math.floor(minsInDay / 60);
  const m = Math.round(minsInDay % 60);
  const [y, mo, d] = anchorAd.split("-").map(Number);
  const date = new Date(y!, mo! - 1, d! + dayOffset);
  const ad = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${ad}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

export type WheelAtTimeQuery = {
  kind: "jd" | "day" | "datetime";
  jd?: number;
  clock?: string;
  datetime?: string;
  locationParams?: LocationParams;
  dayState?: unknown;
  anchorJd?: number;
};

/** App-owned fetch. The kit builds the query; it does not import the API module. */
export type WheelAtTimeClient = {
  queryKey: (query: WheelAtTimeQuery) => readonly unknown[];
  queryFn: (query: WheelAtTimeQuery) => Promise<PanchangaDay>;
};
