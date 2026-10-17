/** Shared by the web and mobile panchanga wheel charts. */
export const DEG = Math.PI / 180;

export const CX = 500;

export const CY = 500;

/**
 * Scale factor applied to all planet orbit radii. 20% above the previous 0.58
 * so each ring has more room and the discs sit on their own circles.
 */
export const ORBIT_SCALE = 0.696;

/**
 * Disc radius in wheel units, sun → ketu.
 * Rahu and Ketu are smaller than the Moon. Saturn, the outermost orbit, is at
 * 204 × ORBIT_SCALE ≈ 142; its ring (1.42× the disc) stays inside the yoga
 * ring. Moon, Rahu and Ketu share the inner orbit and stay clear of Earth.
 */
const PLANET_VISUAL_RADIUS = [26, 11, 17, 15, 20, 16, 13, 8, 8] as const;

export function planetVisualRadius(index: number): number {
  return PLANET_VISUAL_RADIUS[index] ?? 15;
}

/** Disc radius inside each 48×48 graha artwork file. */
const GRAHA_ART_BODY = [14.4, 17.28, 17.28, 17.28, 17.28, 17.28, 14.4, 16.8, 16.8];

/** Edge length of the graha artwork so its disc matches `radius` in wheel units. */
export function planetIconSize(index: number, radius: number): number {
  const body = GRAHA_ART_BODY[index] ?? 17.28;
  return (radius * 48) / body;
}

export function planetHitRadius(index: number): number {
  const r = planetVisualRadius(index);
  if (index === 0) return r + 26;
  if (index >= 6) return r + 32;
  return r + 24;
}

export function planetSvgPosition(lon: number, orbit: number, spinDeg: number): [number, number] {
  const a = (lon + spinDeg) * DEG;
  return [CX - orbit * ORBIT_SCALE * Math.sin(a), CY - orbit * ORBIT_SCALE * Math.cos(a)];
}
