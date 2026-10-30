/**
 * Perihelion (उपसौर) and aphelion (अपसौर) against the seasons.
 *
 * The solstices come from the direction of Earth's tilted axis; perihelion and
 * aphelion come from the orientation of Earth's elliptical orbit. Two slow
 * motions turn one against the other: the axis precesses (~50.3″ a year) and
 * the orbit's long axis itself turns forward (apsidal precession, ~11.6″ a year
 * against the stars). Together the perihelion moves ~61.9″ a year through the
 * seasons — one full round in about 21,000 years (the "climatic precession";
 * its real period wanders between roughly 19,000 and 23,000 years).
 *
 * Shared by the website's and the app's 3D diagram so both say the same thing.
 * Angles are measured in the seasonal frame, from the December solstice in the
 * direction Earth moves; distances are in units of the orbit's semi-major axis.
 */

/** Perihelion against the equinoxes, degrees per year. */
export const PERIHELION_TROPICAL_RATE_DEG = 61.9 / 3600;
/** Perihelion against the fixed stars (apsidal precession), degrees per year. */
export const PERIHELION_SIDEREAL_RATE_DEG = 11.6 / 3600;
/** Years for perihelion to go once round the seasons. */
export const CLIMATIC_PRECESSION_YEARS = 360 / PERIHELION_TROPICAL_RATE_DEG;
/** Earth's eccentricity today. It too varies (about 0.005–0.058 over ~100,000-year cycles). */
export const EARTH_ECCENTRICITY = 0.0167;

/** Reference epoch: perihelion ≈ 3 January, ~12.8° of orbit after the December solstice. */
const EPOCH_YEAR = 2026;
const EPOCH_ANGLE_DEG = 12.8;
const TROPICAL_YEAR_DAYS = 365.2422;

const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Perihelion's position after the December solstice, degrees (0–360), in a given CE year. */
export function perihelionAngle(yearCe: number): number {
  return wrap360(EPOCH_ANGLE_DEG + PERIHELION_TROPICAL_RATE_DEG * (yearCe - EPOCH_YEAR));
}

/**
 * Perihelion as a calendar date in that era: month index 0–11 and day of month.
 * Uses the Sun's mean pace, so it is good to a day or two — enough to show the drift.
 */
export function perihelionDate(yearCe: number): { month: number; day: number } {
  const days = (perihelionAngle(yearCe) / 360) * TROPICAL_YEAR_DAYS;
  const d = new Date(Date.UTC(2025, 11, 21) + Math.round(days) * 86_400_000);
  return { month: d.getUTCMonth(), day: d.getUTCDate() };
}

/** Sun–Earth distance at a seasonal angle, given where perihelion sits. */
export function distanceAt(seasonAngleDeg: number, perihelionDeg: number, e = EARTH_ECCENTRICITY): number {
  const nu = ((seasonAngleDeg - perihelionDeg) * Math.PI) / 180;
  return (1 - e * e) / (1 + e * Math.cos(nu));
}

/**
 * Sunlight reaching Earth at each solstice, as a percent above (+) or below (−)
 * the sunlight at the mean distance. Sunlight falls off as 1 / distance².
 */
export function solsticeSunlight(yearCe: number, e = EARTH_ECCENTRICITY): { june: number; december: number } {
  const peri = perihelionAngle(yearCe);
  const pct = (r: number) => (1 / (r * r) - 1) * 100;
  return { june: pct(distanceAt(180, peri, e)), december: pct(distanceAt(0, peri, e)) };
}

/** How the northern summer runs in a given era: perihelion near June makes it fierce, aphelion mild. */
export function northernSummer(yearCe: number): "intense" | "mild" | "middle" {
  const { june } = solsticeSunlight(yearCe);
  if (june > 1.5) return "intense";
  if (june < -1.5) return "mild";
  return "middle";
}
