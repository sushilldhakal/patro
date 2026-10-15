import type * as THREE from "three";

/** Mid-radius of the rashi belt. Both ecliptic wheels and the day scene use it. */
export const BELT_MID = 23;

/** Mid-radius of the nakshatra belt. */
export const NAK_MID = 29;

/**
 * The ecliptic disc's own blue. The spokes stay a lighter blue so they
 * still read once the disc is filled with this colour.
 */
export const ECLIPTIC_GRID_COLOR = 0x2761a1;

/**
 * Ecliptic longitude → a point in the equatorial / belt plane.
 * Writes into `out` so a scene can reuse one vector every frame.
 */
export function atLonInto(out: THREE.Vector3, lonDeg: number, radius: number) {
  const a = lonDeg * (Math.PI / 180);
  return out.set(radius * Math.cos(a), 0, -radius * Math.sin(a));
}
