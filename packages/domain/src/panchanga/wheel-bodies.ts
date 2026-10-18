/**
 * Planet discs on the panchanga wheel, matched to the आकाश गोचर scene.
 *
 * Each graha is the north-polar face of its map (looking down the pole), not
 * the equatorial strip. Earth is that same view of the cartoon globe, spun by
 * Greenwich sidereal time. The red line is the observer's meridian through the
 * pole. The Moon's shadow is the geocentric phase. A retrograde graha wears a
 * 3px border flush with the disc.
 */

import { gmstDeg } from "../astronomy/sky3d/horizon";
import { zonedWallTimeToInstant } from "../calendar/zoned-time";
import {
  isFullMoonElongation,
  isNewMoonElongation,
  moonPhaseLitPath,
} from "../astronomy/moon-phase-svg";

/** `#dd2222` — `makePrimeMeridian` in the sky scene. */
export const WHEEL_MERIDIAN = "#dd2222";
/** `illustration.red60` — the vakri collar in the sky scene. */
export const WHEEL_RETRO = "#ef4444";

export interface WheelPlace {
  lat: number;
  lon: number;
  at: Date;
}

/** Wall clock on a panchanga day, in that place's timezone. */
export function wheelPlaceFromClock(
  location: { lat?: number; lon?: number } | null | undefined,
  dateAd: string | null | undefined,
  clock: string,
  timeZone: string,
): WheelPlace | null {
  if (location?.lat == null || location.lon == null || !dateAd) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateAd);
  if (!match) return null;
  const [hh = 0, mm = 0, ss = 0] = clock.split(":").map((part) => Number(part) || 0);
  return {
    lat: location.lat,
    lon: location.lon,
    at: zonedWallTimeToInstant(Number(match[1]), Number(match[2]), Number(match[3]), hh, mm, timeZone, ss),
  };
}

const RAD = Math.PI / 180;

export interface EarthTop {
  /** SVG rotation, degrees clockwise. Cancels GMST so the map turns with the sky. */
  spin: number;
  /** Unit meridian through the pole. Longitude 0 points up before `spin`. */
  dx: number;
  dy: number;
  /** Observer, in disc radii. Origin at the centre, +y down, before `spin`. */
  place: { x: number; y: number };
}

/**
 * North-polar Earth. The polar image has longitude 0 at the top and east
 * running counter-clockwise, which is the view down the north pole. The
 * meridian is the diameter along the observer's longitude; their dot sits at
 * `cos(latitude)` out from the pole (the orthographic limb is the equator).
 */
export function earthTop(lat: number, lonEast: number, at: Date): EarthTop {
  const lon = ((lonEast % 360) + 360) % 360;
  const theta = lon * RAD;
  const dx = Math.sin(theta);
  const dy = -Math.cos(theta);
  const rho = Math.cos(lat * RAD);
  return {
    spin: -gmstDeg(at),
    dx,
    dy,
    place: { x: dx * rho, y: dy * rho },
  };
}

/** Screen pixels the retrograde stroke should occupy. */
export const RETRO_BORDER_PX = 3;

/**
 * A border of {@link RETRO_BORDER_PX} screen pixels whose inner edge sits on
 * the icon. `screenPxPerUnit` is how many screen pixels one SVG unit covers
 * after the wheel's zoom.
 */
export function retroBorder(iconRadius: number, screenPxPerUnit: number): { r: number; width: number } {
  const width = screenPxPerUnit > 0 ? RETRO_BORDER_PX / screenPxPerUnit : 1.2;
  return { r: iconRadius + width / 2, width };
}

/**
 * Unlit overlay for the Moon, in local coordinates (sun toward −x).
 * `evenodd` with the lit crescent punches the day side out of a black disc.
 * Null at पूर्णिमा, when the whole face is lit.
 */
export function wheelMoonShadow(elongationDeg: number, radius: number): string | null {
  if (isFullMoonElongation(elongationDeg)) return null;
  const disc = `M${-radius},0 A${radius},${radius} 0 1 1 ${radius},0 A${radius},${radius} 0 1 1 ${-radius},0 Z`;
  if (isNewMoonElongation(elongationDeg)) return disc;
  return `${disc} ${moonPhaseLitPath(elongationDeg, radius)}`;
}
