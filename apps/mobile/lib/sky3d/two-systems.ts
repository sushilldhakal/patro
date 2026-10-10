/**
 * The two measures of time, read off one sky.
 *
 * Sauramāna is the Sun's sidereal longitude: cross a 30° boundary and a
 * sankranti begins the next solar month. Chāndramāna is the *angle* between
 * Moon and Sun: every 12° of that angle is one tithi, fifteen of them a paksha,
 * thirty a lunar month. Both readings come from the same instant and the same
 * ephemeris — {@link geocentricPointAt}, which the 3D Aakash Gochar already
 * runs — so the scene built on this cannot drift from the sky page.
 *
 * Nothing here is an almanac. The panchanga resolves a sankranti to the second
 * and applies the sunrise rule to decide which civil day owns a tithi; this
 * gives the continuous quantity underneath that, which is what an animation
 * needs and what the reader is being shown.
 */

import { normalizeDeg, RASHI_ARC } from "@/lib/sky3d/geocentric-model";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";
import { ayanamsa, geocentricPointAt, julianDay } from "@/lib/sky3d/orbital-model";

/**
 * Precession, removed once.
 *
 * `orbital-model` propagates J2000 Keplerian elements, so the longitude it
 * computes is already in the J2000 ecliptic — an inertial frame, fixed to the
 * stars. It then subtracts a *time-varying* ayanamsa, which applies precession
 * a second time: its "sidereal" longitude regresses 50.3″ a year, so a
 * sidereal year advances 359.9861° instead of 360°, and Mesha Sankranti slides
 * later by a day per seventy-two years.
 *
 * On the 3D sky page this never shows, because that page calibrates the model
 * against the API for the date on screen and the constant offset absorbs it.
 * Nothing here calls the API, so the drift has to be undone: add back the
 * ayanamsa's growth since J2000, leaving a fixed sidereal frame pinned to
 * Lahiri at J2000.
 */
const AYANAMSA_J2000 = ayanamsa(0);

/** Sidereal ecliptic longitude, deg — the corrected frame everything here uses. */
export function siderealLon(key: "sun" | "moon", dt: number): number {
  return normalizeDeg(geocentricPointAt(key, dt).longitude + (ayanamsa(dt) - AYANAMSA_J2000));
}

/**
 * Longitude and distance in one call.
 *
 * The scene's trail needs both for every sampled instant, and asking for them
 * separately doubles the Kepler solves for no reason — this runs hundreds of
 * times per rebuild.
 */
export function sunStateAt(dt: number): { longitude: number; distanceAu: number } {
  const p = geocentricPointAt("sun", dt);
  return {
    longitude: normalizeDeg(p.longitude + (ayanamsa(dt) - AYANAMSA_J2000)),
    distanceAu: p.distanceAu,
  };
}

/** Mean synodic month, days — the lunar cycle the solar year is compared against. */
export const SYNODIC_MONTH = 29.530588;
/** Mean sidereal month, days — the Moon's own 360° against the stars. */
export const SIDEREAL_MONTH = 27.321661;
/** Mean sidereal year, days. */
export const SIDEREAL_YEAR = 365.256363;
/** One tithi is 12° of elongation; thirty of them close the circle. */
export const TITHI_ARC = 12;

/** JS instant for a J2000 day number — the inverse of `daysSinceJ2000`. */
export function dateFromDt(dt: number): Date {
  return new Date((dt + 2451545.0 - 2440587.5) * 86400000);
}

export function dtFromDate(date: Date): number {
  return julianDay(date) - 2451545.0;
}

/** Sun and Moon, sidereal, for one J2000 day number. */
export function sunMoonAt(dt: number) {
  return {
    sun: { longitude: siderealLon("sun", dt), latitude: 0 },
    moon: {
      longitude: siderealLon("moon", dt),
      latitude: geocentricPointAt("moon", dt).latitude,
    },
  };
}

/**
 * The instant the Sun's sidereal longitude reaches `targetLon`, at or after
 * `fromDt`.
 *
 * Bisection on the signed distance to the target rather than a rate estimate:
 * the Sun runs a fiftieth of a degree a day slower at aphelion than perihelion,
 * which is a whole day's error by the far end of a rashi — visible as a
 * sankranti landing on the wrong side of a boundary the scene is drawing.
 */
export function solarCrossing(targetLon: number, fromDt: number): number {
  const gap = (dt: number) => {
    const d = normalizeDeg(siderealLon("sun", dt) - targetLon);
    return d > 180 ? d - 360 : d;
  };
  return bracketAndBisect(gap, fromDt, 5, 100);
}

/**
 * The instant a signed, increasing-through-zero quantity crosses zero.
 *
 * Step forward until the sign flips, then halve the bracket forty times —
 * which lands well under a second, so a sankranti or an amavasya is exact to
 * anything the scene can draw. Bisection has to keep *both* bounds: returning
 * the first midpoint that tests non-negative leaves the answer anywhere in the
 * step, and at a five-day step that put whole sankrantis on the wrong day.
 */
function bracketAndBisect(
  gap: (dt: number) => number,
  fromDt: number,
  step: number,
  maxSteps: number,
): number {
  let lo = fromDt;
  let loGap = gap(lo);
  if (loGap === 0) return lo;
  for (let i = 1; i <= maxSteps; i += 1) {
    const hi = fromDt + i * step;
    const hiGap = gap(hi);
    if (loGap < 0 && hiGap >= 0) {
      let a = lo;
      let b = hi;
      for (let k = 0; k < 40; k += 1) {
        const mid = (a + b) / 2;
        if (gap(mid) < 0) a = mid;
        else b = mid;
      }
      /*
       * `b`, not the midpoint. Both are the same instant to eleven decimal
       * places, but only `b` is on the *far* side of the boundary — and a
       * sankranti is defined by having crossed it. Return the midpoint and the
       * Sun can still read 359.9999° at Mesha Sankranti, which floors to the
       * twelfth rashi and opens the year in Chaitra instead of Baisakh.
       */
      return b;
    }
    lo = hi;
    loGap = hiGap;
  }
  return fromDt;
}

/**
 * The Mesha Sankranti that opens the solar year containing `dt` — the instant
 * the Sun's longitude is 0°, and therefore Baishakh 1.
 */
export function meshaSankrantiOnOrBefore(dt: number): number {
  const lon = siderealLon("sun", dt);
  /*
   * Back off by however much of the year the Sun has already walked, plus a
   * margin, then find the crossing forwards from there. The margin has to
   * clear the estimate's own error: the Sun runs slower at aphelion than the
   * mean rate assumed here, so a day or two of slack lands *after* the
   * crossing and the search then walks a full year to the next one.
   */
  const back = dt - (lon / 360) * SIDEREAL_YEAR - 10;
  const found = solarCrossing(0, back);
  return found <= dt ? found : solarCrossing(0, back - 30);
}

export type SolarReading = {
  /** Sidereal longitude, deg. */
  longitude: number;
  /** 0 = Mesha / Baishakh. */
  rashiIndex: number;
  monthName: string;
  monthNameNe: string;
  /** Degrees travelled into the current rashi. */
  intoRashi: number;
  /** Whole days since this month's sankranti, 1-based — the gate. */
  gate: number;
};

export type LunarReading = {
  /** Moon − Sun, deg 0–360. */
  elongation: number;
  /** 1–30, counted from the tithi that follows amavasya. */
  tithiNumber: number;
  /** How far through the current tithi, 0–1. */
  tithiFraction: number;
  shukla: boolean;
  /** 1–15 within the paksha. */
  tithiInPaksha: number;
};

/**
 * The solar side of the instant.
 *
 * `months` is the year's sankranti ladder from {@link buildYearLadders}. It is
 * passed in rather than solved here because finding one sankranti costs a
 * hundred Kepler solves, and this runs inside an animation frame — the ladder
 * is built once for the year on screen and then only read.
 */
export function solarReading(dt: number, months: SolarMonthSpan[]): SolarReading {
  const longitude = siderealLon("sun", dt);
  const rashiIndex = Math.floor(longitude / RASHI_ARC) % 12;
  const intoRashi = longitude - rashiIndex * RASHI_ARC;
  const span = months[rashiIndex];
  return {
    longitude,
    rashiIndex,
    monthName: BS_MONTH_NAMES[rashiIndex] ?? BS_MONTH_NAMES[0]!,
    monthNameNe: BS_MONTHS_NE[rashiIndex] ?? BS_MONTHS_NE[0]!,
    intoRashi,
    gate: span ? Math.max(1, Math.floor(dt - span.startDt) + 1) : 1,
  };
}

export function lunarReading(dt: number): LunarReading {
  const { sun, moon } = sunMoonAt(dt);
  const elongation = normalizeDeg(moon.longitude - sun.longitude);
  const raw = elongation / TITHI_ARC;
  const index = Math.floor(raw);
  return {
    elongation,
    tithiNumber: index + 1,
    tithiFraction: raw - index,
    shukla: elongation < 180,
    tithiInPaksha: (index % 15) + 1,
  };
}

/** Tithi names 1–15, used for both pakshas; 15 becomes purnima or amavasya. */
export const TITHI_NAMES = [
  "प्रतिपदा",
  "द्वितीया",
  "तृतीया",
  "चतुर्थी",
  "पञ्चमी",
  "षष्ठी",
  "सप्तमी",
  "अष्टमी",
  "नवमी",
  "दशमी",
  "एकादशी",
  "द्वादशी",
  "त्रयोदशी",
  "चतुर्दशी",
  "पूर्णिमा",
] as const;

export function tithiName(reading: LunarReading): string {
  if (reading.tithiInPaksha === 15) return reading.shukla ? "पूर्णिमा" : "औंसी";
  return TITHI_NAMES[reading.tithiInPaksha - 1] ?? "";
}

/* ── the year, laid out once ───────────────────────────────────────────── */

export type SolarMonthSpan = {
  index: number;
  name: string;
  nameNe: string;
  /** Sankranti instant that opens it, as a J2000 day number. */
  startDt: number;
  /** Days it lasts — 29 to 32, because the Sun does not run at one rate. */
  days: number;
};

export type LunarMonthSpan = {
  index: number;
  /** Amavasya (elongation 0) that opens it. */
  startDt: number;
  days: number;
};

/**
 * The two ladders the animation compares: twelve solar months from one Mesha
 * Sankranti to the next, and however many lunar months fit inside them.
 *
 * Twelve lunar months come up ~11 days short of the solar year, and that
 * shortfall is the whole reason adhik maas exists — so the lunar ladder is
 * built one month past the year's end, which is where the overhang shows.
 */
export function buildYearLadders(yearStartDt: number) {
  const solar: SolarMonthSpan[] = [];
  let cursor = yearStartDt;
  for (let i = 0; i < 12; i += 1) {
    const next = solarCrossing(((i + 1) * RASHI_ARC) % 360, cursor + 20);
    solar.push({
      index: i,
      name: BS_MONTH_NAMES[i] ?? "",
      nameNe: BS_MONTHS_NE[i] ?? "",
      startDt: cursor,
      days: next - cursor,
    });
    cursor = next;
  }
  const yearEndDt = cursor;

  /* Lunar months from the amavasya at or before the year start, so the first
     span the reader sees is the one actually running on Baishakh 1. */
  const lunar: LunarMonthSpan[] = [];
  let m = newMoonOnOrBefore(yearStartDt);
  /* Fourteen spans, unconditionally: the year holds twelve or thirteen, and
     the drift measurement below needs the thirteenth start after whichever
     one the year actually opens on. */
  for (let i = 0; i < 14; i += 1) {
    const next = newMoonAfter(m + 5);
    lunar.push({ index: i, startDt: m, days: next - m });
    m = next;
  }

  /*
   * The comparison the section rests on: twelve *whole* lunar months measured
   * from the first amavasya the year contains, against the year itself.
   *
   * Both ladders have to be measured from the same instant or the number is
   * meaningless — the lunar ladder above starts at the amavasya *before* the
   * year, so subtracting its twelfth start from the year's end counts that
   * pre-roll too and reports thirty-odd days instead of eleven.
   */
  const firstInside = lunar.findIndex((m) => m.startDt >= yearStartDt);
  const from = lunar[firstInside];
  const to = lunar[firstInside + 12];
  const twelveLunarDays = from && to ? to.startDt - from.startDt : 12 * SYNODIC_MONTH;

  return {
    solar,
    lunar,
    yearStartDt,
    yearEndDt,
    yearDays: yearEndDt - yearStartDt,
    twelveLunarDays,
    /** ~11 days: the part of the solar year twelve lunar months do not cover. */
    lunarShortfall: yearEndDt - yearStartDt - twelveLunarDays,
  };
}

/** Elongation zero — the amavasya that opens a lunar month. */
export function newMoonAfter(fromDt: number): number {
  const gap = (dt: number) => {
    const { sun, moon } = sunMoonAt(dt);
    const d = normalizeDeg(moon.longitude - sun.longitude);
    return d > 180 ? d - 360 : d;
  };
  return bracketAndBisect(gap, fromDt, 0.5, 80);
}

/**
 * Unwrapped longitude travelled between two instants, in degrees — the number
 * that keeps counting past 360°.
 *
 * This is what makes the difference between a sidereal and a synodic month
 * visible instead of merely stated. The Moon closes 360° against the stars in
 * 27.32 days, but by then the Sun has moved on ~27° and the Moon is not back
 * beside it: it has to keep going, and one amavasya to the next costs about
 * **389°** and 29.53 days. Reading a raw longitude can never show that, because
 * it wraps; this counts the laps.
 *
 * Both the Sun's and the Moon's apparent longitude run forward without pause,
 * so laps can be recovered from elapsed time: the mean period fixes how many
 * whole turns have gone by, and the wrapped remainder supplies the rest. The
 * rounding is safe because a mean period is never off by anything close to
 * half a revolution over the spans this is asked about.
 */
export function longitudeTravelled(
  key: "sun" | "moon",
  fromDt: number,
  toDt: number,
  periodDays: number,
): number {
  const start = siderealLon(key, fromDt);
  const end = siderealLon(key, toDt);
  const wrapped = normalizeDeg(end - start);
  const laps = Math.round((toDt - fromDt) / periodDays - wrapped / 360);
  return laps * 360 + wrapped;
}

export function newMoonOnOrBefore(dt: number): number {
  const { sun, moon } = sunMoonAt(dt);
  const elong = normalizeDeg(moon.longitude - sun.longitude);
  return newMoonAfter(dt - (elong / 360) * SYNODIC_MONTH - 2);
}
