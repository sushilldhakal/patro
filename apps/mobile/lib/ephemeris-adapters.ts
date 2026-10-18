import {
  fetchPanchanga,
  fetchPanchangaAtTime,
  type LocationParams,
  type PanchangaDay,
} from "@/lib/api";
import { mergeEphemerisAtTimeWithDaily } from "@vedic-patro/read-models/ephemeris-adapters";

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
  options?: {
    ayanamsha?: string;
    /**
     * Where the daily panchanga comes from — the page passes its query cache,
     * so the day it already loaded (or is loading) is reused rather than
     * downloaded again. The browser answers that repeat from its HTTP cache;
     * the app's fetch has none, so it was a second ~140 KB round trip.
     */
    dailyFor?: (dateAd: string) => Promise<PanchangaDay>;
  }
): Promise<PanchangaDay> {
  const dailyFor = options?.dailyFor ?? ((dateAd: string) => fetchPanchanga(dateAd, "ad", location));
  // Started alongside the at-time request: it is almost always the anchor day.
  const civilDaily = dailyFor(civilDateAd);
  civilDaily.catch(() => undefined);
  const raw = await fetchPanchangaAtTime(datetime, location, { ayanamsha: options?.ayanamsha });
  const anchor = raw.panchanga_date_ad ?? raw.date_ad ?? civilDateAd;
  const daily = await (anchor === civilDateAd ? civilDaily : dailyFor(anchor));
  return mergeEphemerisAtTimeWithDaily(raw, daily);
}
