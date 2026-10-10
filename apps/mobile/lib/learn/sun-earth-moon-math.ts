/**
 * Simplified Sun–Earth–Moon orbit math (shared with web learn diagrams).
 */

export const RAD = Math.PI / 180;

export const SYNODIC_MONTH = 29.530588;
export const TROPICAL_YEAR = 365.2422;

export const SEM = {
  earthOrbitE: 0.14,
  earthOrbitA: 1,
  moonOrbitA: 0.22,
  moonOrbitE: 0.12,
} as const;

function eccentricAnomaly(Mrad: number, e: number): number {
  let E = Mrad;
  for (let i = 0; i < 10; i++) E = Mrad + e * Math.sin(E);
  return E;
}

function trueAnomalyFromE(E: number, e: number): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

export function earthOrbitFromMeanAnomaly(meanDeg: number) {
  const M = meanDeg * RAD;
  const E = eccentricAnomaly(M, SEM.earthOrbitE);
  const nu = trueAnomalyFromE(E, SEM.earthOrbitE);
  const r = (SEM.earthOrbitA * (1 - SEM.earthOrbitE ** 2)) / (1 + SEM.earthOrbitE * Math.cos(nu));
  const nuDeg = (((nu / RAD) % 360) + 360) % 360;
  return { nuDeg, r };
}

export function moonLocalFromTrueAnomaly(nuDeg: number): [number, number] {
  const nu = nuDeg * RAD;
  const r =
    (SEM.moonOrbitA * (1 - SEM.moonOrbitE ** 2)) / (1 + SEM.moonOrbitE * Math.cos(nu));
  return [r * Math.cos(nu), r * Math.sin(nu)];
}

export function yearAngleFromDay(day: number): number {
  return (((day / TROPICAL_YEAR) * 360) % 360 + 360) % 360;
}

export function elongationFromDay(day: number): number {
  return (((day % SYNODIC_MONTH) / SYNODIC_MONTH) * 360 + 360) % 360;
}

/** Geocentric-style layout: Sun at origin; Earth on ecliptic (XZ); Moon around Earth. */
export function sunEarthMoonLayout3D(day: number) {
  const mean = yearAngleFromDay(day);
  const { nuDeg, r: earthR } = earthOrbitFromMeanAnomaly(mean);
  const earthAngle = nuDeg * RAD;
  const earth: [number, number, number] = [earthR * Math.cos(earthAngle), 0, earthR * Math.sin(earthAngle)];

  const elong = elongationFromDay(day);
  const [mlx, mlz] = moonLocalFromTrueAnomaly(elong);
  const sunDir = Math.atan2(-earth[2], -earth[0]);
  const ca = Math.cos(sunDir);
  const sa = Math.sin(sunDir);
  const moon: [number, number, number] = [
    earth[0] + mlx * ca - mlz * sa,
    0,
    earth[2] + mlx * sa + mlz * ca,
  ];

  const sun: [number, number, number] = [0, 0, 0];
  return { sun, earth, moon, elongDeg: elong, earthNuDeg: nuDeg };
}

export function tithiIndexFromElongation(elongDeg: number): number {
  return Math.floor((((elongDeg % 360) + 360) % 360) / 12) + 1;
}

const PRECESS_RATE = 50.2879 / 3600;
const LAHIRI_2000 = 23.85;

export function lahiriAyanamsha(yearCe: number): number {
  return Math.max(0, LAHIRI_2000 + (yearCe - 2000) * PRECESS_RATE);
}

/* ── the extra quantities the 3D diagrams read out ─────────────────────── */

export const SIDEREAL_MONTH = 27.321661;
export const DRACONIC_MONTH = 27.212221;
/** Earth's obliquity, degrees — the tilt that makes the ritu. */
export const EARTH_AXIAL_TILT = 23.44;
/** The Moon's orbit sits this far off the ecliptic — why eclipses are rare. */
export const MOON_ORBIT_TILT = 5.145;
/** One full turn of the line of nodes, years (retrograde). */
export const NODE_CYCLE_YEARS = 18.6;
export const NAKSHATRA_SPAN_DEG = 360 / 27;

export function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Sun's sidereal longitude seen from Earth — opposite Earth's heliocentric spot. */
export function sunSiderealLonFromEarthNu(nuDeg: number): number {
  return normDeg(nuDeg + 180);
}

export function rashiIndexFromLon(lonDeg: number): number {
  return Math.floor(normDeg(lonDeg) / 30) % 12;
}

export function nakshatraIndexFromLon(lonDeg: number): number {
  return Math.floor(normDeg(lonDeg) / NAKSHATRA_SPAN_DEG) % 27;
}

export function lunarMonthsCompleted(day: number): number {
  return Math.floor(day / SYNODIC_MONTH);
}

/** Lit fraction of the Moon's disc, 0 (new) → 1 (full). */
export function moonPhaseFraction(elongDeg: number): number {
  return (1 - Math.cos(normDeg(elongDeg) * RAD)) / 2;
}

export function pakshaFromElongation(elongDeg: number): "shukla" | "krishna" {
  return normDeg(elongDeg) < 180 ? "shukla" : "krishna";
}

/**
 * The Moon's ecliptic latitude, degrees, for a day counted from a node crossing
 * at day 0. Only the nodes — where this passes through zero — can hold an
 * eclipse, which is the whole point of drawing it.
 */
export function moonEclipticLatitude(day: number, nodeOffsetDeg = 0): number {
  const argLat = normDeg((day / DRACONIC_MONTH) * 360 + nodeOffsetDeg);
  return MOON_ORBIT_TILT * Math.sin(argLat * RAD);
}

/** How far the Moon is from the nearest node, degrees (0–180). */
export function degreesFromNode(day: number, nodeOffsetDeg = 0): number {
  const argLat = normDeg((day / DRACONIC_MONTH) * 360 + nodeOffsetDeg);
  return Math.min(argLat, 360 - argLat);
}

/**
 * Sun–Earth–Moon in 3D with the Moon lifted out of the ecliptic by its 5.1°
 * orbital tilt. The flat {@link sunEarthMoonLayout3D} is the same geometry with
 * that lift set to zero.
 */
export function sunEarthMoonLayout3DTilted(day: number, nodeOffsetDeg = 0) {
  const flat = sunEarthMoonLayout3D(day);
  const lat = moonEclipticLatitude(day, nodeOffsetDeg) * RAD;
  const dx = flat.moon[0] - flat.earth[0];
  const dz = flat.moon[2] - flat.earth[2];
  const r = Math.hypot(dx, dz) || 1;
  const scale = Math.cos(lat);
  const moon: [number, number, number] = [
    flat.earth[0] + dx * scale,
    r * Math.sin(lat),
    flat.earth[2] + dz * scale,
  ];
  return { ...flat, moon, moonLatDeg: moonEclipticLatitude(day, nodeOffsetDeg) };
}

/** Earth's spin axis, tilted in the plane the seasons swing through. */
export function earthAxisVector(tiltDeg = EARTH_AXIAL_TILT): [number, number, number] {
  const t = tiltDeg * RAD;
  return [Math.sin(t), Math.cos(t), 0];
}

/**
 * Which ritu the northern hemisphere is in, as a 0–1 position around the year
 * with 0 at the March equinox — used to colour the seasons diagram.
 */
export function seasonPhaseFromDay(day: number): number {
  return normDeg(yearAngleFromDay(day)) / 360;
}
