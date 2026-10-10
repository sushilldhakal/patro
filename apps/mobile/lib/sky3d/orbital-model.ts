/**
 * Geocentric orbital model — the motion behind the 3D Aakash Gochar scene.
 *
 * Earth is the origin. Planets are propagated from J2000 Keplerian elements in
 * *heliocentric* ecliptic coordinates and then differenced against Earth, which
 * is what makes the scene genuinely geocentric: a planet's apparent longitude
 * loops backwards near opposition exactly as vakri gati does in the sky.
 *
 * This is a *display* model, not an ephemeris. The API remains the source of
 * truth for any date the user actually reads numbers off — {@link calibrate}
 * pins the model to the API longitudes for the selected date, so the scene is
 * exact there and merely smooth as it animates away from it.
 *
 * Frame: ecliptic of date, X toward the vernal equinox, Z toward ecliptic north.
 * Angles in degrees unless a name says otherwise.
 */

import type { GrahaKey } from "@/lib/graha-details";
import { normalizeDeg } from "@/lib/sky3d/geocentric-model";

const RAD = Math.PI / 180;

/** Julian Day for a JS instant — the app's single date identity, as everywhere else. */
export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Days since J2000.0 (JD 2451545.0). */
export function daysSinceJ2000(date: Date): number {
  return julianDay(date) - 2451545.0;
}

export type OrbitalElements = {
  /** Semi-major axis, AU. */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Inclination to the ecliptic, deg. */
  i: number;
  /** Longitude of the ascending node, deg. */
  node: number;
  /** Longitude of perihelion (ϖ = node + argument of perihelion), deg. */
  peri: number;
  /** Mean longitude at J2000, deg. */
  L0: number;
  /** Sidereal orbital period, days. */
  periodDays: number;
};

/**
 * Keplerian elements at J2000.0 (JPL's approximate-positions table).
 * Earth carries the Earth–Moon barycentre elements, which is what the
 * geocentric difference wants.
 */
export const PLANET_ELEMENTS = {
  mercury: { a: 0.38709927, e: 0.20563593, i: 7.00497902, node: 48.33076593, peri: 77.45779628, L0: 252.2503235, periodDays: 87.9691 },
  venus: { a: 0.72333566, e: 0.00677672, i: 3.39467605, node: 76.67984255, peri: 131.60246718, L0: 181.9790995, periodDays: 224.701 },
  earth: { a: 1.00000261, e: 0.01671123, i: -0.00001531, node: 0.0, peri: 102.93768193, L0: 100.46457166, periodDays: 365.256363 },
  mars: { a: 1.52371034, e: 0.0933941, i: 1.84969142, node: 49.55953891, peri: -23.94362959, L0: -4.55343205, periodDays: 686.98 },
  jupiter: { a: 5.202887, e: 0.04838624, i: 1.30439695, node: 100.47390909, peri: 14.72847983, L0: 34.39644051, periodDays: 4332.589 },
  saturn: { a: 9.53667594, e: 0.05386179, i: 2.48599187, node: 113.66242448, peri: 92.59887831, L0: 49.95424423, periodDays: 10759.22 },
} satisfies Record<string, OrbitalElements>;

export type PlanetKey = keyof typeof PLANET_ELEMENTS;

/**
 * Uranus, Neptune, Pluto — J2000 mean elements, same table and same
 * precision as {@link PLANET_ELEMENTS}. Deliberately *not* part of
 * {@link GrahaKey}: the navagraha are exactly the nine the API computes
 * dignities, relations and DMS for, and these three have none of that —
 * they exist only so the sky scene has somewhere honest to draw them.
 */
export const OUTER_PLANET_ELEMENTS = {
  uranus: {
    a: 19.18916464,
    e: 0.04725744,
    i: 0.77263783,
    node: 74.01692503,
    peri: 170.9542763,
    /* JPL's mean longitude at J2000, which is what {@link heliocentric} wants
       (it forms M = L0 − ϖ itself). The two numbers that stood here before
       were already JPL's L − ϖ, so the perihelion came off twice and अरुण
       drew ~195° from where it is — it was reading as a plausible dot in
       plainly the wrong राशि. वरुण was out the same way; यम was always
       right, which is why the error never looked systematic. */
    L0: 313.23810451,
    periodDays: 30685,
  },
  neptune: {
    a: 30.06992276,
    e: 0.00859048,
    i: 1.77004347,
    node: 131.78422574,
    peri: 44.96476227,
    L0: 304.87997031,
    periodDays: 60190,
  },
  pluto: {
    a: 39.48211675,
    e: 0.2488273,
    i: 17.14001206,
    node: 110.30393684,
    peri: 224.06891629,
    L0: 238.92903833,
    periodDays: 90560,
  },
} satisfies Record<string, OrbitalElements>;

export type OuterPlanetKey = keyof typeof OUTER_PLANET_ELEMENTS;

/**
 * Sidereal ecliptic longitude/latitude/distance for a decorative outer
 * planet — {@link geocentricPointAt}'s counterpart for a body outside the
 * navagraha the API knows about. No calibration, no speed/retrograde: these
 * three are never selected, followed, or read as a chart value, only drawn.
 */
export function outerPlanetAt(
  key: OuterPlanetKey,
  dt: number,
): { longitude: number; latitude: number; distanceAu: number } {
  const earth = heliocentric(PLANET_ELEMENTS.earth, dt);
  const body = heliocentric(OUTER_PLANET_ELEMENTS[key], dt);
  const dx = body.x - earth.x;
  const dy = body.y - earth.y;
  const dz = body.z - earth.z;
  const r = Math.hypot(dx, dy, dz);
  const lon = normalizeDeg(Math.atan2(dy, dx) / RAD);
  const lat = (r === 0 ? 0 : Math.asin(dz / r)) / RAD;
  return {
    longitude: normalizeDeg(lon - ayanamsa(dt)),
    latitude: lat,
    distanceAu: r,
  };
}

/** Rectangular ecliptic coordinates, AU. */
export type eclipticXYZ = { x: number; y: number; z: number };

/** Newton–Raphson on Kepler's equation, M = E − e·sin E (radians). */
function solveKepler(M: number, e: number): number {
  let E = M;
  for (let n = 0; n < 8; n += 1) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

/** Heliocentric ecliptic position, AU, `dt` days after J2000. */
export function heliocentric(el: OrbitalElements, dt: number): eclipticXYZ {
  const n = 360 / el.periodDays;
  const M = normalizeDeg(el.L0 - el.peri + n * dt) * RAD;
  const E = solveKepler(M, el.e);

  // Position in the orbital plane, perihelion along +x.
  const xOrb = el.a * (Math.cos(E) - el.e);
  const yOrb = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  const argPeri = (el.peri - el.node) * RAD;
  const node = el.node * RAD;
  const inc = el.i * RAD;

  const cw = Math.cos(argPeri);
  const sw = Math.sin(argPeri);
  const xp = xOrb * cw - yOrb * sw;
  const yp = xOrb * sw + yOrb * cw;

  const ci = Math.cos(inc);
  const si = Math.sin(inc);
  const yi = yp * ci;
  const zi = yp * si;

  const cn = Math.cos(node);
  const sn = Math.sin(node);
  return {
    x: xp * cn - yi * sn,
    y: xp * sn + yi * cn,
    z: zi,
  };
}

/**
 * Geocentric Moon, AU — abridged Meeus (Astronomical Algorithms ch. 47).
 * Good to roughly 0.3° in longitude, which is invisible at scene scale and is
 * corrected outright by {@link calibrate} for the date on screen.
 */
export function moonGeocentric(dt: number): eclipticXYZ {
  const Lp = 218.316 + 13.176396 * dt; // mean longitude
  const M = (134.963 + 13.064993 * dt) * RAD; // Moon's mean anomaly
  const Ms = (357.529 + 0.98560028 * dt) * RAD; // Sun's mean anomaly
  const F = (93.272 + 13.22935 * dt) * RAD; // argument of latitude
  const D = (297.85 + 12.190749 * dt) * RAD; // mean elongation

  const lon =
    Lp +
    6.289 * Math.sin(M) +
    1.274 * Math.sin(2 * D - M) +
    0.658 * Math.sin(2 * D) +
    0.214 * Math.sin(2 * M) -
    0.186 * Math.sin(Ms) -
    0.114 * Math.sin(2 * F);

  const lat =
    5.128 * Math.sin(F) +
    0.281 * Math.sin(M + F) -
    0.278 * Math.sin(F - M) -
    0.173 * Math.sin(F - 2 * D);

  const distKm =
    385001 -
    20905 * Math.cos(M) -
    3699 * Math.cos(2 * D - M) -
    2956 * Math.cos(2 * D) -
    570 * Math.cos(2 * M);

  const r = distKm / 149597870.7;
  const l = lon * RAD;
  const b = lat * RAD;
  return {
    x: r * Math.cos(b) * Math.cos(l),
    y: r * Math.cos(b) * Math.sin(l),
    z: r * Math.sin(b),
  };
}

/** Mean longitude of the ascending lunar node (Rahu), tropical deg — always retrograde. */
export function meanLunarNode(dt: number): number {
  const T = dt / 36525;
  return normalizeDeg(125.04452 - 1934.136261 * T + 0.0020708 * T * T);
}

/**
 * Lahiri ayanamsa, deg — the tropical→sidereal shift the whole app works in.
 * Linear-plus-quadratic fit about J2000; sub-arcminute across the app's range.
 */
export function ayanamsa(dt: number): number {
  const T = dt / 36525;
  return 23.85231 + 1.3969713 * T + 0.0003086 * T * T;
}

/** A graha placed on the sky for one instant. */
export type GeoBody = {
  key: GrahaKey;
  /** Sidereal (Lahiri) ecliptic longitude, deg 0–360. */
  longitude: number;
  /** ecliptic latitude — the shara, deg. */
  latitude: number;
  /** Geocentric distance, AU. Nodes carry the Moon's distance. */
  distanceAu: number;
  /** Apparent longitude rate, deg/day. Negative means vakri. */
  speedDegPerDay: number;
  retrograde: boolean;
};

function toSpherical(v: eclipticXYZ) {
  const r = Math.hypot(v.x, v.y, v.z);
  return {
    lon: normalizeDeg(Math.atan2(v.y, v.x) / RAD),
    lat: Math.asin(r === 0 ? 0 : v.z / r) / RAD,
    r,
  };
}

function sub(a: eclipticXYZ, b: eclipticXYZ): eclipticXYZ {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Tropical geocentric longitude/latitude/distance of one graha at `dt`. */
function tropicalOf(key: GrahaKey, dt: number) {
  if (key === "moon") return toSpherical(moonGeocentric(dt));

  if (key === "rahu" || key === "ketu") {
    const node = meanLunarNode(dt);
    const moon = toSpherical(moonGeocentric(dt));
    return { lon: key === "rahu" ? node : normalizeDeg(node + 180), lat: 0, r: moon.r };
  }

  const earth = heliocentric(PLANET_ELEMENTS.earth, dt);
  if (key === "sun") {
    // The Sun as seen from Earth is simply the reversed Earth vector.
    return toSpherical({ x: -earth.x, y: -earth.y, z: -earth.z });
  }
  return toSpherical(sub(heliocentric(PLANET_ELEMENTS[key as PlanetKey], dt), earth));
}

/**
 * Signed longitude difference in (−180, 180] — so a body crossing 0° Mesha
 * does not read as a 360°/day lurch.
 */
export function deltaLongitude(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Per-graha sidereal-longitude corrections, deg, keyed by graha. */
export type SkyCalibration = Partial<Record<GrahaKey, number>>;

/**
 * The whole sky for one instant, sidereal and calibrated.
 *
 * `calibration` shifts each graha's longitude by a constant so the model agrees
 * with the API for the date it was derived from; pass `{}` for the raw model.
 */
export function geocentricSky(date: Date, calibration: SkyCalibration = {}): Record<GrahaKey, GeoBody> {
  const dt = daysSinceJ2000(date);
  const out = {} as Record<GrahaKey, GeoBody>;
  for (const key of GEO_BODY_ORDER) {
    out[key] = bodyAt(key, dt, calibration[key] ?? 0);
  }
  return out;
}

/**
 * Where one graha *is* at `dt`, without asking how fast it is going.
 *
 * {@link geocentricBody} evaluates the orbit twice — once for the position and
 * once half a day later, for the speed that decides vakri. A trail wants ninety
 * positions and no speeds, so it uses this and does half the work.
 */
export function geocentricPointAt(
  key: GrahaKey,
  dt: number,
  shift = 0,
): { longitude: number; latitude: number; distanceAu: number } {
  const now = tropicalOf(key, dt);
  return {
    longitude: normalizeDeg(now.lon - ayanamsa(dt) + shift),
    latitude: now.lat,
    distanceAu: now.r,
  };
}

/** One graha at one instant — the per-body form of {@link geocentricSky}. */
export function geocentricBody(
  key: GrahaKey,
  date: Date,
  calibration: SkyCalibration = {},
): GeoBody {
  return bodyAt(key, daysSinceJ2000(date), calibration[key] ?? 0);
}

function bodyAt(key: GrahaKey, dt: number, shift: number): GeoBody {
  const now = tropicalOf(key, dt);
  const then = tropicalOf(key, dt + 0.5);
  const speed = deltaLongitude(now.lon, then.lon) * 2;

  return {
    key,
    longitude: normalizeDeg(now.lon - ayanamsa(dt) + shift),
    latitude: now.lat,
    distanceAu: now.r,
    speedDegPerDay: speed,
    // The nodes are always retrograde by definition; everything else is measured.
    retrograde: key === "rahu" || key === "ketu" ? true : speed < 0,
  };
}

/** Draw/compute order — classical geocentric ordering, innermost shell first. */
export const GEO_BODY_ORDER: GrahaKey[] = [
  "moon",
  "mercury",
  "venus",
  "sun",
  "mars",
  "jupiter",
  "saturn",
  "rahu",
  "ketu",
];

/**
 * Offsets that pin the model onto the API's sidereal longitudes for `date`.
 * Bodies the API did not return are left uncorrected rather than forced to 0°.
 */
export function calibrate(
  date: Date,
  apiLongitudes: Partial<Record<string, { longitude?: number } | undefined>>,
): SkyCalibration {
  const raw = geocentricSky(date, {});
  const out: SkyCalibration = {};
  for (const key of GEO_BODY_ORDER) {
    const api = apiLongitudes[key]?.longitude;
    if (api == null) continue;
    out[key] = deltaLongitude(raw[key].longitude, normalizeDeg(api));
  }
  return out;
}

/**
 * Mean geocentric distance per graha, AU — the reference point the display
 * radius and apparent size are modulated around.
 */
export const MEAN_DISTANCE_AU: Record<GrahaKey, number> = {
  moon: 0.00257,
  mercury: 1.04,
  venus: 1.14,
  sun: 1.0,
  mars: 1.7,
  jupiter: 5.2,
  saturn: 9.5,
  rahu: 0.00257,
  ketu: 0.00257,
};

/**
 * Shell radius per graha, in scene units.
 *
 * True geocentric distances span four orders of magnitude (Moon 0.0026 AU vs
 * Saturn 9.5 AU), so shells are laid out in the classical order by period and
 * then *modulated* by the real distance ratio. A planet approaching opposition
 * visibly drops toward Earth without ever crossing into the next shell.
 */
export const SHELL_BASE: Record<GrahaKey, number> = {
  moon: 2.6,
  mercury: 3.4,
  venus: 4.2,
  sun: 5.0,
  mars: 5.9,
  jupiter: 6.8,
  saturn: 7.7,
  rahu: 2.6,
  ketu: 2.6,
};

/** Body radii in scene units at mean distance — schematic, tuned for legibility. */
export const BODY_RADIUS: Record<GrahaKey, number> = {
  sun: 0.34,
  moon: 0.24,
  mercury: 0.11,
  venus: 0.16,
  mars: 0.13,
  jupiter: 0.28,
  saturn: 0.25,
  rahu: 0.1,
  ketu: 0.1,
};

/** Scene-unit shell radius for a graha at a given true distance. */
export function shellRadius(key: GrahaKey, distanceAu: number): number {
  const ratio = distanceAu / MEAN_DISTANCE_AU[key];
  return SHELL_BASE[key] * Math.pow(ratio, 0.22);
}

/** Scene-unit body radius, grown as the graha nears Earth (the opposition effect). */
export function bodyRadius(key: GrahaKey, distanceAu: number): number {
  const ratio = MEAN_DISTANCE_AU[key] / distanceAu;
  return BODY_RADIUS[key] * Math.pow(ratio, 0.28);
}
