/**
 * Whether a solar or lunar eclipse is under way at this instant, from where the Sun and
 * Moon actually are — their separation on the sky against their apparent sizes and the
 * Moon's parallax — rather than from "near a node and near new/full moon", which held
 * for about a day either side of every eclipse instead of its few hours.
 *
 * Solar: the Moon's shadow touches the Earth somewhere while the centres are closer than
 * the sum of the two semi-diameters plus the Moon's horizontal parallax (less the Sun's).
 * That is the global eclipse, first to last contact, ~5 h at most.
 *
 * Lunar: the Moon touches the Earth's penumbra or umbra, whose radii at the Moon's
 * distance are (Danjon) 1.02 × (π☾ + π☉ ± s☉). Penumbral-only phases count, but weakly,
 * since they are barely visible.
 */

const DEG = Math.PI / 180;
const AU_KM = 149_597_870.7;
const MOON_RADIUS_KM = 1737.4;
const SUN_RADIUS_KM = 695_700;
const EARTH_RADIUS_KM = 6378.14;

type Body = { longitude: number; latitude: number; distanceAu: number };

export type EclipseNow = { kind: "solar" | "lunar"; mag: number } | { kind: null; mag: 0 };

/** Great-circle separation of two ecliptic positions, degrees. */
function separationDeg(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const a1 = lon1 * DEG;
  const a2 = lon2 * DEG;
  const b1 = lat1 * DEG;
  const b2 = lat2 * DEG;
  const c = Math.sin(b1) * Math.sin(b2) + Math.cos(b1) * Math.cos(b2) * Math.cos(a1 - a2);
  return Math.acos(Math.min(1, Math.max(-1, c))) / DEG;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function eclipseNow(sun: Body, moon: Body): EclipseNow {
  const moonKm = moon.distanceAu * AU_KM;
  const sunKm = sun.distanceAu * AU_KM;
  if (!(moonKm > 0) || !(sunKm > 0)) return { kind: null, mag: 0 };

  const sMoon = Math.asin(MOON_RADIUS_KM / moonKm) / DEG;
  const sSun = Math.asin(SUN_RADIUS_KM / sunKm) / DEG;
  const piMoon = Math.asin(EARTH_RADIUS_KM / moonKm) / DEG;
  const piSun = Math.asin(EARTH_RADIUS_KM / sunKm) / DEG;

  /* Solar. `central` is the separation inside which the shadow axis meets the Earth. */
  const sepSun = separationDeg(sun.longitude, sun.latitude, moon.longitude, moon.latitude);
  const solarLimit = piMoon - piSun + sMoon + sSun;
  if (sepSun < solarLimit) {
    const central = piMoon - piSun;
    const mag = sepSun <= central ? 0.75 + 0.25 * (1 - sepSun / central) : 0.75 * ((solarLimit - sepSun) / (solarLimit - central));
    return { kind: "solar", mag: clamp01(mag) };
  }

  /* Lunar: the shadow's centre is the point opposite the Sun. */
  const sepShadow = separationDeg(sun.longitude + 180, -sun.latitude, moon.longitude, moon.latitude);
  const umbra = 1.02 * (piMoon + piSun - sSun);
  const penumbra = 1.02 * (piMoon + piSun + sSun);
  if (sepShadow < umbra + sMoon) {
    /* Umbral magnitude: how far across the Moon's disc the umbra reaches (≥ 1 is total). */
    const umbral = (umbra + sMoon - sepShadow) / (2 * sMoon);
    return { kind: "lunar", mag: clamp01(0.35 + 0.65 * Math.min(1, umbral)) };
  }
  if (sepShadow < penumbra + sMoon) {
    const penumbral = (penumbra + sMoon - sepShadow) / (2 * sMoon);
    return { kind: "lunar", mag: clamp01(0.35 * Math.min(1, penumbral)) };
  }
  return { kind: null, mag: 0 };
}
