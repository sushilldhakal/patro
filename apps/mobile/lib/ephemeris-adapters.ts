import {
  fetchPanchanga,
  fetchPanchangaAtTime,
  type LocationParams,
  type PanchangaDay,
} from "@/lib/api";
import { mergeEphemerisAtTimeWithDaily } from "@vedic-patro/domain/ephemeris-adapters";

export function buildAtTimeDatetime(adDate: string, clock: string): string {
  const [hh, mm] = clock.split(":");
  // A rounded-up source clock can read "16:60"; the API rejects that with a 400,
  // so carry the minutes into the hour and keep the result within the day.
  const total = Math.min(
    23 * 60 + 59,
    Math.max(0, (Number(hh ?? 12) || 0) * 60 + (Number(mm) || 0)),
  );
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${adDate}T${h}:${m}:00`;
}

/**
 * Ephemeris day from `/panchanga/at-time` — uses API lagna_spans directly.
 * Falls back to daily merge only when the API omits spans (older deployment).
 */
export async function fetchEphemerisPanchangaDay(
  datetime: string,
  civilDateAd: string,
  location?: LocationParams,
  options?: { ayanamsha?: string }
): Promise<PanchangaDay> {
  const raw = await fetchPanchangaAtTime(datetime, location, options);
  const anchor = raw.panchanga_date_ad ?? raw.date_ad ?? civilDateAd;
  const daily = await fetchPanchanga(anchor, "ad", location);
  return mergeEphemerisAtTimeWithDaily(raw, daily);
}
