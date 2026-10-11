/** Shared by apps/web/src/components/kundali/BhavaBalaChart.tsx and apps/mobile/components/kundali/BhavaBalaChart.tsx (moved here from both, unchanged). */
import { type Point, polygonCentroid } from "./north-indian-layout";

export const CHART_CENTER: Point = [150, 150];

export type StrengthBand = "strong" | "average" | "weak";

export function strengthBand(percent: number): StrengthBand {
  if (percent >= 100) return "strong";
  if (percent >= 80) return "average";
  return "weak";
}

export function farthestFromCenter(points: Point[], center: Point): Point {
  return points.reduce((best, point) => {
    const dist = (point[0] - center[0]) ** 2 + (point[1] - center[1]) ** 2;
    const bestDist = (best[0] - center[0]) ** 2 + (best[1] - center[1]) ** 2;
    return dist > bestDist ? point : best;
  });
}

export function houseNumberPos(points: Point[]): Point {
  const [cx, cy] = polygonCentroid(points);
  const [ox, oy] = farthestFromCenter(points, CHART_CENTER);
  return [cx + (ox - cx) * 0.58, cy + (oy - cy) * 0.58];
}

export function rashiFromMadhya(madhyaLongitude: number): number {
  const lon = ((madhyaLongitude % 360) + 360) % 360;
  return Math.floor(lon / 30) + 1;
}

export function clampPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function fmtNum(
  value: number | undefined,
  digits: (v: string | number) => string,
  places = 2,
): string {
  if (value == null) return "—";
  const abs = Math.abs(value).toFixed(places);
  const signed = value < 0 ? `−${abs}` : abs;
  return digits(signed);
}
