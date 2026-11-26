// Moonrise and moonset on the client. The stored data holds the Moon's longitude only, so the two
// things a horizon crossing also needs are made here:
//   - Surya Siddhanta: the text's own latitude, 4.5° · sin(Moon − node), the node being the stored
//     Rahu; the Moon's centre against a horizon of 0° (as the Rust server's `rise_set.rs`).
//   - Drik: Meeus's lunar latitude and distance (a handful of terms; the rise time is good to about
//     ten seconds); the horizon is the Moon's parallax-corrected one, 0.7275·π − 34′ (`drik.rs`).
// A crossing is searched in half-hour steps from the start instant over 1.6 days and bisected, as the
// server does.
import type { PositionSource } from "./siddhanta-offline";

const RAD = Math.PI / 180;
const J2000 = 2451545;
const MOON_MAX_LATITUDE = 4.5;
const SURYA_OBLIQUITY = 24;
const REFRACTION = 0.5667;
const EARTH_RADIUS_KM = 6378.14;
const STEP = 1 / 48;
const WINDOW = 1.6;

const wrap = (d: number) => ((d % 360) + 360) % 360;

/** Meeus ch. 47: the Moon's ecliptic latitude (degrees) and distance (km), main terms. */
function drikLatitudeDistance(jdUt: number): { lat: number; distance: number } {
  const t = (jdUt - J2000) / 36525;
  const d = wrap(297.8501921 + 445267.1114034 * t) * RAD;
  const m = wrap(357.5291092 + 35999.0502909 * t) * RAD;
  const mp = wrap(134.9633964 + 477198.8675055 * t) * RAD;
  const f = wrap(93.272095 + 483202.0175233 * t) * RAD;
  const e = 1 - 0.002516 * t;
  const lat =
    5.128122 * Math.sin(f) +
    0.280602 * Math.sin(mp + f) +
    0.277693 * Math.sin(mp - f) +
    0.173238 * Math.sin(2 * d - f) +
    0.055413 * Math.sin(2 * d + f - mp) +
    0.046272 * Math.sin(2 * d - f - mp) +
    0.032573 * Math.sin(2 * d + f) +
    0.017198 * Math.sin(2 * mp + f) +
    0.009266 * Math.sin(2 * d + mp - f) +
    0.008823 * Math.sin(2 * mp - f) +
    0.008247 * e * Math.sin(2 * d - m - f) +
    0.004324 * Math.sin(2 * d - 2 * mp - f);
  const distance =
    385000.56 -
    20905.355 * Math.cos(mp) -
    3699.111 * Math.cos(2 * d - mp) -
    2955.968 * Math.cos(2 * d) -
    569.925 * Math.cos(2 * mp) +
    48.888 * e * Math.cos(m) -
    3.149 * Math.cos(2 * f) +
    246.158 * Math.cos(2 * d - 2 * mp) -
    152.138 * e * Math.cos(2 * d - m - mp) -
    170.733 * Math.cos(2 * d + mp) -
    204.586 * e * Math.cos(2 * d - m) -
    108.743 * Math.cos(d);
  return { lat, distance };
}

/** Altitude of the Moon's centre above the horizon the system uses, degrees (positive: up). */
function altitude(source: PositionSource, jdUt: number, latitude: number, longitude: number): number | null {
  const p = source.positionsAt(jdUt);
  if (!p) return null;
  const sidereal = p.longitude[1];
  const sayana = sidereal + p.ayanamsha;
  const drik = source.frame !== undefined;
  let eclLat: number;
  let horizon: number;
  let obliquity: number;
  if (drik) {
    const { lat, distance } = drikLatitudeDistance(jdUt);
    eclLat = lat;
    horizon = 0.7275 * Math.asin(EARTH_RADIUS_KM / distance) / RAD - REFRACTION;
    obliquity = source.frame!.obliquityAt(jdUt);
  } else {
    // Rahu is the stored mean node (sidereal): the text's latitude follows the Moon's distance from it.
    eclLat = MOON_MAX_LATITUDE * Math.sin((sidereal - p.longitude[7]) * RAD);
    horizon = 0;
    obliquity = SURYA_OBLIQUITY;
  }
  const lam = sayana * RAD;
  const beta = eclLat * RAD;
  const eps = obliquity * RAD;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps), Math.cos(lam)) / RAD;
  const dec = Math.asin(Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lam));
  const lst = source.frame
    ? source.frame.localSiderealDegrees(jdUt, longitude)
    : wrap(p.meanSunSayana + 360 * ((((jdUt + longitude / 360 + 0.5) % 1) + 1) % 1) - 180);
  const hour = (lst - wrap(ra)) * RAD;
  const phi = latitude * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hour)) / RAD;
  return alt - horizon;
}

/** The first Moon rise and set after `jdStart` (UT), each within 1.6 days, or null. */
export function moonRiseSet(
  source: PositionSource,
  jdStart: number,
  latitude: number,
  longitude: number,
): { rise: number | null; set: number | null } {
  let rise: number | null = null;
  let set: number | null = null;
  let t0 = jdStart;
  let a0 = altitude(source, t0, latitude, longitude);
  for (let i = 0; i < Math.floor(WINDOW / STEP) && (rise === null || set === null); i += 1) {
    const t1 = t0 + STEP;
    const a1 = altitude(source, t1, latitude, longitude);
    if (a0 !== null && a1 !== null) {
      const rising = a0 < 0 && a1 >= 0;
      const setting = a0 >= 0 && a1 < 0;
      if ((rising && rise === null) || (setting && set === null)) {
        let lo = t0;
        let hi = t1;
        // 20 halvings of the 30-minute step pin the crossing to ~1.7 ms; times are shown to the minute.
        for (let k = 0; k < 20; k += 1) {
          const mid = (lo + hi) / 2;
          const up = (altitude(source, mid, latitude, longitude) ?? -1) >= 0;
          if (up === rising) hi = mid;
          else lo = mid;
        }
        const at = (lo + hi) / 2;
        if (rising) rise = at;
        else set = at;
      }
    }
    t0 = t1;
    a0 = a1;
  }
  return { rise, set };
}
