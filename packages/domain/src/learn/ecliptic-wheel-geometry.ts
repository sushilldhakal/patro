/** Shared by apps/web/src/components/learn/EclipticWheel.tsx and apps/mobile/components/learn/EclipticWheel.tsx (moved here from both, unchanged). */
import * as THREE from "three";

export const PI2 = Math.PI * 2;

export const MONTH_R = 17.5;

export const BELT_INNER = 20;

export const BELT_OUTER = 26;

export const NAK_INNER = BELT_OUTER;

export const NAK_OUTER = 32;

export const COLOR = {
  solar: 0xdddd00,
  belt: 0x8a7c2e,
  nakshatra: 0x4a6b8a,
  /**
   * The spokes and rings — deliberately *not* {@link ECLIPTIC_GRID_COLOR}.
   *
   * They were the same blue as the disc, which was invisible only because
   * the disc used to be near-black. Filling the disc in that blue put blue
   * lines on a blue plane and the grid disappeared. A pale sky-blue is
   * light enough to read against the filled disc and still reads against
   * Learn's dark one.
   */
  grid: 0xa9d4ff,
  gridPlane: 0x001b3d,
} as const;

/** ecliptic longitude → a point in the equatorial / belt plane, app convention. */
export function atLon(lonDeg: number, radius: number) {
  const a = lonDeg * (Math.PI / 180);
  return new THREE.Vector3(radius * Math.cos(a), 0, -radius * Math.sin(a));
}

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

export function makeLine(geometry: THREE.BufferGeometry, color: number, opacity: number) {
  return new THREE.Line(
    geometry,
    /* Never writes depth — every line here is a diagram mark and two of them
       crossing must both survive. It still *tests*, so a body in front hides
       it. */
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
 * Belt ticks read on top of the star figures in the same plane, but **not**
 * through a body. They keep `depthWrite` off so they never occlude each other,
 * and `depthTest` on so the planet in front of them still hides them — with the
 * test off the whole wheel painted straight over the globe, which is what made
 * a solid Earth look like glass.
 */
export function diagramLine(object: THREE.Object3D) {
  object.frustumCulled = false;
  object.renderOrder = 5;
  object.traverse((o) => {
    o.frustumCulled = false;
    o.renderOrder = 5;
    const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (mat) {
      mat.depthWrite = false;
      mat.depthTest = true;
    }
  });
  return object;
}

export function buildRashiBelt() {
  const pts: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = atLon(i * 30, BELT_INNER);
    const b = atLon(i * 30, BELT_OUTER);
    pts.push(a.x, 0, a.z, b.x, 0, b.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const spokes = new THREE.LineSegments(
    g,
    new THREE.LineBasicMaterial({ color: COLOR.belt, transparent: true, opacity: 0.75 }),
  );
  const group = new THREE.Group();
  group.add(spokes);
  group.add(makeLine(ellipseGeometry(BELT_INNER, BELT_INNER), COLOR.belt, 0.45));
  group.add(makeLine(ellipseGeometry(BELT_OUTER, BELT_OUTER), COLOR.belt, 0.45));
  return diagramLine(group);
}

/**
 * How strongly the spokes and rings are drawn.
 *
 * The two used to sit at 0.5 and 0.4 — the rings the fainter of the pair —
 * chosen when they were the only thing on a near-black plane. Over a filled
 * disc they both need to carry, and the ring/spoke split had no reason to
 * exist beyond how it was first written.
 */
export const GRID_LINE_OPACITY = 0.85;

/** Polar grid around the origin. `innerR` is where the spokes leave the body. */
export function buildGuideGrid(innerR = 4) {
  const group = new THREE.Group();
  const rpts: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = atLon(i * 30, innerR);
    const b = atLon(i * 30, NAK_OUTER);
    rpts.push(a.x, 0, a.z, b.x, 0, b.z);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.Float32BufferAttribute(rpts, 3));
  /**
   * The grid stays in the **transparent** pass, ahead of the disc.
   *
   * It is coplanar with the ecliptic disc it is drawn on, so whichever of the
   * two goes last wins the pixel. Opaque geometry is drawn before transparent,
   * so making these lines opaque hid the entire grid behind the disc's navy
   * fill. Transparent plus `renderOrder` 1 puts them after it again.
   *
   * `depthTest` stays **on** so a body in front still hides them — that is the
   * one thing this pair must not give up, or the grid draws over the globe.
   */
  const spokes = new THREE.LineSegments(
    rg,
    new THREE.LineBasicMaterial({
      color: COLOR.grid,
      transparent: true,
      opacity: GRID_LINE_OPACITY,
      depthTest: true,
      depthWrite: false,
    }),
  );
  spokes.renderOrder = 1;
  spokes.frustumCulled = false;
  group.add(spokes);
  const rings = [innerR, 8, 12, MONTH_R, BELT_INNER, BELT_OUTER, NAK_OUTER];
  const unique = [...new Set(rings)].filter((r) => r >= innerR).sort((a, b) => a - b);
  for (const r of unique) {
    const ring = makeLine(ellipseGeometry(r, r, 96), COLOR.grid, GRID_LINE_OPACITY);
    ring.renderOrder = 1;
    ring.frustumCulled = false;
    group.add(ring);
  }
  return group;
}

export function buildRashiHighlight() {
  const g = new THREE.RingGeometry(BELT_INNER, BELT_OUTER, 24, 1, 0, Math.PI / 6);
  const m = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({
      color: COLOR.solar,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 5;
  return m;
}

/**
 * Nakshatra belt: 27 ticks at 13°20′ from inner to outer edge — those *are*
 * the नक्षत्र boundaries, and they stay up when the polar grid is off.
 */
export function buildNakBelt() {
  const pts: number[] = [];
  for (let i = 0; i < 27; i += 1) {
    const lon = (i * 360) / 27;
    const a = atLon(lon, NAK_INNER);
    const b = atLon(lon, NAK_OUTER);
    pts.push(a.x, 0, a.z, b.x, 0, b.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const ticks = new THREE.LineSegments(
    g,
    new THREE.LineBasicMaterial({ color: COLOR.nakshatra, transparent: true, opacity: 0.7 }),
  );
  /**
   * The twelve राशि boundaries, carried out across the नक्षत्र belt.
   *
   * A rashi is 30° and a nakshatra 13°20′, so a rashi holds exactly **2¼**
   * nakshatras. The outward overshoot keeps them distinct from the 27 ticks.
   */
  const rpts: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = atLon(i * 30, NAK_INNER);
    const b = atLon(i * 30, NAK_OUTER + 1.1);
    rpts.push(a.x, 0, a.z, b.x, 0, b.z);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.Float32BufferAttribute(rpts, 3));
  const rashiMarks = new THREE.LineSegments(
    rg,
    new THREE.LineBasicMaterial({ color: COLOR.belt, transparent: true, opacity: 0.85 }),
  );

  const group = new THREE.Group();
  group.add(ticks);
  group.add(rashiMarks);
  group.add(makeLine(ellipseGeometry(NAK_INNER, NAK_INNER), COLOR.nakshatra, 0.4));
  group.add(makeLine(ellipseGeometry(NAK_OUTER, NAK_OUTER), COLOR.nakshatra, 0.4));
  return diagramLine(group);
}

export function buildNakHighlight() {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(NAK_INNER, NAK_OUTER, 10, 1, 0, PI2 / 27),
    new THREE.MeshBasicMaterial({
      color: COLOR.solar,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 5;
  return m;
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose?.();
  });
}
