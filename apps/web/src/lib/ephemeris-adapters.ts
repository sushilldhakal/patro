import {
  fetchPanchangaAtTimeForDay,
  fetchPanchangaDay,
  type LocationParams,
  type PanchangaDay,
} from "@/lib/api";
import type { PatroDayFetchState } from "@/lib/patro-day-url";
import { getLagnaSpans } from "@/lib/panchanga-format";

/** Ensure at-time lagna_spans are available for chart + cards (top-level and detail). */
export function normalizeEphemerisDay(raw: PanchangaDay): PanchangaDay {
  const detailIn = (raw.detail ?? {}) as Record<string, unknown>;
  const lagnaSpans =
    raw.lagna_spans ??
    (detailIn.lagna_spans as PanchangaDay["lagna_spans"]);

  const detail = {
    ...detailIn,
    lagna_spans: lagnaSpans,
    udaya_lagna: detailIn.udaya_lagna ?? lagnaSpans,
  };

  return {
    ...raw,
    mode: "ephemeris",
    date_ad: raw.panchanga_date_ad ?? raw.date_ad,
    lagna_spans: lagnaSpans,
    udaya_lagna: raw.udaya_lagna ?? (detailIn.udaya_lagna as PanchangaDay["udaya_lagna"]) ?? lagnaSpans,
    detail: detail as PanchangaDay["detail"],
  };
}

export function isEphemerisPanchanga(p: PanchangaDay | undefined): boolean {
  return p?.mode === "ephemeris";
}

export function chartDateAd(p: PanchangaDay | undefined, fallback: string): string {
  return p?.panchanga_date_ad ?? p?.date_ad ?? fallback;
}

/** Legacy fallback when at-time lacks lagna_spans (pre-deploy API). */
export function mergeEphemerisWithDaily(
  instant: PanchangaDay,
  daily: PanchangaDay
): PanchangaDay {
  const dailyDetail = (daily.detail ?? {}) as Record<string, unknown>;
  const instantDetail = (instant.detail ?? {}) as Record<string, unknown>;
  const lagnaSpans =
    instant.lagna_spans ??
    (instantDetail.lagna_spans as PanchangaDay["lagna_spans"]) ??
    (dailyDetail.lagna_spans as PanchangaDay["lagna_spans"]) ??
    daily.lagna_spans;

  return normalizeEphemerisDay({
    ...daily,
    ...instant,
    nivas_shool: instant.nivas_shool ?? daily.nivas_shool,
    lagna_spans: lagnaSpans,
    detail: {
      ...dailyDetail,
      ...instantDetail,
      lagna_spans: lagnaSpans,
      udaya_lagna: lagnaSpans,
      nivas_shool:
        instantDetail.nivas_shool ?? dailyDetail.nivas_shool ?? daily.nivas_shool,
      planets: instantDetail.planets ?? dailyDetail.planets,
      planets_anchor: instantDetail.planets_anchor ?? dailyDetail.planets_anchor,
      muhurta_now: instantDetail.muhurta_now ?? dailyDetail.muhurta_now,
      instant_lagna: instantDetail.instant_lagna ?? dailyDetail.instant_lagna,
    } as PanchangaDay["detail"],
  });
}

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
  const normalized = normalizeEphemerisDay(raw);

  const dailyDetail = (daily.detail ?? {}) as Record<string, unknown>;
  const instantDetail = (normalized.detail ?? {}) as Record<string, unknown>;
  const instantPlanets = (instantDetail.planets ?? normalized.planets) as
    | PanchangaDay["planets"]
    | undefined;
  const instantPlanetsAnchor = (instantDetail.planets_anchor ??
    normalized.planets_anchor ??
    dailyDetail.planets_anchor) as PanchangaDay["planets_anchor"];

  const mergedDetail = {
    ...dailyDetail,
    ...instantDetail,
    solar_corrections:
      instantDetail.solar_corrections ?? dailyDetail.solar_corrections,
    nivas_shool: instantDetail.nivas_shool ?? dailyDetail.nivas_shool ?? daily.nivas_shool,
    chandrabalam: dailyDetail.chandrabalam ?? instantDetail.chandrabalam,
    tarabalam: dailyDetail.tarabalam ?? instantDetail.tarabalam,
    chandrabala_table: dailyDetail.chandrabala_table ?? instantDetail.chandrabala_table,
    tarabala_table: dailyDetail.tarabala_table ?? instantDetail.tarabala_table,
    panchaka_rahita: dailyDetail.panchaka_rahita ?? instantDetail.panchaka_rahita,
    udaya_lagna: dailyDetail.udaya_lagna ?? instantDetail.udaya_lagna,
    chandra_rashi_spans: dailyDetail.chandra_rashi_spans ?? instantDetail.chandra_rashi_spans,
    nakshatra_pada_spans: dailyDetail.nakshatra_pada_spans ?? instantDetail.nakshatra_pada_spans,
    lagna_spans:
      getLagnaSpans(normalized) ??
      (instantDetail.lagna_spans as PanchangaDay["lagna_spans"]) ??
      (dailyDetail.lagna_spans as PanchangaDay["lagna_spans"]),
    planets: instantPlanets ?? dailyDetail.planets,
    planets_anchor: instantPlanetsAnchor,
    muhurta_now: instantDetail.muhurta_now ?? dailyDetail.muhurta_now,
    instant_lagna: instantDetail.instant_lagna ?? dailyDetail.instant_lagna,
  };

  const merged: PanchangaDay = {
    ...daily,
    ...normalized,
    nivas_shool: normalized.nivas_shool ?? daily.nivas_shool,
    chandrabalam: dailyDetail.chandrabalam ?? normalized.chandrabalam,
    tarabalam: dailyDetail.tarabalam ?? normalized.tarabalam,
    chandrabala_table: daily.chandrabala_table ?? normalized.chandrabala_table,
    tarabala_table: daily.tarabala_table ?? normalized.tarabala_table,
    panchaka_rahita: (dailyDetail.panchaka_rahita ?? normalized.panchaka_rahita) as PanchangaDay["panchaka_rahita"],
    udaya_lagna: (dailyDetail.udaya_lagna ?? normalized.udaya_lagna) as PanchangaDay["udaya_lagna"],
    planets: instantPlanets ?? normalized.planets ?? daily.planets,
    planets_anchor: instantPlanetsAnchor,
    sunrise: normalized.sunrise ?? daily.sunrise,
    sunset: normalized.sunset ?? daily.sunset,
    surya_rashi: normalized.surya_rashi ?? daily.surya_rashi,
    surya_nakshatra: normalized.surya_nakshatra ?? daily.surya_nakshatra,
    detail: mergedDetail as PanchangaDay["detail"],
  };
  merged.lagna_spans = getLagnaSpans(merged) ?? getLagnaSpans(normalized);

  if (getLagnaSpans(merged)?.length) {
    return normalizeEphemerisDay(merged);
  }

  return mergeEphemerisWithDaily(raw, daily);
}
