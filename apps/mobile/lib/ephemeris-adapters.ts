import {
  fetchPanchanga,
  fetchPanchangaAtTime,
  type LocationParams,
  type PanchangaDay,
} from "@/lib/api";
import { getLagnaSpans } from "@vedic-patro/domain/panchanga-format";

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
