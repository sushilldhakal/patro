/** Shared by apps/web/src/components/learn/DaySimScene.tsx and apps/mobile/components/learn/playground/DaySimScene.tsx (moved here from both, unchanged). */
import * as THREE from "three";
import { orbitDistance } from "../astronomy/sky3d/day-mechanics";

export const PI2 = Math.PI * 2;

/**
 * The Moon's orbital plane against the ecliptic.
 *
 * The real inclination is ~5.14°. At this scene's compressed orbit that lift
 * is only a fraction of the planet's radius, so the Moon no longer clears the
 * disc at every syzygy the way a 60-radii orbit would. The honest angle is
 * still the right one to draw: Rāhu and Ketu *are* those two crossings, and
 * exaggerating the tilt made the orbit a different object from the one they
 * live on.
 */
export const MOON_INCLINATION = 5.14 * (Math.PI / 180);

export const MOON_INCL_Q = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  MOON_INCLINATION,
);

export const AXIS_Y = new THREE.Vector3(0, 1, 0);

/** Ellipse in the XZ plane, as a closed line. Equal radii give a circle. */
export function ellipseGeometry(semiMajor: number, semiMinor: number, segments = 128) {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * PI2;
    pts.push(semiMajor * Math.cos(a), 0, -semiMinor * Math.sin(a));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/**
 * The orbit ellipse drawn about its **focus**, not its centre.
 *
 * Centring it on the Sun is what made raising the eccentricity look like it did
 * nothing: the semi-minor axis is `a√(1−e²)`, so even e = 0.4 flattens the
 * outline by only 8% and e = 0.17 by 1.5% — an eccentric orbit really is very
 * nearly circular. What eccentricity actually *shows* is the Sun sitting
 * off-centre, by `a·e`, which a centre-drawn ellipse hides completely.
 *
 * Building it from the polar form puts the focus at the origin by construction,
 * with θ = 0 at perihelion, matching the frame the caller already rotates.
 */
export function focalEllipseGeometry(semiMajor: number, e: number, segments = 128) {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * PI2;
    const r = orbitDistance(semiMajor, e, theta);
    pts.push(r * Math.cos(theta), 0, -r * Math.sin(theta));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

export function makeLine(geometry: THREE.BufferGeometry, color: number, opacity: number) {
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    }),
  );
}

/**
 * Tip the Moon's plane around a travelling node line.
 *
 * `rotY(Ω) · rotX(i) · rotY(-Ω)` leaves longitudes in the parent frame alone
 * and only tilts around the diameter at Ω — so the Moon keeps the longitude it
 * already had, while the two crossings (Rāhu at Ω, Ketu at Ω+180°) stay on the
 * ecliptic and drift with Ω.
 */
export function composeMoonPlane(
  out: THREE.Quaternion,
  solar: THREE.Quaternion,
  omegaRad: number,
  qNode: THREE.Quaternion,
  qNodeInv: THREE.Quaternion,
) {
  qNode.setFromAxisAngle(AXIS_Y, omegaRad);
  qNodeInv.copy(qNode).invert();
  return out.copy(solar).multiply(qNode).multiply(MOON_INCL_Q).multiply(qNodeInv);
}
