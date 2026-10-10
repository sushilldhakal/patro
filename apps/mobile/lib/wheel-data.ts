import type { PanchangaDay, LagnaSpan } from "@/lib/api";
import { BS_MONTHS_NE } from "@/lib/bs-calendar";
import {
  formatRashiDisplayNe,
  getLagnaSpans,
  getPanchangaDetail,
  getSunrise,
  RASHI_SYM,
  toNepaliDigits,
} from "@/lib/panchanga-format";

const RASHI_NE = [
  "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
  "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
] as const;

const RASHI_EN = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
] as const;

export const WHEEL_RASHIS = RASHI_NE.map((ne, i) => ({
  ne: formatRashiDisplayNe(ne) ?? ne,
  en: RASHI_EN[i]!,
  sym: RASHI_SYM[i]!,
}));

export const GREG_NE = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
] as const;

export const RASHI_LORDS = [
  "मङ्गल", "शुक्र", "बुध", "चन्द्र", "सूर्य", "बुध",
  "शुक्र", "मङ्गल", "गुरु", "शनि", "शनि", "गुरु",
] as const;

export const RASHI_ELEM = [
  "अग्नि", "पृथ्वी", "वायु", "जल", "अग्नि", "पृथ्वी",
  "वायु", "जल", "अग्नि", "पृथ्वी", "वायु", "जल",
] as const;

/** Nakshatra pada naamakshar — 27 × 4, used on the pada ring. */
export const PADA_AKSHAR: readonly (readonly string[])[] = [
  ["चू", "चे", "चो", "ला"], ["ली", "लू", "ले", "लो"], ["अ", "ई", "उ", "ए"],
  ["ओ", "वा", "वी", "वू"], ["वे", "वो", "का", "की"], ["कु", "घ", "ङ", "छ"],
  ["के", "को", "हा", "ही"], ["हू", "हे", "हो", "डा"], ["डी", "डू", "डे", "डो"],
  ["मा", "मी", "मू", "मे"], ["मो", "टा", "टी", "टू"], ["टे", "टो", "पा", "पी"],
  ["पू", "ष", "ण", "ठ"], ["पे", "पो", "रा", "री"], ["रू", "रे", "रो", "ता"],
  ["ती", "तू", "ते", "तो"], ["ना", "नी", "नू", "ने"], ["नो", "या", "यी", "यू"],
  ["ये", "यो", "भा", "भी"], ["भू", "धा", "फा", "ढा"], ["भे", "भो", "जा", "जी"],
  ["खी", "खू", "खे", "खो"], ["गा", "गी", "गु", "गे"], ["गो", "सा", "सी", "सू"],
  ["से", "सो", "दा", "दी"], ["दू", "थ", "झ", "ञ"], ["दे", "दो", "चा", "ची"],
] as const;

export const GRAHA_META = [
  { orbit: 120, color: "#f2a81d", big: true },
  { orbit: 44, color: "#d3dce4" },
  { orbit: 150, color: "#d0552e" },
  { orbit: 70, color: "#9aa69e" },
  { orbit: 178, color: "#dcae54" },
  { orbit: 96, color: "#e6cd86" },
  { orbit: 204, color: "#c6a14b", ring: true },
  { orbit: 216, color: "#7b8aa0" },
  { orbit: 216, color: "#7b8aa0" },
] as const;

const GRAHA_KEYS = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
] as const;

const GRAHA_SYMS = ["", "", "", "", "", "", "", "", ""] as const;
const GRAHA_NE = ["सूर्य", "चन्द्र", "मंगल", "बुध", "बृहस्पति", "शुक्र", "शनि", "राहु", "केतु"] as const;

export interface WheelRashi {
  ne: string;
  en: string;
  sym: string;
}

export interface WheelGraha {
  sym: string;
  ne: string;
  rashi: WheelRashi;
  deg: [number, number, number];
  longitude?: number;
}

export interface WheelDetail {
  sunriseMin: number;
  grahas: WheelGraha[];
  tithi2: { ne: string; en: string }[];
  weekday: { ne: string; en: string };
}

export interface WheelTweaks {
  show_greg: boolean;
  show_lunar: boolean;
  show_pada: boolean;
  show_planets: boolean;
  show_today: boolean;
}

export const DEFAULT_WHEEL_TWEAKS: WheelTweaks = {
  show_greg: false,
  show_lunar: true,
  show_pada: true,
  show_planets: true,
  show_today: true,
};

function rashiFromNe(nameNe?: string | null): WheelRashi | undefined {
  if (!nameNe) return undefined;
  const display = formatRashiDisplayNe(nameNe) ?? nameNe;
  const idx = WHEEL_RASHIS.findIndex((r) => r.ne === display || r.ne === nameNe);
  if (idx >= 0) return WHEEL_RASHIS[idx]!;
  const altIdx = RASHI_NE.findIndex((n) => n === nameNe);
  if (altIdx >= 0) return WHEEL_RASHIS[altIdx]!;
  return undefined;
}

function rashiFromNumber(rashi?: number): WheelRashi | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return WHEEL_RASHIS[rashi - 1];
}

type PlanetDetail = {
  longitude?: number;
  rashi?: number;
  rashi_ne?: string;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
};

function planetDegrees(info: PlanetDetail): [number, number, number] {
  if (info.dms_in_rashi) {
    const match = info.dms_in_rashi.match(/(\d+)°(\d+)'(\d+)"/);
    if (match) {
      return [Number(match[1]), Number(match[2]), Number(match[3])];
    }
  }
  if (info.deg_in_rashi != null) {
    const deg = Math.floor(info.deg_in_rashi);
    const min = Math.floor((info.deg_in_rashi - deg) * 60);
    const sec = Math.round(((info.deg_in_rashi - deg) * 60 - min) * 60);
    return [deg, min, sec];
  }
  if (info.longitude != null) {
    const rem = info.longitude % 30;
    const deg = Math.floor(rem);
    const min = Math.floor((rem - deg) * 60);
    const sec = Math.round(((rem - deg) * 60 - min) * 60);
    return [deg, min, sec];
  }
  return [0, 0, 0];
}

function sunriseMinutes(p: PanchangaDay): number {
  const sunrise = getSunrise(p);
  if (!sunrise) return 6 * 60;
  const [h, m] = sunrise.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function planetLongitude(info: PlanetDetail): number | null {
  if (info.longitude != null) return normDeg(info.longitude);
  if (info.rashi != null) {
    const deg =
      info.deg_in_rashi ??
      (info.dms_in_rashi
        ? (() => {
            const m = info.dms_in_rashi!.match(/(\d+)°(\d+)'(\d+)"/);
            if (!m) return null;
            return Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
          })()
        : null);
    if (deg != null) return normDeg((info.rashi - 1) * 30 + deg);
  }
  if (info.rashi_ne) {
    const rashi = rashiFromNe(info.rashi_ne);
    const ri = rashi ? WHEEL_RASHIS.findIndex((r) => r.ne === rashi.ne) : -1;
    if (ri >= 0) {
      const [d, m, s] = planetDegrees(info);
      return normDeg(ri * 30 + d + m / 60 + s / 3600);
    }
  }
  return null;
}

function parseGhatiClock(clock?: string | null): number | null {
  if (!clock) return null;
  const parts = clock.split(":").map(Number);
  const gh = parts[0];
  const pa = parts[1] ?? 0;
  if (gh == null || Number.isNaN(gh)) return null;
  return gh + pa / 60;
}

function parseHoursClockToGhati(clock?: string | null): number | null {
  if (!clock) return null;
  const parts = clock.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  if ([h, m, s].some((n) => Number.isNaN(n))) return null;
  return (h * 60 + m + s / 60) / 24;
}

function ghatiFromLagnaSpan(span: LagnaSpan): number | null {
  return (
    parseHoursClockToGhati(span.end_hours_clock) ??
    parseGhatiClock(span.end_ghati_clock)
  );
}

type TithiLike = {
  end_ghati_clock?: string;
  end_hours_clock?: string;
  end?: string;
  progress?: number;
};

function getTithiBlock(p: PanchangaDay): TithiLike | undefined {
  const detail = getPanchangaDetail(p);
  return (detail?.tithi ?? p.tithi) as TithiLike | undefined;
}

/** Ghati from sunrise when only simplified `tithi.end` local stamp is available (year bulk). */
function ghatiFromTithiEndStamp(
  stamp: string | undefined,
  anchorDateAd: string,
  sunriseMin: number,
): number | null {
  if (!stamp || !anchorDateAd) return null;
  const m = stamp.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, endDate, eh, em] = m;
  const endMinutes = Number(eh) * 60 + Number(em);
  const dayOffset =
    endDate! > anchorDateAd ? 1 : endDate! < anchorDateAd ? -1 : 0;
  const totalMin = dayOffset * 1440 + endMinutes - sunriseMin;
  if (totalMin <= 0) return null;
  return totalMin / 24;
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

function maxElongRateWithinBand(elong0: number, gMax = 60): number {
  const band = Math.floor(elong0 / 12);
  const boundary = (band + 1) * 12;
  const headroom = boundary - elong0 - 0.15;
  if (headroom <= 0) return 0;
  return headroom / gMax;
}

/**
 * Vriddhi / repeated-u daya days: the calendar still names this tithi even when
 * the astronomical slice ends right after sunrise (or after next sunrise).
 */
function shouldHoldUdayaTithiAllDay(elong0: number, gEnd: number | null): boolean {
  if (gEnd != null && gEnd >= 60) return true;
  const band = Math.floor(elong0 / 12);
  const nearBandEnd = elong0 >= band * 12 + 10;
  if (gEnd != null && gEnd < 2 && nearBandEnd) return true;
  return false;
}

function elongationWithinBand(elong0: number, g: number): number {
  const band = Math.floor(elong0 / 12);
  const bandStart = band * 12 + 0.4;
  const bandEnd = (band + 1) * 12 - 0.35;
  const startE = Math.max(bandStart, Math.min(elong0, bandEnd - 0.5));
  const t = Math.max(0, Math.min(1, g / 60));
  return startE + t * (bandEnd - startE);
}

function rashiIndexFromNe(nameNe?: string | null): number | null {
  const rashi = rashiFromNe(nameNe);
  if (!rashi) return null;
  const idx = WHEEL_RASHIS.findIndex((r) => r.ne === rashi.ne);
  return idx >= 0 ? idx + 1 : null;
}

function lagnaSpanLongitude(span: LagnaSpan): number {
  if (span.longitude != null) return normDeg(span.longitude);
  const rashiNum = span.number ?? rashiIndexFromNe(span.name_ne);
  const deg = span.degree_in_rashi ?? 0;
  if (rashiNum != null) return normDeg((rashiNum - 1) * 30 + deg);
  return 0;
}

function interpolateAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normDeg(a + delta * t);
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

/** Sidereal mean motion in degrees per vedic day (sunrise → next sunrise). */
const MEAN_MOTION_PER_DAY = [
  0.9856,  // Sun
  13.176,  // Moon
  0.524,   // Mars
  1.383,   // Mercury (mean)
  0.083,   // Jupiter
  1.2,     // Venus (mean)
  0.033,   // Saturn
  -0.053,  // Rahu (mean retrograde)
  -0.053,  // Ketu
] as const;

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

function grahaLonAtG(
  graha: WheelGraha,
  index: number,
  g: number,
  moonLon: number,
  rahuLon?: number
): number {
  if (index === 1) return moonLon;
  if (index === 8 && rahuLon != null) return normDeg(rahuLon + 180);
  const base = grahaLon(graha);
  return normDeg(base + (g / 60) * MEAN_MOTION_PER_DAY[index]!);
}

export interface WheelMarkers {
  lagnaLon: number;
  sunLon: number;
  moonLon: number;
  moonNak: number;
  planetLons: number[];
}

export function scrubGToDatetime(
  anchorAd: string,
  scrubG: number,
  sunriseMin: number
): string {
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

export function buildWheelMarkersFromDetail(
  det: WheelDetail,
  lagnaLongitude?: number | null
): WheelMarkers {
  const planetLons = det.grahas.map((gr) => grahaLon(gr));
  const moonLon = planetLons[1] ?? 0;
  const sunLon = planetLons[0] ?? 0;
  const moonNak = Math.floor(normDeg(moonLon) / (360 / 27));
  const lagnaLon =
    lagnaLongitude != null ? normDeg(lagnaLongitude) : sunLon;
  return { lagnaLon, sunLon, moonLon, moonNak, planetLons };
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

/** @deprecated Use buildWheelMarkersFromDetail with API at-time scrub data. */
export function buildWheelMarkers(
  p: PanchangaDay,
  det: WheelDetail,
  scrubG: number
): WheelMarkers {
  const lagnaLon = lagnaLongitudeAtG(p, scrubG) ?? grahaLon(det.grahas[0] ?? { sym: "", ne: "", rashi: WHEEL_RASHIS[0]!, deg: [0, 0, 0] });
  const moonLon = moonLonAtG(p, det, scrubG);
  const moonNak = Math.floor(normDeg(moonLon) / (360 / 27));

  const rahuBase = det.grahas[7] ? grahaLonAtG(det.grahas[7], 7, scrubG, moonLon) : undefined;
  const planetLons = det.grahas.map((gr, i) =>
    grahaLonAtG(gr, i, scrubG, moonLon, rahuBase)
  );
  const sunLon = planetLons[0] ?? grahaLon(det.grahas[0] ?? { sym: "", ne: "", rashi: WHEEL_RASHIS[0]!, deg: [0, 0, 0] });

  return {
    lagnaLon,
    sunLon,
    moonLon,
    moonNak,
    planetLons,
  };
}

export function scrubGToClock(g: number, sunriseMin: number): string {
  return gClock(g, sunriseMin);
}

export function clockToScrubG(clock: string, sunriseMin: number): number {
  const [hh, mm] = clock.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 30;
  const mins = hh * 60 + (mm ?? 0);
  let ghati = (mins - sunriseMin) / 24;
  if (ghati < 0) ghati += 60;
  return Math.max(0, Math.min(60, ghati));
}

export function grahaLon(g: WheelGraha): number {
  if (g.longitude != null) return normDeg(g.longitude);
  const ri = WHEEL_RASHIS.findIndex((r) => r.ne === g.rashi.ne || r.en === g.rashi.en);
  return normDeg((ri >= 0 ? ri : 0) * 30 + g.deg[0] + g.deg[1] / 60 + g.deg[2] / 3600);
}

export function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

export function gClock(g: number, sunriseMin: number): string {
  const m = sunriseMin + g * 24;
  const mins = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const min = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function wheelNum(n: number | string, useDev = true): string | number {
  if (!useDev) return n;
  return toNepaliDigits(n);
}

export function buildWheelDetail(p: PanchangaDay): WheelDetail {
  const detail = getPanchangaDetail(p);
  const planets = (detail?.planets ?? p.planets) as Record<string, PlanetDetail | string> | undefined;

  const grahas: WheelGraha[] = GRAHA_KEYS.map((key, i) => {
    const info = planets?.[key];
    let rashi: WheelRashi | undefined;
    let deg: [number, number, number] = [0, 0, 0];
    let longitude: number | undefined;

    if (info && typeof info !== "string") {
      rashi = rashiFromNe(info.rashi_ne) ?? rashiFromNumber(info.rashi);
      deg = planetDegrees(info);
      const lon = planetLongitude(info);
      if (lon != null) longitude = lon;
    }

    if (!rashi) {
      rashi = WHEEL_RASHIS[i % 12]!;
    }

    return {
      sym: GRAHA_SYMS[i]!,
      ne: GRAHA_NE[i]!,
      rashi,
      deg,
      longitude,
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

const WEEKDAY_NE_TO_EN: Record<string, string> = {
  आइतबार: "Sunday",
  आइतवार: "Sunday",
  सोमबार: "Monday",
  सोमवार: "Monday",
  मंगलबार: "Tuesday",
  मंगलवार: "Tuesday",
  मङ्गलबार: "Tuesday",
  बुधबार: "Wednesday",
  बुधवार: "Wednesday",
  बिहीबार: "Thursday",
  बिहीवार: "Thursday",
  शुक्रबार: "Friday",
  शुक्रवार: "Friday",
  शनिबार: "Saturday",
  शनिवार: "Saturday",
};

export function bsMonthsForWheel() {
  return BS_MONTHS_NE.map((ne) => ({ ne }));
}
