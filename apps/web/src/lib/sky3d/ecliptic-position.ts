/**
 * Ecliptic longitude → a point in the equatorial / belt plane, app convention.
 *
 * Split out of `EclipticWheel.tsx` — that file exports the wheel's two React
 * components (`EclipticWheel`, `GuideGrid`) and Fast Refresh only reloads
 * cleanly when a file exports components alone, so a plain helper needed a
 * home of its own once a second scene ({@link DaySimScene}) started importing
 * it too.
 */

import * as THREE from "three";

export function atLonInto(out: THREE.Vector3, lonDeg: number, radius: number) {
  const a = lonDeg * (Math.PI / 180);
  return out.set(radius * Math.cos(a), 0, -radius * Math.sin(a));
}
