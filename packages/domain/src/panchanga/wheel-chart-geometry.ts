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

/**
 * Graha under a point in wheel units, or null when the point misses every disc.
 * Overlapping discs (Moon, Rahu and Ketu share an orbit) resolve to the closer centre.
 */
export function grahaAtSvgPoint(
  x: number,
  y: number,
  longitudes: readonly number[],
  orbits: readonly number[],
  spinDeg: number,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  const n = Math.min(longitudes.length, orbits.length);
  for (let i = 0; i < n; i++) {
    const lon = longitudes[i];
    const orbit = orbits[i];
    if (lon == null || orbit == null) continue;
    const [px, py] = planetSvgPosition(lon, orbit, spinDeg);
    const d = Math.hypot(x - px, y - py);
    if (d <= planetHitRadius(i) && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/** A tap that landed on a graha and is waiting for the second tap. */
export type GrahaTap = { at: number; index: number };

/**
 * Two taps on the same graha inside `windowMs` select it. One tap never does:
 * a pinch starts with a single finger, and that used to change the selection.
 */
export function nextGrahaDoubleTap(
  previous: GrahaTap | null,
  tap: { at: number; index: number | null },
  windowMs = 400,
): { select: number | null; pending: GrahaTap | null } {
  if (tap.index == null) return { select: null, pending: null };
  const pending: GrahaTap = { at: tap.at, index: tap.index };
  if (previous && previous.index === tap.index && tap.at >= previous.at && tap.at - previous.at <= windowMs) {
    return { select: tap.index, pending: null };
  }
  return { select: null, pending };
}
