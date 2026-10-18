import { AD_MONTH_NAMES, AD_MONTH_NAMES_NE, BS_MONTH_NAMES, BS_MONTHS_NE } from "../calendar/bs-calendar";
import { RASHI_SYM, toNepaliDigits } from "./panchanga-format";
import { getRashiName, rashiNumberFromName } from "./rashi-i18n";

export function getWheelRashis(): WheelRashi[] {
  return Array.from({ length: 12 }, (_, i) => ({
    ne: getRashiName(i + 1, "ne"),
    en: getRashiName(i + 1, "en"),
    sym: RASHI_SYM[i]!,
  }));
}

export const GREG_NE = AD_MONTH_NAMES_NE;
export const GREG_EN = AD_MONTH_NAMES;

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

/**
 * Orbit radius before ORBIT_SCALE, in graha order:
 * Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.
 * Inner → outer: Moon + Rahu + Ketu (one orbit), Venus, Mars, Mercury, Sun, Jupiter, Saturn.
 */
export const GRAHA_META = [
  { orbit: 160, color: "#f2a81d", big: true },
  { orbit: 64, color: "#d3dce4" },
  { orbit: 112, color: "#d0552e" },
  { orbit: 136, color: "#9aa69e" },
  { orbit: 182, color: "#dcae54" },
  { orbit: 88, color: "#e6cd86" },
  { orbit: 204, color: "#c6a14b", ring: true },
  { orbit: 64, color: "#7b8aa0" },
  { orbit: 64, color: "#7b8aa0" },
] as const;

/** Distinct orbit rings, inner to outer. */
export const WHEEL_ORBIT_RADII = [64, 88, 112, 136, 160, 182, 204] as const;

export const GRAHA_KEYS = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
] as const;

export const GRAHA_SYMS = ["", "", "", "", "", "", "", "", ""] as const;
export const GRAHA_NE = ["सूर्य", "चन्द्र", "मंगल", "बुध", "बृहस्पति", "शुक्र", "शनि", "राहु", "केतु"] as const;
export const GRAHA_EN = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;

export interface WheelRashi {
  ne: string;
  en: string;
  sym: string;
}

export interface WheelGraha {
  sym: string;
  ne: string;
  en: string;
  rashi: WheelRashi;
  deg: [number, number, number];
  longitude?: number;
  /** वक्री — same flag the sky scene uses for the red collar. */
  retrograde?: boolean;
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

export function rashiFromNe(nameNe?: string | null): WheelRashi | undefined {
  if (!nameNe) return undefined;
  const num = rashiNumberFromName(nameNe);
  if (num) return getWheelRashis()[num - 1];
  return undefined;
}

export function rashiFromNumber(rashi?: number): WheelRashi | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return getWheelRashis()[rashi - 1];
}

export type PlanetDetail = {
  longitude?: number;
  rashi?: number;
  rashi_ne?: string;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
  is_retrograde?: boolean;
  retrograde?: boolean;
};

export function planetDegrees(info: PlanetDetail): [number, number, number] {
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

export function planetLongitude(info: PlanetDetail): number | null {
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
    const ri = rashi ? getWheelRashis().findIndex((r) => r.ne === rashi.ne) : -1;
    if (ri >= 0) {
      const [d, m, s] = planetDegrees(info);
      return normDeg(ri * 30 + d + m / 60 + s / 3600);
    }
  }
  return null;
}

export function parseGhatiClock(clock?: string | null): number | null {
  if (!clock) return null;
  const parts = clock.split(":").map(Number);
  const gh = parts[0];
  const pa = parts[1] ?? 0;
  if (gh == null || Number.isNaN(gh)) return null;
  return gh + pa / 60;
}

export function parseHoursClockToGhati(clock?: string | null): number | null {
  if (!clock) return null;
  const parts = clock.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  if ([h, m, s].some((n) => Number.isNaN(n))) return null;
  return (h * 60 + m + s / 60) / 24;
}

export type TithiLike = {
  end_ghati_clock?: string;
  end_hours_clock?: string;
  end?: string;
  progress?: number;
};

/** Ghati from sunrise when only simplified `tithi.end` local stamp is available (year bulk). */
export function ghatiFromTithiEndStamp(
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

export function maxElongRateWithinBand(elong0: number, gMax = 60): number {
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
export function shouldHoldUdayaTithiAllDay(elong0: number, gEnd: number | null): boolean {
  if (gEnd != null && gEnd >= 60) return true;
  const band = Math.floor(elong0 / 12);
  const nearBandEnd = elong0 >= band * 12 + 10;
  if (gEnd != null && gEnd < 2 && nearBandEnd) return true;
  return false;
}

export function elongationWithinBand(elong0: number, g: number): number {
  const band = Math.floor(elong0 / 12);
  const bandStart = band * 12 + 0.4;
  const bandEnd = (band + 1) * 12 - 0.35;
  const startE = Math.max(bandStart, Math.min(elong0, bandEnd - 0.5));
  const t = Math.max(0, Math.min(1, g / 60));
  return startE + t * (bandEnd - startE);
}

export function rashiIndexFromNe(nameNe?: string | null): number | null {
  const rashi = rashiFromNe(nameNe);
  if (!rashi) return null;
  const idx = getWheelRashis().findIndex((r) => r.ne === rashi.ne);
  return idx >= 0 ? idx + 1 : null;
}

export function interpolateAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normDeg(a + delta * t);
}

/** Sidereal mean motion in degrees per vedic day (sunrise → next sunrise). */
export const MEAN_MOTION_PER_DAY = [
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

export function grahaLonAtG(
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

export function scrubGToAtTimeQuery(
  jdUt: number,
  scrubG: number,
  sunriseMin: number,
): { jd: number; clock: string } {
  const totalMin = sunriseMin + scrubG * 24;
  const dayOffset = Math.floor(totalMin / 1440);
  const minsInDay = totalMin - dayOffset * 1440;
  const h = Math.floor(minsInDay / 60);
  const m = Math.round(minsInDay % 60);
  const clock = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  return { jd: jdUt + dayOffset, clock };
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
  const ri = getWheelRashis().findIndex((r) => r.ne === g.rashi.ne || r.en === g.rashi.en);
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

export const WEEKDAY_NE_TO_EN: Record<string, string> = {
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
  return BS_MONTHS_NE.map((ne, i) => ({ ne, en: BS_MONTH_NAMES[i] ?? ne }));
}
