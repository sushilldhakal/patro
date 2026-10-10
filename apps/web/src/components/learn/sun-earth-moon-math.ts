/**
 * Simplified Sun–Earth–Moon system (Keplerian elliptical orbits) used to compare
 * the ~365-day solar year (12 solar months) against the ~12.37 lunar months
 * (~29.53 days each) that fit inside it — the source of the ~11-day gap
 * that adhik maas corrects.
 */

export const RAD = Math.PI / 180;

export const SEM = {
  W: 1100,
  H: 760,
  cx: 550,
  cy: 392,
  sunR: 58,
  /** Semi-major axis — Earth's heliocentric orbit. */
  earthOrbitA: 292,
  earthOrbitE: 0.14,
  earthR: 52,
  /** Semi-major axis — Moon's geocentric orbit. */
  moonOrbitA: 66,
  moonOrbitE: 0.12,
  moonR: 11,
} as const;

export const SEM_EARTH_ORBIT_B = SEM.earthOrbitA * Math.sqrt(1 - SEM.earthOrbitE ** 2);
export const SEM_MOON_ORBIT_B = SEM.moonOrbitA * Math.sqrt(1 - SEM.moonOrbitE ** 2);

export const SYNODIC_MONTH = 29.530588;
export const SIDEREAL_MONTH = 27.321661;
export const TROPICAL_YEAR = 365.2422;

export const BS_MONTHS = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भदौ",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पुष",
  "माघ",
  "फागुन",
  "चैत्र",
] as const;

function eccentricAnomaly(Mrad: number, e: number): number {
  let E = Mrad;
  for (let i = 0; i < 10; i++) E = Mrad + e * Math.sin(E);
  return E;
}

function trueAnomalyFromE(E: number, e: number): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

export function meanFromTrue(nuDeg: number, e = SEM.earthOrbitE): number {
  const nu = nuDeg * RAD;
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  const M = E - e * Math.sin(E);
  return (((M / RAD) % 360) + 360) % 360;
}

export function pol(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = deg * RAD;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

export function posOnEllipseFocus(
  cx: number,
  cy: number,
  a: number,
  e: number,
  nuDeg: number,
): [number, number] {
  const nu = nuDeg * RAD;
  const r = (a * (1 - e ** 2)) / (1 + e * Math.cos(nu));
  return [cx + r * Math.cos(nu), cy - r * Math.sin(nu)];
}

export function earthOrbitFromMeanAnomaly(meanDeg: number) {
  const M = meanDeg * RAD;
  const E = eccentricAnomaly(M, SEM.earthOrbitE);
  const nu = trueAnomalyFromE(E, SEM.earthOrbitE);
  const r = (SEM.earthOrbitA * (1 - SEM.earthOrbitE ** 2)) / (1 + SEM.earthOrbitE * Math.cos(nu));
  const ex = SEM.cx + r * Math.cos(nu);
  const ey = SEM.cy - r * Math.sin(nu);
  return {
    meanDeg: ((meanDeg % 360) + 360) % 360,
    nuDeg: ((nu / RAD) % 360 + 360) % 360,
    r,
    ex,
    ey,
  };
}

/** Moon position in Earth-local coords (periapsis at +x, toward Sun after group rotation). */
export function moonLocalFromTrueAnomaly(nuDeg: number): [number, number] {
  const nu = nuDeg * RAD;
  const r =
    (SEM.moonOrbitA * (1 - SEM.moonOrbitE ** 2)) / (1 + SEM.moonOrbitE * Math.cos(nu));
  return [r * Math.cos(nu), -r * Math.sin(nu)];
}

export function moonAbsoluteFromElongation(
  ex: number,
  ey: number,
  sunDirDeg: number,
  nuDeg: number,
): [number, number] {
  const [lx, ly] = moonLocalFromTrueAnomaly(nuDeg);
  const a = -sunDirDeg * RAD;
  return [ex + lx * Math.cos(a) - ly * Math.sin(a), ey + lx * Math.sin(a) + ly * Math.cos(a)];
}

export function sunDirFromEarth(ex: number, ey: number): number {
  return (((Math.atan2(-(SEM.cy - ey), SEM.cx - ex) / RAD) % 360) + 360) % 360;
}

export function ellipsePathAtFocus(cx: number, cy: number, a: number, e: number, steps = 120): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const nu = (i / steps) * 360 * RAD;
    const r = (a * (1 - e ** 2)) / (1 + e * Math.cos(nu));
    const x = cx + r * Math.cos(nu);
    const y = cy - r * Math.sin(nu);
    pts.push((i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1));
  }
  return pts.join(" ");
}

export function ellipsePathAtOrigin(a: number, e: number, steps = 72): string {
  return ellipsePathAtFocus(0, 0, a, e, steps);
}

export function earthMeanFromPointer(px: number, py: number): number {
  let bestM = 0;
  let bestDist = Infinity;
  for (let m = 0; m < 360; m += 1) {
    const { ex, ey } = earthOrbitFromMeanAnomaly(m);
    const d = (ex - px) ** 2 + (ey - py) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestM = m;
    }
  }
  const nu = Math.atan2(-(py - SEM.cy), px - SEM.cx);
  const clickM = meanFromTrue(((nu / RAD) % 360 + 360) % 360);
  const clickPos = earthOrbitFromMeanAnomaly(clickM);
  const clickDist = (clickPos.ex - px) ** 2 + (clickPos.ey - py) ** 2;
  return clickDist < bestDist ? clickM : bestM;
}

export function yearAngleFromDay(day: number): number {
  return (((day / TROPICAL_YEAR) * 360) % 360 + 360) % 360;
}

export function dayFromYearAngle(angle: number): number {
  return ((((angle % 360) + 360) % 360) / 360) * TROPICAL_YEAR;
}

export function dayFromEarthMean(meanDeg: number): number {
  return dayFromYearAngle(meanDeg);
}

export function elongationFromDay(day: number): number {
  return (((day % SYNODIC_MONTH) / SYNODIC_MONTH) * 360 + 360) % 360;
}

export function lunarMonthsCompleted(day: number): number {
  return Math.floor(day / SYNODIC_MONTH);
}

export function monthIndexFromAngle(deg: number): number {
  return Math.floor((((deg % 360) + 360) % 360) / 30);
}

export const NAKSHATRA_SPAN_DEG = 360 / 27;

/** Sun sidereal longitude (°) from Earth's true anomaly on the orbit diagram. */
export function sunSiderealLonFromEarthNu(nuDeg: number): number {
  return (((nuDeg + 180) % 360) + 360) % 360;
}

export function rashiIndexFromLon(lonDeg: number): number {
  return Math.floor((((lonDeg % 360) + 360) % 360) / 30) % 12;
}

export function nakshatraIndexFromLon(lonDeg: number): number {
  return Math.floor((((lonDeg % 360) + 360) % 360) / NAKSHATRA_SPAN_DEG) % 27;
}

export const SEM_GRID = {
  rashiIn: SEM.earthOrbitA + 16,
  rashiOut: SEM.earthOrbitA + 34,
  nakIn: SEM.earthOrbitA + 38,
  nakOut: SEM.earthOrbitA + 56,
  lineOut: SEM.earthOrbitA + 62,
  rashiLabelR: SEM.earthOrbitA + 25,
  nakLabelR: SEM.earthOrbitA + 47,
} as const;

export function radialOffset(ex: number, ey: number, dist: number): [number, number] {
  const dx = ex - SEM.cx;
  const dy = ey - SEM.cy;
  const len = Math.hypot(dx, dy) || 1;
  return [ex + (dx / len) * dist, ey + (dy / len) * dist];
}

export function localRadialOffset(lx: number, ly: number, dist: number): [number, number] {
  const len = Math.hypot(lx, ly) || 1;
  return [lx + (lx / len) * dist, ly + (ly / len) * dist];
}
