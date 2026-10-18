/**
 * The mechanics behind "what is a day".
 *
 * A day is not one rotation. A planet turning once against the fixed stars is
 * a **sidereal day**, but by the time it has, the planet has also moved along
 * its orbit — so it must turn a little further to bring the Sun back to the
 * meridian. That extra turn is what makes a **solar day**, and it is why a
 * year has exactly one fewer solar day than sidereal days.
 *
 * The extra turn is not constant. Two things make it vary:
 *
 *   - the orbit is an **ellipse**, so the planet sweeps faster near perihelion
 *     (Kepler's second law), and
 *   - the spin axis is **tilted**, so the Sun's motion is along the ecliptic
 *     while clocks measure along the equator.
 *
 * Their combined effect is the **equation of time** — true solar time minus
 * mean solar time — which for Earth runs to about ±16 minutes over a year.
 *
 * Angles are radians throughout and time is measured in days from perihelion.
 * The model is deliberately the schoolbook one (second-order eccentricity
 * seed, Newton–Raphson refinement, no nutation or planetary perturbation): it
 * is a teaching instrument, not an ephemeris. For real positions the app uses
 * the panchanga engine.
 */

const PI2 = Math.PI * 2;

/** Day-of-year of the vernal equinox, as an orbit angle. */
export const VERNAL = (79 * PI2) / 365;

/** Day-of-year of perihelion, as an orbit angle. Earth reaches it in early January. */
export const PERIHELION = (4 * PI2) / 365;

/** Angle from perihelion round to the vernal equinox — the tilt's reference direction. */
export const VERNAL_FROM_PERIHELION = VERNAL - PERIHELION;

/**
 * Mean anomaly at मेष सङ्क्रान्ति — where the बिक्रम year starts on the orbit.
 *
 * Earth reaches perihelion in early January and मेष सङ्क्रान्ति falls around
 * 14 April, about `101` days later. Anchoring the sim's day 0 here rather than
 * at perihelion is what puts the year's features in the right बिक्रम months:
 * the Sun is near perihelion and moving fastest around पुष–माघ, so those months
 * are short, and slowest near aphelion in जेठ–भदौ, so those are long — which is
 * the real reason a बिक्रम month runs 29 to 32 days.
 */
export const MESHA_FROM_PERIHELION = (101 * PI2) / 365;

/** Mean anomaly at a point in the year, measured from मेष सङ्क्रान्ति. */
export function meanAnomalyAt(yearFraction: number): number {
  return euclideanModulo(yearFraction * PI2 + MESHA_FROM_PERIHELION, PI2);
}

/** Always-positive remainder, unlike the `%` operator. */
export function euclideanModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Wrap to (−π, π] — the shortest way round. */
export function shortestAngle(a: number): number {
  return euclideanModulo(a + Math.PI, PI2) - Math.PI;
}

/**
 * Second-order-in-`e` series for the true anomaly.
 *
 * Good to a few arcseconds at Earth's eccentricity, and used only as the seed
 * for the Newton–Raphson solve below — which is what makes the big
 * eccentricities the playground allows still converge.
 *
 * @see https://en.wikipedia.org/wiki/True_anomaly#From_the_mean_anomaly
 */
function trueAnomalySeries(M: number, e: number): number {
  return M + 2 * e * Math.sin(M) + (5 / 4) * e * e * Math.sin(2 * M);
}

/**
 * Solve Kepler's equation `E − e·sin E = M` for the eccentric anomaly.
 *
 * Newton–Raphson from the series seed. The derivative `1 − e·cos E` only
 * vanishes at `e = 1`, which the callers never reach, but the guard keeps a
 * degenerate step from producing `Infinity` rather than merely a bad answer.
 */
function eccentricAnomaly(M: number, e: number): number {
  let E = trueAnomalySeries(M, e);
  for (let i = 0; i < 24; i += 1) {
    const f = E - e * Math.sin(E) - M;
    if (Math.abs(f) < 1e-10) break;
    const df = 1 - e * Math.cos(E);
    if (Math.abs(df) < 1e-12) break;
    E -= f / df;
  }
  return E;
}

/** True anomaly from mean anomaly — where the planet actually is, not where a clock says. */
export function trueAnomaly(M: number, e: number): number {
  if (e === 0) return M;

  const E = eccentricAnomaly(M, e);
  const cosE = Math.cos(E);
  let theta = Math.acos((cosE - e) / (1 - e * cosE));
  /* acos only spans [0, π]; the far half of the orbit is its reflection. */
  if (euclideanModulo(E, PI2) > Math.PI) theta = PI2 - theta;
  return theta;
}

/** The inverse of {@link trueAnomaly} — used when a drag names a position directly. */
export function meanAnomalyFromTrue(T: number, e: number): number {
  const g = Math.sqrt((1 - e) / (1 + e));
  const E = 2 * Math.atan(g * Math.tan(0.5 * T));
  return euclideanModulo(E - e * Math.sin(E), PI2);
}

/**
 * `atan` folds the circle in half; put the angle back in the branch its
 * argument came from so right ascension advances instead of jumping.
 */
function unfold(ang: number, against: number): number {
  const half = against / Math.PI;
  if (half <= 0.5) return ang;
  if (half <= 1.5) return ang + Math.PI;
  return ang + PI2;
}

/** Right ascension of the true Sun — its ecliptic angle projected onto the equator. */
function rightAscension(M: number, e: number, tilt: number, perihelionAngle: number): number {
  const ang = trueAnomaly(M, e) + perihelionAngle;
  return unfold(Math.atan(Math.cos(tilt) * Math.tan(ang)), ang);
}

/**
 * Equation of time, in radians of planet rotation.
 *
 * The mean Sun's angle minus the true Sun's — positive when a sundial reads
 * ahead of a clock. Multiply by `24 / 2π` for hours.
 *
 * @param M mean anomaly (the orbit angle a uniform clock would give)
 * @param e orbital eccentricity
 * @param tilt axial tilt
 * @param perihelionAngle angle from the vernal equinox to perihelion
 */
export function equationOfTime(
  M: number,
  e: number,
  tilt: number,
  perihelionAngle: number,
): number {
  const eot = M + perihelionAngle - rightAscension(M, e, tilt, perihelionAngle);
  return Math.abs(eot) < 1e-8 ? 0 : eot;
}

/* ------------------------------------------------------------------ */
/* Orbit geometry                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ellipse radii that keep the *mean* orbit radius fixed at `meanDistance`.
 *
 * Pinning the mean rather than the semi-major axis is what lets the
 * eccentricity slider run from circle to cigar without the orbit swelling out
 * of frame — the shape changes, the scale does not.
 */
export function orbitRadii(e: number, meanDistance: number) {
  const gamma = Math.sqrt(1 - e * e);
  const semiMinor = (2 * meanDistance * gamma) / (1 + gamma);
  return { semiMajor: semiMinor / gamma, semiMinor };
}

/** Distance from focus to planet at a given true anomaly — the polar form of the ellipse. */
export function orbitDistance(semiMajor: number, e: number, theta: number): number {
  return (semiMajor * (1 - e * e)) / (1 + e * Math.cos(theta));
}

/* ------------------------------------------------------------------ */
/* Reading the sim as a clock                                          */
/* ------------------------------------------------------------------ */

/** A 12-hour clock face from minutes past midnight. */
export function clockFromMinutes(n: number): string {
  const wrapped = euclideanModulo(n, 24 * 60);
  const h24 = Math.floor(wrapped / 60);
  const minutes = Math.floor(wrapped - h24 * 60);
  const suffix = h24 >= 12 ? "pm" : "am";
  const hours = ((h24 + 11) % 12) + 1;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}${suffix}`;
}

/**
 * The three clocks a single instant can be read on.
 *
 * All three tick at the same *rate* only when the orbit is circular and the
 * axis upright — which is exactly the point the playground exists to make.
 *
 * @param day position in the year, in sidereal rotations
 * @param daysPerYear sidereal rotations per orbit (one more than solar days)
 * @param eot equation of time in radians, from {@link equationOfTime}
 */
export function clocks(day: number, daysPerYear: number, eot: number) {
  const solarRate = 1 - 1 / daysPerYear;
  /* Half a turn, so day 0 — मेष सङ्क्रान्ति — opens at local noon on all three,
     with काठमाडौँ under the Sun (the scene's spin phase is set to match; see
     `planetMesh` in DaySimScene). The three tick at different rates and so can
     agree at exactly one instant: this is that instant, and every later reading
     is the drift accumulated since. */
  const offset = 0.5;
  const minutes = (frac: number) => 24 * 60 * euclideanModulo(frac, 1);

  return {
    sidereal: clockFromMinutes(minutes(day + offset)),
    mean: clockFromMinutes(minutes(day * solarRate + offset)),
    solar: clockFromMinutes(minutes(day * solarRate + offset + eot / PI2)),
  };
}

/** Whole days elapsed on each of the three counts. */
export function dayCounts(day: number, daysPerYear: number, eot: number) {
  const solarRate = 1 - 1 / daysPerYear;
  return {
    sidereal: Math.floor(day),
    mean: Math.floor(day * solarRate),
    solar: Math.floor(day * solarRate + eot / PI2),
  };
}

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

const EARTH_YEAR = 365.256;

export interface PlanetPreset {
  key: string;
  /** Sidereal rotations per orbit. Informational only — see below. */
  daysPerYear: number;
  eccentricity: number;
  /** Axial tilt in degrees. */
  tilt: number;
}

/**
 * The five graha the eye can see, with Earth as the home reading.
 *
 * These exist to make one point: the extra turn and the equation of time are
 * not Earth's quirks. Give any world an ellipse and a tilted axis and it gets
 * its own analemma, of its own shape.
 *
 * **Only eccentricity and tilt are applied.** `daysPerYear` is carried for
 * display and nothing else, because none of these fit on the slider — Mercury
 * turns half a time per orbit and Saturn twenty-four thousand — so setting it
 * would clamp to the nearest end and quietly show something that is not the
 * planet at all. Eccentricity and tilt are exact, and they are the two that
 * shape the equation of time, which is what the presets are for.
 *
 * Ordered as the weekdays name them — मङ्गल, बुध, बृहस्पति, शुक्र, शनि — since
 * that ordering is itself a पञ्चाङ्ग idea the library teaches elsewhere.
 * Uranus and Neptune are gone: they are not नव ग्रह and have no business here.
 */
export const PLANET_PRESETS: PlanetPreset[] = [
  { key: "earth", daysPerYear: EARTH_YEAR, eccentricity: 0.0167, tilt: 23.439 },
  { key: "mars", daysPerYear: (686.98 * 24) / 24.7, eccentricity: 0.0934, tilt: 25.19 },
  { key: "mercury", daysPerYear: (87.969 * 24) / 4222.6, eccentricity: 0.2056, tilt: 0.01 },
  { key: "jupiter", daysPerYear: (11.862 * EARTH_YEAR * 24) / 9.9, eccentricity: 0.0484, tilt: 3.13 },
  /* Tilted past 90°, which is how a retrograde spin is written down. */
  { key: "venus", daysPerYear: (224.701 * 24) / 2802.0, eccentricity: 0.0068, tilt: 177.4 },
  { key: "saturn", daysPerYear: (29.457 * EARTH_YEAR * 24) / 10.7, eccentricity: 0.0542, tilt: 26.73 },
];

/**
 * Day-of-year each बिक्रम month opens, counted from मेष सङ्क्रान्ति.
 *
 * A बिक्रम month *is* a solar rashi, so a month begins the moment the Sun has
 * travelled another 30° — not after a fixed count of days. Solved backwards
 * through {@link meanAnomalyFromTrue}: name the true anomaly the boundary sits
 * at, and ask what time that corresponds to.
 *
 * This is what makes the months uneven. The Sun runs fast near perihelion and
 * slow near aphelion, so the 30° steps take unequal numbers of days — which is
 * the real reason a बिक्रम month is 29 to 32 days long and not 30 every time.
 */
export function solarMonthStarts(e: number, yearDays = 365): number[] {
  /* Day 0 of the sim is मेष सङ्क्रान्ति; this is the true anomaly there. */
  const theta0 = trueAnomaly(MESHA_FROM_PERIHELION, e);
  const out: number[] = [];
  for (let k = 0; k < 12; k += 1) {
    const theta = euclideanModulo(theta0 + (k * PI2) / 12, PI2);
    const M = meanAnomalyFromTrue(theta, e);
    out.push(euclideanModulo((M - MESHA_FROM_PERIHELION) * (yearDays / PI2), yearDays));
  }
  return out;
}

/** Equation-of-time curve over one orbit, sampled for the graph. */
export function eotCurve(e: number, tilt: number, samples = 240): { day: number; minutes: number }[] {
  const p = PERIHELION - VERNAL;
  const out: { day: number; minutes: number }[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const dayOfYear = (i / samples) * 365;
    out.push({
      day: dayOfYear,
      minutes:
        (equationOfTime(meanAnomalyAt(dayOfYear / 365), e, tilt, p) * 24 * 60) / PI2,
    });
  }
  return out;
}
