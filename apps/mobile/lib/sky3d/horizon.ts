/**
 * Local horizon frame — the sky as it actually stands over one place at one moment.
 *
 * The ecliptic (and with it the rashi belt) is only "flat" when you look at the
 * solar system from outside. From a spot on the Earth's surface it is a great
 * circle tipped by the observer's latitude and swung round by the hour, which is
 * why the lagna keeps changing while the grahas barely move. Everything here
 * exists to compute that tip.
 */

import { normalizeDeg } from "@/lib/sky3d/geocentric-model";
import { julianDay } from "@/lib/sky3d/orbital-model";

const RAD = Math.PI / 180;

/** ε at J2000: 23°26′21.448″. */
const EPS_J2000 = 23 + 26 / 60 + 21.448 / 3600;

/**
 * Laskar's obliquity polynomial (Meeus, *Astronomical Algorithms* 22.3), in
 * arcseconds off {@link EPS_J2000}, for `U` = ten thousand Julian years since
 * J2000. Quoted good to about 0.01″ over ±1000 years and a few arcseconds over
 * the whole |U| ≤ 1 range it is fitted on.
 */
const LASKAR = [
  -4680.93, -1.55, 1999.25, -51.38, -249.67, -39.05, 7.12, 27.87, 5.79, 2.45,
] as const;

function laskarDeg(u: number): number {
  let arcsec = 0;
  let power = 1;
  for (const coefficient of LASKAR) {
    power *= u;
    arcsec += coefficient * power;
  }
  return EPS_J2000 + arcsec / 3600;
}

/** dε/dU, deg per unit of `U` — the slope the continuation below is matched to. */
function laskarSlopeDeg(u: number): number {
  let arcsec = 0;
  let power = 1;
  for (let i = 0; i < LASKAR.length; i += 1) {
    arcsec += (i + 1) * LASKAR[i] * power;
    power *= u;
  }
  return arcsec / 3600;
}

/**
 * The tilt's own long cycle: it swings between roughly 22.0° and 24.5° once in
 * about 41,040 years, so this is the midpoint and the period the continuation
 * below carries the curve on with.
 */
const OBLIQUITY_MID = 23.25;
const OBLIQUITY_PERIOD_U = 41040 / 10000;

/**
 * Obliquity of the ecliptic, deg — the tilt between the ecliptic and the
 * equator, the ~23.44° that gives us the ayana and the seasons.
 *
 * Not a constant: the tilt nods between about 22.0° and 24.5° over some 41,000
 * years, and this sky runs to both ends of the बिक्रम axis — पू.वि.सं. 13201 at
 * one end, वि.सं. 17247 at the other — so the value has to travel with it.
 *
 * Laskar's polynomial holds inside ±10,000 Julian years of J2000 and diverges
 * violently outside it (it is a fit, not a physical model — one more millennium
 * and it reads 28°, which is not a tilt the Earth has ever had). Past that end
 * the curve is continued as the cosine the polynomial is approximating,
 * matched to Laskar's own value *and* slope at the boundary, so it leaves the
 * fitted range smoothly and stays inside the band the real thing occupies.
 */
export function obliquity(dtDays: number): number {
  const u = dtDays / 3652500;
  if (Math.abs(u) <= 1) return laskarDeg(u);

  const edge = Math.sign(u);
  const value = laskarDeg(edge);
  const slope = laskarSlopeDeg(edge);
  const k = (2 * Math.PI) / OBLIQUITY_PERIOD_U;
  /* ε = mid + A·cos(θ) with ε′ = −A·k·sin(θ): the pair below is the amplitude
     and phase that reproduce both at the boundary. */
  const amplitude = Math.hypot(value - OBLIQUITY_MID, slope / k);
  const phase = Math.atan2(-slope / k, value - OBLIQUITY_MID);
  return OBLIQUITY_MID + amplitude * Math.cos(phase + k * (u - edge));
}

/** Greenwich mean sidereal time, deg. */
export function gmstDeg(date: Date): number {
  const jd = julianDay(date);
  const d = jd - 2451545.0;
  const T = d / 36525;
  return normalizeDeg(
    280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000,
  );
}

/** Local mean sidereal time, deg, for an east-positive longitude. */
export function lstDeg(date: Date, lonEast: number): number {
  return normalizeDeg(gmstDeg(date) + lonEast);
}

export type Equatorial = { ra: number; dec: number };

/** Tropical ecliptic (λ, β) → equatorial (α, δ), all deg. */
export function eclipticToEquatorial(lonDeg: number, latDeg: number, eps: number): Equatorial {
  const l = lonDeg * RAD;
  const b = latDeg * RAD;
  const e = eps * RAD;
  const sinDec = Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l);
  const dec = Math.asin(sinDec);
  const ra = Math.atan2(
    Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e),
    Math.cos(l),
  );
  return { ra: normalizeDeg(ra / RAD), dec: dec / RAD };
}

/** Equatorial (α, δ) → tropical ecliptic (λ, β), the inverse of the above. */
export function equatorialToecliptic(eq: Equatorial, eps: number) {
  const a = eq.ra * RAD;
  const d = eq.dec * RAD;
  const e = eps * RAD;
  const lat = Math.asin(Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(e) * Math.sin(a));
  const lon = Math.atan2(
    Math.sin(a) * Math.cos(e) + Math.tan(d) * Math.sin(e),
    Math.cos(a),
  );
  return { lon: normalizeDeg(lon / RAD), lat: lat / RAD };
}

export type AltAz = {
  /** Altitude above the horizon, deg. Negative means below it. */
  alt: number;
  /** Azimuth from north, increasing eastward, deg. */
  az: number;
};

/** Equatorial (α, δ) → local horizon (alt, az) for latitude `lat` at sidereal time `lst`. */
export function equatorialToAltAz(eq: Equatorial, lstDegrees: number, latDeg: number): AltAz {
  const H = (lstDegrees - eq.ra) * RAD;
  const dec = eq.dec * RAD;
  const lat = latDeg * RAD;

  const alt = Math.asin(
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H),
  );
  // atan2 form measured from south, then turned to a north-based bearing.
  const az = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat),
  );
  return { alt: alt / RAD, az: normalizeDeg(az / RAD + 180) };
}

/** Tropical ecliptic straight to the local horizon — the composition used per frame. */
export function eclipticToAltAz(
  lonDeg: number,
  latDeg: number,
  eps: number,
  lstDegrees: number,
  observerLat: number,
): AltAz {
  return equatorialToAltAz(eclipticToEquatorial(lonDeg, latDeg, eps), lstDegrees, observerLat);
}

/**
 * Horizon direction → scene vector on a dome of `radius`.
 * Scene frame: +Y is the zenith, +X is east, −Z is north.
 */
export function altAzToVec3(alt: number, az: number, radius: number): [number, number, number] {
  const a = alt * RAD;
  const z = az * RAD;
  const cosAlt = Math.cos(a);
  return [radius * cosAlt * Math.sin(z), radius * Math.sin(a), -radius * cosAlt * Math.cos(z)];
}

export type Observer = { lat: number; lon: number };

/** Kathmandu — the app's reference place, and the fallback when a city carries no coordinates. */
export const KATHMANDU: Observer = { lat: 27.7172, lon: 85.324 };
