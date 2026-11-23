// Surya Siddhanta, offline: read a STAB position table and derive panchanga
// on the device, with no server call and no Surya Siddhanta formula ported.
//
// The table (see apps/rust/crates/siddhanta-table/README.md) holds, every 12 h,
// the eight grahas' sidereal longitudes and instantaneous speeds, the
// ayanamsha and the mean Sun (sayana). This module interpolates a position at
// any instant inside the table and derives everything a day view shows from
// those numbers, the instant and the user's latitude/longitude:
// graha rashi / nakshatra / pada, tithi, karana, yoga, lagna, sunrise and
// sunset, and the next tithi / nakshatra boundary.
//
// What it does NOT do: kundali, dashas, muhurta and festivals stay on the
// server — they need rise/set searches over whole days, divisional charts
// and the full rule set, not just positions. And a table only answers inside
// its own date range; outside it, ask the server.
//
// Accuracy: the table reproduces the server's formulas to a few arcseconds
// (the text's own arithmetic steps every ~14 s — see the crate README), so
// derivations match the server except within a few arcseconds of a boundary,
// where the two sides can disagree by one tithi or nakshatra for a few seconds.

export const SIDDHANTA_BODIES = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
] as const;

export type SiddhantaBody = (typeof SIDDHANTA_BODIES)[number];

/** Index of a body in the table's per-sample record. */
export const SIDDHANTA_BODY_INDEX: Record<SiddhantaBody, number> = {
  sun: 0,
  moon: 1,
  mars: 2,
  mercury: 3,
  jupiter: 4,
  venus: 5,
  saturn: 6,
  rahu: 7,
};

/** Ketu is Rahu + 180° and is never stored. */
export const KETU_OFFSET_DEGREES = 180;

const HEADER_BYTES = 32;
const SAMPLE_BYTES = 72;
const MAGIC = "STAB0001";
/** The text's obliquity: 24°. */
const OBLIQUITY_DEGREES = 24;
const NAKSHATRA_SPAN = 360 / 27;

export interface SiddhantaTable {
  firstJd: number;
  stepDays: number;
  sampleCount: number;
  /** Raw sample bytes, in file order. */
  bytes: Uint8Array;
}

export interface SiddhantaPositions {
  /** Sidereal longitude, 0–360°, in body order. */
  longitude: number[];
  /** Instantaneous derivative, °/day — for interpolation, not display. */
  speed: number[];
  ayanamsha: number;
  meanSunSayana: number;
}

export function wrap360(degrees: number): number {
  const r = degrees % 360;
  return r < 0 ? r + 360 : r;
}

function pyMod(x: number, m: number): number {
  const r = x % m;
  if (r === 0) return 0;
  return (m < 0) !== (r < 0) ? r + m : r;
}

/** Parses STAB bytes (a whole file, or a slice the server sent). */
export function parseSiddhantaTable(bytes: Uint8Array): SiddhantaTable {
  if (bytes.length < HEADER_BYTES) {
    throw new Error("siddhanta table is too short for a header");
  }
  const magic = String.fromCharCode(...bytes.subarray(0, 8));
  if (magic !== MAGIC) {
    throw new Error("not a siddhanta table (bad magic)");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bodies = view.getUint32(8, true);
  if (bodies !== SIDDHANTA_BODIES.length) {
    throw new Error(`siddhanta table has ${bodies} bodies, this reader knows 8`);
  }
  const sampleCount = view.getUint32(12, true);
  const firstJd = view.getFloat64(16, true);
  const stepDays = view.getFloat64(24, true);
  if (!Number.isFinite(stepDays) || stepDays <= 0) {
    throw new Error(`siddhanta table step ${stepDays} is not a positive number of days`);
  }
  if (bytes.length !== HEADER_BYTES + sampleCount * SAMPLE_BYTES) {
    throw new Error("siddhanta table length does not match its sample count");
  }
  return { firstJd, stepDays, sampleCount, bytes };
}

/** Julian Day (UT) of the last sample. */
export function siddhantaLastJd(table: SiddhantaTable): number {
  return table.firstJd + (table.sampleCount - 1) * table.stepDays;
}

function sampleAt(table: SiddhantaTable, index: number, body: number): [number, number] {
  const at = HEADER_BYTES + index * SAMPLE_BYTES + body * 8;
  const view = new DataView(table.bytes.buffer, table.bytes.byteOffset, table.bytes.byteLength);
  return [view.getFloat32(at, true), view.getFloat32(at + 4, true)];
}

function scalarsAt(table: SiddhantaTable, index: number): [number, number] {
  const at = HEADER_BYTES + index * SAMPLE_BYTES + SIDDHANTA_BODIES.length * 8;
  const view = new DataView(table.bytes.buffer, table.bytes.byteOffset, table.bytes.byteLength);
  return [view.getFloat32(at, true), view.getFloat32(at + 4, true)];
}

/**
 * Positions at a Julian Day (UT), or null outside the table.
 * Cubic Hermite per body over the two bracketing samples (the stored speeds
 * make the curve follow the true motion); the ayanamsha and the mean Sun
 * interpolate linearly — the mean Sun is exactly linear.
 */
export function positionsAt(table: SiddhantaTable, jdUt: number): SiddhantaPositions | null {
  if (!Number.isFinite(jdUt) || table.sampleCount === 0) return null;
  if (jdUt < table.firstJd || jdUt > siddhantaLastJd(table)) return null;
  const at = (jdUt - table.firstJd) / table.stepDays;
  const i = Math.min(Math.floor(at), table.sampleCount - 1);
  const t = Math.min(Math.max(at - i, 0), 1);
  const longitude: number[] = [];
  const speed: number[] = [];
  if (i + 1 >= table.sampleCount) {
    for (let b = 0; b < SIDDHANTA_BODIES.length; b += 1) {
      const [lon, sp] = sampleAt(table, i, b);
      longitude.push(lon);
      speed.push(sp);
    }
    const [ayanamsha, meanSunSayana] = scalarsAt(table, i);
    return { longitude, speed, ayanamsha, meanSunSayana };
  }
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const d00 = 6 * t2 - 6 * t;
  const d10 = 3 * t2 - 4 * t + 1;
  const d01 = -6 * t2 + 6 * t;
  const d11 = 3 * t2 - 2 * t;
  const h = table.stepDays;
  for (let b = 0; b < SIDDHANTA_BODIES.length; b += 1) {
    const [lon0, sp0] = sampleAt(table, i, b);
    let [lon1, sp1] = sampleAt(table, i + 1, b);
    // Unwrap the next sample against this one: the pair is adjacent, so the
    // true motion between them is far under 180°.
    lon1 += 360 * Math.round((lon0 - lon1) / 360);
    longitude.push(wrap360(h00 * lon0 + h10 * h * sp0 + h01 * lon1 + h11 * h * sp1));
    speed.push((d00 * lon0 + d10 * h * sp0 + d01 * lon1 + d11 * h * sp1) / h);
  }
  const [aya0, mean0] = scalarsAt(table, i);
  const [aya1, mean1] = scalarsAt(table, i + 1);
  return {
    longitude,
    speed,
    ayanamsha: aya0 + (aya1 - aya0) * t,
    meanSunSayana: mean0 + (mean1 - mean0) * t,
  };
}

/**
 * The speed the API shows for a body: the text defines speed as the ±0.5-day
 * central difference of the longitude, so it is differenced from the table
 * itself — the stored speed is the instantaneous derivative, used only for
 * interpolation. Null outside the table (a day either side must be covered).
 */
export function displaySpeedAt(
  table: SiddhantaTable,
  jdUt: number,
  body: SiddhantaBody,
): number | null {
  const before = positionsAt(table, jdUt - 0.5);
  const after = positionsAt(table, jdUt + 0.5);
  if (before === null || after === null) return null;
  const b = SIDDHANTA_BODY_INDEX[body];
  let diff = after.longitude[b] - before.longitude[b];
  diff -= 360 * Math.round(diff / 360);
  return diff;
}

/** Julian Day (UT) for a Unix timestamp in milliseconds. */
export function jdFromUnixMs(ms: number): number {
  return ms / 86_400_000 + 2_440_587.5;
}

export interface GrahaAt {
  /** 1–12 from Mesha. */
  rashi: number;
  /** 1–27 from Ashwini. */
  nakshatra: number;
  /** 1–4. */
  pada: number;
  /** How far through the nakshatra, 0–1. */
  nakshatraProgress: number;
}

export function grahaAt(longitude: number): GrahaAt {
  const raw = wrap360(longitude) / NAKSHATRA_SPAN;
  const index = Math.floor(raw) % 27;
  const progress = pyMod(raw, 1);
  return {
    rashi: Math.floor(wrap360(longitude) / 30) + 1,
    nakshatra: index + 1,
    pada: Math.min(Math.floor(progress * 4) + 1, 4),
    nakshatraProgress: progress,
  };
}

/** Moon − Sun, 0–360°: tithi and karana are both cuts of it. */
export function elongation(sunLongitude: number, moonLongitude: number): number {
  return pyMod(moonLongitude - sunLongitude, 360);
}

export interface TithiAt {
  /** 1–30 from Shukla Pratipada. */
  number: number;
  /** 1–15 within the paksha. */
  displayNumber: number;
  shukla: boolean;
  /** How far through the tithi, 0–1. */
  progress: number;
  elongation: number;
}

export function tithiAt(sunLongitude: number, moonLongitude: number): TithiAt {
  const elong = elongation(sunLongitude, moonLongitude);
  const number = Math.floor(elong / 12) + 1;
  return {
    number,
    displayNumber: number <= 15 ? number : number - 15,
    shukla: number <= 15,
    progress: pyMod(elong, 12) / 12,
    elongation: elong,
  };
}

export interface KaranaAt {
  /** 1–60 through the lunation. */
  number: number;
  /** How far through the karana, 0–1. */
  progress: number;
}

export function karanaAt(sunLongitude: number, moonLongitude: number): KaranaAt {
  const elong = elongation(sunLongitude, moonLongitude);
  return {
    number: Math.floor(elong / 6) + 1,
    progress: pyMod(elong, 6) / 6,
  };
}

export interface YogaAt {
  /** 1–27 from Vishkumbha. */
  number: number;
  /** How far through the yoga, 0–1. */
  progress: number;
}

export function yogaAt(sunLongitude: number, moonLongitude: number): YogaAt {
  const raw = pyMod(sunLongitude + moonLongitude, 360) / NAKSHATRA_SPAN;
  return {
    number: (Math.floor(raw) % 27) + 1,
    progress: pyMod(raw, 1),
  };
}

function localSiderealDegrees(positions: SiddhantaPositions, jdUt: number, longitude: number): number {
  const localMeanDays = jdUt + longitude / 360 + 0.5;
  return wrap360(positions.meanSunSayana + 360 * pyMod(localMeanDays, 1) - 180);
}

/**
 * Lagna (nirayana), 0–360°: the ascendant from the stored mean Sun and
 * ayanamsha, with the text's 24° obliquity. This is `frame::ascendant` with
 * its inputs read from the table instead of computed.
 */
export function lagnaAt(
  table: SiddhantaTable,
  jdUt: number,
  latitude: number,
  longitude: number,
): number | null {
  const positions = positionsAt(table, jdUt);
  if (positions === null) return null;
  const ramc = (localSiderealDegrees(positions, jdUt, longitude) * Math.PI) / 180;
  const eps = (OBLIQUITY_DEGREES * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const asc =
    (Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
    ) *
      180) /
    Math.PI;
  return wrap360(asc - positions.ayanamsha);
}

/** Right ascension and declination of a longitude, for the 24° obliquity. */
function equatorial(longitude: number): [number, number] {
  const lon = (longitude * Math.PI) / 180;
  const eps = (OBLIQUITY_DEGREES * Math.PI) / 180;
  const ra = (Math.atan2(Math.sin(lon) * Math.cos(eps), Math.cos(lon)) * 180) / Math.PI;
  const dec = (Math.asin(Math.sin(lon) * Math.sin(eps)) * 180) / Math.PI;
  return [wrap360(ra), dec];
}

/** Altitude of the Sun's centre, degrees, at an instant and place. */
function sunAltitude(
  table: SiddhantaTable,
  jdUt: number,
  latitude: number,
  longitude: number,
): number | null {
  const positions = positionsAt(table, jdUt);
  if (positions === null) return null;
  // RA/Dec are tropical: the stored longitude is sidereal, so add the
  // ayanamsha first — as `equation_of_time_days` does on the server.
  const sayana = positions.longitude[SIDDHANTA_BODY_INDEX.sun] + positions.ayanamsha;
  const [ra, dec] = equatorial(sayana);
  const ramc = localSiderealDegrees(positions, jdUt, longitude);
  let hourAngle = wrap360(ramc - ra);
  if (hourAngle > 180) hourAngle -= 360;
  const phi = (latitude * Math.PI) / 180;
  const d = (dec * Math.PI) / 180;
  const h = (hourAngle * Math.PI) / 180;
  return (
    (Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(h)) * 180) /
    Math.PI
  );
}

function bisectCrossing(
  table: SiddhantaTable,
  lo: number,
  hi: number,
  latitude: number,
  longitude: number,
): number {
  // Altitude is 0 at both ends by construction (a sign change was found);
  // 40 halvings of a 10-minute bracket is ~1 second.
  for (let k = 0; k < 40; k += 1) {
    const mid = (lo + hi) / 2;
    const alt = sunAltitude(table, mid, latitude, longitude);
    if (alt === null) return mid;
    if (alt < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface SunriseSunset {
  sunriseJd: number | null;
  sunsetJd: number | null;
}

/**
 * Sunrise and sunset (the Sun's centre on the geometric horizon, 0° — the
 * text's own horizon, not the −0.833° upper limb) for the day starting at
 * `dayStartJd` (00:00 UT). Scans the day in 10-minute steps and bisects the
 * crossings, so the Sun's motion during the day is accounted for.
 */
export function sunriseSunset(
  table: SiddhantaTable,
  dayStartJd: number,
  latitude: number,
  longitude: number,
): SunriseSunset {
  const step = 10 / 1440; // 10 minutes, in days
  let previousJd = dayStartJd;
  let previousAlt = sunAltitude(table, previousJd, latitude, longitude);
  let sunriseJd: number | null = null;
  let sunsetJd: number | null = null;
  for (let k = 1; k <= 144; k += 1) {
    const jd = dayStartJd + k * step;
    const alt = sunAltitude(table, jd, latitude, longitude);
    if (alt === null || previousAlt === null) break;
    if (previousAlt < 0 && alt >= 0 && sunriseJd === null) {
      sunriseJd = bisectCrossing(table, previousJd, jd, latitude, longitude);
    } else if (previousAlt >= 0 && alt < 0 && sunsetJd === null) {
      sunsetJd = bisectCrossing(table, jd, previousJd, latitude, longitude);
    }
    previousJd = jd;
    previousAlt = alt;
    if (sunriseJd !== null && sunsetJd !== null) break;
  }
  return { sunriseJd, sunsetJd };
}

function bisectBoundary(
  table: SiddhantaTable,
  lo: number,
  hi: number,
  indexAt: (jd: number) => number | null,
): number | null {
  const start = indexAt(lo);
  if (start === null) return null;
  for (let k = 0; k < 40; k += 1) {
    const mid = (lo + hi) / 2;
    const index = indexAt(mid);
    if (index === null) return null;
    if (index === start) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The next instant after `jdUt` when the tithi changes, within two days, or
 * null when the table runs out first. Scans in 5-minute steps and bisects.
 */
export function nextTithiBoundary(table: SiddhantaTable, jdUt: number): number | null {
  const step = 5 / 1440;
  const indexAt = (jd: number): number | null => {
    const positions = positionsAt(table, jd);
    if (positions === null) return null;
    return tithiAt(
      positions.longitude[SIDDHANTA_BODY_INDEX.sun],
      positions.longitude[SIDDHANTA_BODY_INDEX.moon],
    ).number;
  };
  let previous = indexAt(jdUt);
  if (previous === null) return null;
  for (let k = 1; k <= 576; k += 1) {
    const jd = jdUt + k * step;
    const index = indexAt(jd);
    if (index === null) return null;
    if (index !== previous) return bisectBoundary(table, jd - step, jd, indexAt);
    previous = index;
  }
  return null;
}

/** The next instant after `jdUt` when the Moon's nakshatra changes, within two days. */
export function nextNakshatraBoundary(table: SiddhantaTable, jdUt: number): number | null {
  const step = 5 / 1440;
  const indexAt = (jd: number): number | null => {
    const positions = positionsAt(table, jd);
    if (positions === null) return null;
    return grahaAt(positions.longitude[SIDDHANTA_BODY_INDEX.moon]).nakshatra;
  };
  let previous = indexAt(jdUt);
  if (previous === null) return null;
  for (let k = 1; k <= 576; k += 1) {
    const jd = jdUt + k * step;
    const index = indexAt(jd);
    if (index === null) return null;
    if (index !== previous) return bisectBoundary(table, jd - step, jd, indexAt);
    previous = index;
  }
  return null;
}
