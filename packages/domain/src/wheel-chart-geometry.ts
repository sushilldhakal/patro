/** Shared by apps/web/src/components/panchanga/WheelChart.tsx and apps/mobile/components/panchanga/WheelChart.tsx (moved here from both, unchanged). */
import { GRAHA_META } from "./wheel-data";

export const DEG = Math.PI / 180;

export const CX = 500;

export const CY = 500;

/** Scale factor applied to all planet orbit radii to leave room for the inner yoga/karana/tithi rings. */
export const ORBIT_SCALE = 0.58;

export function planetVisualRadius(index: number): number {
  const meta = GRAHA_META[index];
  if (!meta) return 8;
  if ("big" in meta && meta.big) return 15;
  if (index === 1) return 10;
  return 8;
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
