import {
  fetchPanchangaAtTimeForDay,
  fetchPanchangaDay,
  type LocationParams,
  type PanchangaDay,
} from "@/lib/api";
import type { PatroDayFetchState } from "@/lib/patro-day-url";
import { mergeEphemerisAtTimeWithDaily } from "@vedic-patro/domain/ephemeris-adapters";

/**
 * Ephemeris day from `/panchanga/at-time` — calendar parts + clock for BBS/BC
 * input browse; `jd` + clock for JD identity (CE). Raw `jd` alone breaks on
 * pre-1 CE civil days (backend cannot isoformat the anchor).
 */
export async function fetchEphemerisPanchangaDay(
  dayState: PatroDayFetchState,
  clock: string,
  location?: LocationParams,
  options?: { ayanamsha?: string; resolvedJdUt?: number },
): Promise<PanchangaDay> {
  const raw = await fetchPanchangaAtTimeForDay(dayState, clock, location, options);
  const daily = await fetchPanchangaDay(dayState, location);
  return mergeEphemerisAtTimeWithDaily(raw, daily);
}
