import type { PanchangaDay, LagnaSpan } from "@vedic-patro/api-client";
import { getLagnaSpans, getPanchangaDetail, getSunrise } from "./panchanga-format";
import { GRAHA_EN, GRAHA_KEYS, GRAHA_NE, GRAHA_SYMS, MEAN_MOTION_PER_DAY, type PlanetDetail, type TithiLike, WEEKDAY_NE_TO_EN, type WheelDetail, type WheelGraha, type WheelMarkers, type WheelRashi, buildWheelMarkersFromDetail, elongationWithinBand, getWheelRashis, ghatiFromTithiEndStamp, grahaLon, grahaLonAtG, interpolateAngle, maxElongRateWithinBand, normDeg, parseGhatiClock, parseHoursClockToGhati, planetDegrees, planetLongitude, rashiFromNe, rashiFromNumber, rashiIndexFromNe, shouldHoldUdayaTithiAllDay } from "@vedic-patro/domain/panchanga/wheel-data";

export * from "@vedic-patro/domain/panchanga/wheel-data";

function sunriseMinutes(p: PanchangaDay): number {
  const sunrise = getSunrise(p);
  if (!sunrise) return 6 * 60;
  const [h, m] = sunrise.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function ghatiFromLagnaSpan(span: LagnaSpan): number | null {
  return (
    parseHoursClockToGhati(span.end_hours_clock) ??
    parseGhatiClock(span.end_ghati_clock)
  );
}

function getTithiBlock(p: PanchangaDay): TithiLike | undefined {
  const detail = getPanchangaDetail(p);
  return (detail?.tithi ?? p.tithi) as TithiLike | undefined;
}

function resolveTithiEndGhati(p: PanchangaDay, sunriseMin: number): number | null {
  const tithi = getTithiBlock(p);
  if (!tithi) return null;
  const anchor = p.date_ad ?? p.panchanga_date_ad ?? "";
  return (
    parseHoursClockToGhati(tithi.end_hours_clock) ??
    parseGhatiClock(tithi.end_ghati_clock) ??
    ghatiFromTithiEndStamp(tithi.end, anchor, sunriseMin)
  );
}

function lagnaSpanLongitude(span: LagnaSpan): number {
  if (span.longitude != null) return normDeg(span.longitude);
  const rashiNum = span.number ?? rashiIndexFromNe(span.name_ne);
  const deg = span.degree_in_rashi ?? 0;
  if (rashiNum != null) return normDeg((rashiNum - 1) * 30 + deg);
  return 0;
}

function lagnaLongitudeAtG(p: PanchangaDay, g: number): number | null {
  const spans = getLagnaSpans(p);
  if (!spans?.length) return null;

  let fromG = 0;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    const rawEnd = ghatiFromLagnaSpan(span);
    const toG = rawEnd != null ? Math.min(rawEnd, 60) : i === spans.length - 1 ? 60 : null;
    if (toG == null || toG <= fromG) continue;

    const lonStart = lagnaSpanLongitude(span);
    const next = spans[i + 1];
    const lonEnd = next ? lagnaSpanLongitude(next) : lonStart;

    if (g >= fromG && g <= toG) {
      const t = toG > fromG ? (g - fromG) / (toG - fromG) : 0;
      return interpolateAngle(lonStart, lonEnd, t);
    }
    fromG = toG;
  }
  return lagnaSpanLongitude(spans[spans.length - 1]!);
}

/**
 * The moon's longitude at `g` ghati past sunrise, extrapolated from its
 * reported sunrise longitude.
 *
 * We deliberately don't interpolate from the API's chandra-rashi-span
 * boundaries: those spans only describe the slice of a (possibly
 * multi-day) rashi transit that falls within today, so stretching a full
 * 30° sweep across just that slice wildly overstates the moon's speed
 * and produces spurious extra tithi/nakshatra transitions while scrubbing.
 *
 * Instead of a flat mean rate, we calibrate the sun-moon elongation's
 * local rate against the API's authoritative tithi end (ghati/hours clock, or
 * simplified `tithi.end` stamp from year bulk) whenever it's available.
 * Vriddhi / repeated-u daya days (end past next sunrise, or a tail slice
 * right after sunrise) keep the udaya tithi band highlighted for the full
 * vedic day so the wheel matches the calendar tithi.
 */
function moonLonAtG(p: PanchangaDay, det: WheelDetail, g: number): number {
  const moon = det.grahas[1];
  const sun = det.grahas[0];
  if (!moon) return 0;
  const moon0 = grahaLon(moon);
  if (!sun) return normDeg(moon0 + (g / 60) * MEAN_MOTION_PER_DAY[1]);

  const sun0 = grahaLon(sun);
  const elong0 = normDeg(moon0 - sun0);
  const band = Math.floor(elong0 / 12);
  const gEnd = resolveTithiEndGhati(p, det.sunriseMin);
  const holdAllDay = shouldHoldUdayaTithiAllDay(elong0, gEnd);

  const sunAtG = normDeg(sun0 + (g / 60) * MEAN_MOTION_PER_DAY[0]);

  if (holdAllDay) {
    return normDeg(sunAtG + elongationWithinBand(elong0, g));
  }

  let elongRate = (MEAN_MOTION_PER_DAY[1] - MEAN_MOTION_PER_DAY[0]) / 60;
  const boundary = (band + 1) * 12;

  if (gEnd != null && gEnd > 0.25 && gEnd < 60) {
    elongRate = (boundary - elong0) / gEnd;
  } else if (gEnd != null && gEnd >= 60) {
    elongRate = maxElongRateWithinBand(elong0);
  } else {
    elongRate = Math.min(elongRate, maxElongRateWithinBand(elong0));
  }

  return normDeg(sunAtG + elong0 + elongRate * g);
}

function lagnaLongitudeFromPanchanga(p: PanchangaDay): number | undefined {
  const detail = getPanchangaDetail(p);
  const lagna = (detail?.lagna ?? p.lagna) as
    | { name?: string; name_ne?: string; degree_in_rashi?: number; longitude?: number }
    | undefined;
  if (!lagna) return undefined;
  const lon = planetLongitude({
    longitude: lagna.longitude,
    rashi_ne: lagna.name_ne,
    deg_in_rashi: lagna.degree_in_rashi,
  });
  return lon ?? undefined;
}

/**
 * Markers straight from an exact-moment panchanga response (e.g. the
 * `/panchanga/at-time` scrub query) — the sun/moon/planet longitudes are the
 * API's own, so the tithi/karana/nakshatra rings always land on the same
 * band as the reported panchanga for that instant. Use this whenever exact
 * data is available; fall back to `buildWheelMarkers`'s extrapolation only
 * while that data hasn't loaded yet.
 */
export function buildWheelMarkersAtTime(p: PanchangaDay): WheelMarkers {
  const det = buildWheelDetail(p);
  return buildWheelMarkersFromDetail(det, lagnaLongitudeFromPanchanga(p));
}

/**
 * Ghati-extrapolated markers, used only while the exact at-time response is
 * still loading. Prefer {@link buildWheelMarkersAtTime} once that data lands.
 */
export function buildWheelMarkers(
  p: PanchangaDay,
  det: WheelDetail,
  scrubG: number
): WheelMarkers {
  const lagnaLon = lagnaLongitudeAtG(p, scrubG) ?? grahaLon(det.grahas[0] ?? { sym: "", ne: "", en: "", rashi: getWheelRashis()[0]!, deg: [0, 0, 0] });
  // Tithi / karana rings stay on the udaya-calibrated elongation so the
  // highlighted band matches the calendar. The moon *body* uses mean motion
  // so a sunrise→sunrise scrub arrives at the next sunrise, not yesterday's.
  const moonLon = moonLonAtG(p, det, scrubG);
  const moon0 = det.grahas[1] ? grahaLon(det.grahas[1]) : 0;
  const moonBody = normDeg(moon0 + (scrubG / 60) * MEAN_MOTION_PER_DAY[1]);
  const moonNak = Math.floor(normDeg(moonBody) / (360 / 27));

  const rahuBase = det.grahas[7] ? grahaLonAtG(det.grahas[7], 7, scrubG, moonBody) : undefined;
  const planetLons = det.grahas.map((gr, i) =>
    i === 1 ? moonBody : grahaLonAtG(gr, i, scrubG, moonBody, rahuBase)
  );
  const sunLon = planetLons[0] ?? grahaLon(det.grahas[0] ?? { sym: "", ne: "", en: "", rashi: getWheelRashis()[0]!, deg: [0, 0, 0] });

  return {
    lagnaLon,
    sunLon,
    moonLon,
    moonNak,
    planetLons,
  };
}

export function buildWheelDetail(p: PanchangaDay): WheelDetail {
  const detail = getPanchangaDetail(p);
  const planets = (detail?.planets ?? p.planets) as Record<string, PlanetDetail | string> | undefined;

  const grahas: WheelGraha[] = GRAHA_KEYS.map((key, i) => {
    const info = planets?.[key];
    let rashi: WheelRashi | undefined;
    let deg: [number, number, number] = [0, 0, 0];
    let longitude: number | undefined;
    const node = key === "rahu" || key === "ketu";
    let retrograde = node;

    if (info && typeof info !== "string") {
      rashi = rashiFromNe(info.rashi_ne) ?? rashiFromNumber(info.rashi);
      deg = planetDegrees(info);
      const lon = planetLongitude(info);
      if (lon != null) longitude = lon;
      if (info.is_retrograde != null || info.retrograde != null) {
        retrograde = Boolean(info.is_retrograde ?? info.retrograde);
      }
    }

    if (!rashi) {
      rashi = getWheelRashis()[i % 12]!;
    }

    return {
      sym: GRAHA_SYMS[i]!,
      ne: GRAHA_NE[i]!,
      en: GRAHA_EN[i]!,
      rashi,
      deg,
      longitude,
      retrograde,
    };
  });

  // Ketu opposite Rahu when missing
  const rahuLon = grahas[7]?.longitude;
  if (rahuLon != null && grahas[8] && grahas[8].longitude == null) {
    grahas[8].longitude = normDeg(rahuLon + 180);
  }

  const tithi = (detail?.tithi ?? p.tithi) as { name_ne?: string; name?: string } | undefined;
  const tithiNe = tithi?.name_ne ?? tithi?.name ?? "—";
  const tithiEn = tithi?.name ?? tithi?.name_ne ?? "—";

  const weekdayRaw = p.weekday ?? detail?.weekday;
  let weekdayNe = "—";
  let weekdayEn = "—";
  if (typeof weekdayRaw === "string") {
    weekdayNe = weekdayRaw;
    weekdayEn = WEEKDAY_NE_TO_EN[weekdayRaw] ?? weekdayRaw;
  } else if (weekdayRaw && typeof weekdayRaw === "object") {
    const w = weekdayRaw as { ne?: string; name_ne?: string; en?: string; name_english?: string };
    weekdayNe = w.name_ne ?? w.ne ?? "—";
    weekdayEn = w.name_english ?? w.en ?? WEEKDAY_NE_TO_EN[weekdayNe] ?? weekdayNe;
  }

  return {
    sunriseMin: sunriseMinutes(p),
    grahas,
    tithi2: [{ ne: tithiNe, en: tithiEn }],
    weekday: { ne: weekdayNe, en: weekdayEn },
  };
}
