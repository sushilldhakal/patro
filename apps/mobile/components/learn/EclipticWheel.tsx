/**
 * The ecliptic wheel from the Learn playground — राशि, नक्षत्र, month circle,
 * polar grid — as one object both scenes mount.
 *
 * Aakash Gochar's space view used to redraw this with its own BeltCircle /
 * BeltDivisions helpers. The 27 नक्षत्र boundaries then vanished the moment
 * the polar grid was off, because that copy never carried Learn's ticks
 * (inner→outer spokes at 13°20′, plus the rashi marks that overshoot the rim).
 * This file *is* that Learn geometry. Both canvases import it.
 */

import { useEffect, useLayoutEffect, useMemo, type Ref } from "react";
import * as THREE from "three";

const PI2 = Math.PI * 2;

export const MONTH_R = 17.5;
export const BELT_INNER = 20;
export const BELT_MID = 23;
export const BELT_OUTER = 26;
export const NAK_INNER = BELT_OUTER;
export const NAK_MID = 29;
export const NAK_OUTER = 32;

/**
 * The grid's own blue, for a scene that wants the ecliptic disc filled in a
 * colour that actually shows rather than the near-black `COLOR.gridPlane`.
 */
export const ECLIPTIC_GRID_COLOR = 0x2761a1;

const COLOR = {
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
function atLon(lonDeg: number, radius: number) {
  const a = lonDeg * (Math.PI / 180);
  return new THREE.Vector3(radius * Math.cos(a), 0, -radius * Math.sin(a));
}

function ellipseGeometry(semiMajor: number, semiMinor: number, segments = 128) {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * PI2;
    pts.push(semiMajor * Math.cos(a), 0, -semiMinor * Math.sin(a));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function makeLine(geometry: THREE.BufferGeometry, color: number, opacity: number) {
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
function diagramLine(object: THREE.Object3D) {
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

function buildRashiBelt() {
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

function buildMonthRing() {
  return diagramLine(makeLine(ellipseGeometry(MONTH_R, MONTH_R), 0xe3d9a8, 0.5));
}

/**
 * How strongly the spokes and rings are drawn.
 *
 * The two used to sit at 0.5 and 0.4 — the rings the fainter of the pair —
 * chosen when they were the only thing on a near-black plane. Over a filled
 * disc they both need to carry, and the ring/spoke split had no reason to
 * exist beyond how it was first written.
 */
const GRID_LINE_OPACITY = 0.85;

/** Polar grid around the origin. `innerR` is where the spokes leave the body. */
function buildGuideGrid(innerR = 4) {
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

function buildRashiHighlight() {
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
function buildNakBelt() {
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

function buildNakHighlight() {
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

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose?.();
  });
}

/**
 * The polar grid and the disc it is drawn on, on their own.
 *
 * Separate from the wheel because they answer to a different centre: the belts
 * are a sky ring and hang on the observer, while the grid is a *plane* and
 * belongs to whichever body the reader is watching — so Learn mounts this one
 * on the focused body while the belts stay where the sightlines need them.
 * `innerR` is where the spokes leave that body, and wants to be its radius:
 * started short of the surface it reads as a hole, started past it as a gap.
 */
export function GuideGrid({
  visible = true,
  innerR = 4,
  planeInnerR = 0,
  planeOuterR = NAK_OUTER,
  planeOpacity = 0.7,
  planeColor = COLOR.gridPlane,
  planeY = -0.05,
}: {
  visible?: boolean;
  innerR?: number;
  planeInnerR?: number;
  /** Outer radius of the filled disc. Defaults to the नक्षत्र rim. */
  planeOuterR?: number;
  planeOpacity?: number;
  /**
   * Fill colour of the ecliptic disc. Defaults to {@link COLOR.gridPlane},
   * which is a near-black navy — it was picked to sit under a dark sky, and
   * against a lit backdrop no amount of opacity can make it read, because
   * the darkness is in the *colour*, not the alpha. A scene that needs the
   * plane to be seen passes a real colour instead; see
   * {@link ECLIPTIC_GRID_COLOR}.
   */
  planeColor?: number;
  planeY?: number;
}) {
  const grid = useMemo(() => buildGuideGrid(innerR), [innerR]);
  useEffect(() => () => disposeObject(grid), [grid]);

  return (
    <group position={[0, planeY, 0]}>
      <primitive object={grid} visible={visible} />
      {/* Disc stays up with the belts even when the polar grid is off, so
          the fill still reaches the नक्षत्र rim. renderOrder 0, not −1 —
          at −1 this shared it with the Milky Way backdrop, which draws
          additively with the depth test off. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0} raycast={() => {}}>
        {planeInnerR > 0 ? (
          <ringGeometry args={[planeInnerR, planeOuterR, 64]} />
        ) : (
          <circleGeometry args={[planeOuterR, 64]} />
        )}
        <meshBasicMaterial
          color={planeColor}
          transparent={planeOpacity < 1}
          opacity={planeOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest
        />
      </mesh>
    </group>
  );
}

export type EclipticWheelToggles = {
  grid: boolean;
  rashiBelt: boolean;
  nakshatraBelt: boolean;
  monthRing: boolean;
  /**
   * Fill of the ecliptic disc. Keep below 1 so the disc stays in the
   * transparent pass and bodies behind it read as under the plane.
   */
  planeOpacity?: number;
  /** Fill colour of that disc — see {@link GuideGrid}'s own `planeColor`. */
  planeColor?: number;
  /** Where the polar spokes leave the origin. Learn uses 4; space uses Earth. */
  gridInnerR?: number;
  /**
   * Inner radius of the filled disc. 0 is a full circle (Learn). Space starts
   * at Earth's surface so the fill grows outward from the equator, not through
   * the planet.
   */
  planeInnerR?: number;
  /** Outer radius of the filled disc. Defaults to the नक्षत्र rim. */
  planeOuterR?: number;
  /** Shift the polar disc/grid along ecliptic Y. Learn sits it just under the belts. */
  planeY?: number;
};

/**
 * Learn's ecliptic wheel. Parent supplies the frame (tilt / mesha zero);
 * this only draws the belts in their own plane.
 */
export function EclipticWheel({
  grid,
  rashiBelt,
  nakshatraBelt,
  monthRing,
  planeOpacity = 0.7,
  planeColor,
  gridInnerR = 4,
  planeInnerR = 0,
  planeOuterR = NAK_OUTER,
  planeY = -0.05,
  rashiHighlightRef,
  nakHighlightRef,
}: EclipticWheelToggles & {
  rashiHighlightRef?: Ref<THREE.Mesh | null>;
  nakHighlightRef?: Ref<THREE.Mesh | null>;
}) {
  const parts = useMemo(
    () => ({
      monthRingLine: buildMonthRing(),
      rashiBelt: buildRashiBelt(),
      rashiHighlight: buildRashiHighlight(),
      nakBelt: buildNakBelt(),
      nakHighlight: buildNakHighlight(),
    }),
    [],
  );

  useLayoutEffect(() => {
    const assign = (ref: Ref<THREE.Mesh | null> | undefined, mesh: THREE.Mesh | null) => {
      if (!ref || typeof ref === "function") return;
      ref.current = mesh;
    };
    assign(rashiHighlightRef, parts.rashiHighlight);
    assign(nakHighlightRef, parts.nakHighlight);
    return () => {
      assign(rashiHighlightRef, null);
      assign(nakHighlightRef, null);
    };
  }, [parts, rashiHighlightRef, nakHighlightRef]);

  useEffect(
    () => () => {
      disposeObject(parts.monthRingLine);
      disposeObject(parts.rashiBelt);
      disposeObject(parts.rashiHighlight);
      disposeObject(parts.nakBelt);
      disposeObject(parts.nakHighlight);
    },
    [parts],
  );

  return (
    <>
      <GuideGrid
        visible={grid}
        innerR={gridInnerR}
        planeInnerR={planeInnerR}
        planeOuterR={planeOuterR}
        planeOpacity={planeOpacity}
        planeColor={planeColor}
        planeY={planeY}
      />
      <primitive object={parts.monthRingLine} visible={monthRing} />
      <primitive object={parts.rashiBelt} visible={rashiBelt} />
      <primitive object={parts.rashiHighlight} visible={rashiBelt} position={[0, -0.01, 0]} />
      <primitive object={parts.nakBelt} visible={nakshatraBelt} />
      <primitive object={parts.nakHighlight} visible={nakshatraBelt} position={[0, -0.01, 0]} />
    </>
  );
}
