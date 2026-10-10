/**
 * The pieces every learn diagram is built from — starfield, bodies, orbits,
 * arcs, rays and shadow cones.
 *
 * Everything here is geometry, no simulation: each part takes the numbers a
 * scene has already worked out. Lines are tubes rather than `THREE.Line`,
 * because a one-pixel line all but disappears on a phone screen.
 */

import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import { DIAGRAM_COLOR, RASHI_RING_COLORS } from "@/lib/learn/diagram-theme";
import { RAD } from "@/lib/learn/sun-earth-moon-math";

type Vec3 = readonly [number, number, number];

/* ── background ───────────────────────────────────────────────────────── */

/** A dome of stars, so a drag reads as motion even when nothing else moves. */
export function Starfield({ count = 260, radius = 26 }: { count?: number; radius?: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    /* Deterministic: a diagram that reshuffles its stars on every remount looks
       like a glitch when you open fullscreen. */
    let seed = 20240914;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = radius * (0.85 + rand() * 0.15);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [count, radius]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color={DIAGRAM_COLOR.star}
        size={1.6}
        sizeAttenuation={false}
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}

/* ── bodies ───────────────────────────────────────────────────────────── */

/** Radius multiplier and opacity for each shell of the Sun's corona. */
const GLOW_SHELLS: [number, number][] = [
  [1.08, 0.22],
  [1.2, 0.14],
  [1.36, 0.08],
  [1.58, 0.04],
];

/** The Sun: a lit sphere inside two soft shells that stand in for the corona. */
export function SunBody({
  radius,
  map,
  glow = true,
}: {
  radius: number;
  map?: THREE.Texture;
  glow?: boolean;
}) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial map={map} color={map ? "#ffffff" : DIAGRAM_COLOR.sunCore} />
      </mesh>
      {/* Additive, or the shells darken the sky they sit on instead of
          lighting it — a corona has to add light, never subtract it. Four
          nested shells stand in for a falloff no flat material can give. */}
      {glow
        ? GLOW_SHELLS.map(([scale, opacity]) => (
            <mesh key={scale}>
              <sphereGeometry args={[radius * scale, 24, 24]} />
              <meshBasicMaterial
                color={scale > 1.3 ? DIAGRAM_COLOR.sunGlow : DIAGRAM_COLOR.sun}
                transparent
                opacity={opacity}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))
        : null}
    </group>
  );
}

/**
 * Earth or Moon. Lit by the scene's point light, so the terminator on the globe
 * is the real one — which is exactly what a phase diagram is trying to show.
 */
export const Globe = forwardRef<
  THREE.Group,
  {
    radius: number;
    map?: THREE.Texture;
    color?: string;
    /** Degrees of axial tilt, drawn with a pole axis when `axis` is set. */
    tiltDeg?: number;
    axis?: boolean;
    equator?: boolean;
    children?: React.ReactNode;
  }
>(function Globe({ radius, map, color = "#ffffff", tiltDeg = 0, axis, equator, children }, ref) {
  return (
    <group ref={ref}>
      <group rotation={[0, 0, -tiltDeg * RAD]}>
        <mesh>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            map={map}
            color={map ? "#ffffff" : color}
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        {axis ? (
          <mesh>
            <cylinderGeometry args={[radius * 0.028, radius * 0.028, radius * 2.9, 8]} />
            <meshBasicMaterial color={DIAGRAM_COLOR.axis} transparent opacity={0.85} />
          </mesh>
        ) : null}
        {equator ? (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 1.01, radius * 0.022, 8, 48]} />
            <meshBasicMaterial color={DIAGRAM_COLOR.equator} transparent opacity={0.8} />
          </mesh>
        ) : null}
      </group>
      {children}
    </group>
  );
});

/* ── paths and rays ───────────────────────────────────────────────────── */

function tubeFrom(points: THREE.Vector3[], radius: number, closed: boolean) {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  return new THREE.TubeGeometry(curve, Math.max(points.length * 2, 64), radius, 6, closed);
}

/** An orbit drawn as a thin tube through points the scene has computed. */
export function OrbitPath({
  points,
  color = DIAGRAM_COLOR.orbit,
  radius = 0.006,
  opacity = 0.55,
  closed = true,
}: {
  points: Vec3[];
  color?: string;
  radius?: number;
  opacity?: number;
  closed?: boolean;
}) {
  const geometry = useMemo(
    () => tubeFrom(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), radius, closed),
    [points, radius, closed],
  );
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** Points of an ellipse with one focus at the origin — a Kepler orbit. */
export function ellipsePoints(a: number, e: number, steps = 96, y = 0): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < steps; i++) {
    const nu = (i / steps) * Math.PI * 2;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    out.push([r * Math.cos(nu), y, r * Math.sin(nu)]);
  }
  return out;
}

/** A straight run between two points — sight lines, radii, shadow axes. */
export function Ray({
  from,
  to,
  color = DIAGRAM_COLOR.ray,
  radius = 0.006,
  opacity = 0.7,
}: {
  from: Vec3;
  to: Vec3;
  color?: string;
  radius?: number;
  opacity?: number;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(from[0], from[1], from[2]);
    const b = new THREE.Vector3(to[0], to[1], to[2]);
    const dir = b.clone().sub(a);
    const len = dir.length() || 1e-6;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 6]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/**
 * Point a unit-height cylinder (or cone) mesh from one place to another, in
 * place — the per-frame version of {@link Ray}, for anything that moves.
 */
const rayFrom = new THREE.Vector3();
const rayTo = new THREE.Vector3();
const rayDir = new THREE.Vector3();
const rayUp = new THREE.Vector3(0, 1, 0);

export function orientRay(
  mesh: THREE.Mesh | THREE.Object3D | null | undefined,
  from: Vec3,
  to: Vec3,
  thicknessScale = 1,
): void {
  if (!mesh) return;
  rayFrom.set(from[0], from[1], from[2]);
  rayTo.set(to[0], to[1], to[2]);
  rayDir.subVectors(rayTo, rayFrom);
  const length = rayDir.length();
  if (length < 1e-6) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  mesh.position.copy(rayFrom).addScaledVector(rayDir, 0.5);
  mesh.quaternion.setFromUnitVectors(rayUp, rayDir.clone().normalize());
  mesh.scale.set(thicknessScale, length, thicknessScale);
}

/**
 * Re-sweep an arc mesh to a new angle.
 *
 * `TorusGeometry` lays its indices out ring by ring, not segment by segment, so
 * trimming the draw range thins the tube instead of shortening the arc — the
 * geometry genuinely has to be rebuilt. Rounding to whole degrees keeps that to
 * a dozen rebuilds a second even at full playback speed.
 */
export function setArcSweep(
  mesh: THREE.Mesh | null | undefined,
  radius: number,
  thickness: number,
  angleRad: number,
  state: { deg: number },
): void {
  if (!mesh) return;
  const deg = Math.max(1, Math.round(angleRad / RAD));
  if (deg === state.deg) return;
  state.deg = deg;
  const previous = mesh.geometry;
  mesh.geometry = new THREE.TorusGeometry(
    radius,
    thickness,
    8,
    Math.max(2, Math.ceil(deg / 2)),
    deg * RAD,
  );
  previous.dispose();
}

/** An angle arc in the ecliptic plane, swept from `fromDeg` by `spanDeg`. */
export function AngleArc({
  radius,
  fromDeg,
  spanDeg,
  color = DIAGRAM_COLOR.arc,
  thickness = 0.012,
  opacity = 0.95,
  y = 0,
}: {
  radius: number;
  fromDeg: number;
  spanDeg: number;
  color?: string;
  thickness?: number;
  opacity?: number;
  y?: number;
}) {
  const span = Math.max(0.02, Math.abs(spanDeg) * RAD);
  /* Longitude grows anticlockwise seen from +Y, which after laying the torus
     into the ecliptic plane means -Z, hence the quarter turn about -X. */
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, fromDeg * RAD]}>
      <torusGeometry args={[radius, thickness, 8, 96, span]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** The ecliptic plane itself — a faint disc that anchors the depth. */
export function EclipticPlane({ radius, opacity = 0.06 }: { radius: number; opacity?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshBasicMaterial
        color={DIAGRAM_COLOR.grid}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * The twelve sidereal signs as a flat ring in the ecliptic plane.
 * `rotationDeg` swings the whole belt, which is how ayanamsha is shown.
 */
export function RashiRing({
  inner,
  outer,
  rotationDeg = 0,
  opacity = 0.5,
  y = 0,
}: {
  inner: number;
  outer: number;
  rotationDeg?: number;
  opacity?: number;
  y?: number;
}) {
  const segments = useMemo(
    () =>
      RASHI_RING_COLORS.map((color, i) => {
        const start = (i / 12) * Math.PI * 2;
        const end = ((i + 1) / 12) * Math.PI * 2;
        const shape = new THREE.Shape();
        shape.moveTo(inner * Math.cos(start), inner * Math.sin(start));
        shape.lineTo(outer * Math.cos(start), outer * Math.sin(start));
        shape.absarc(0, 0, outer, start, end, false);
        shape.lineTo(inner * Math.cos(end), inner * Math.sin(end));
        shape.absarc(0, 0, inner, end, start, true);
        return { geometry: new THREE.ShapeGeometry(shape, 16), color };
      }),
    [inner, outer],
  );

  return (
    <group position={[0, y, 0]} rotation={[-Math.PI / 2, 0, -rotationDeg * RAD]}>
      {segments.map(({ geometry, color }, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The shadow a body throws away from the Sun — the cone that has to land on
 * something for an eclipse to happen.
 */
export function ShadowCone({
  apexFrom,
  towards,
  radius,
  length,
  color = DIAGRAM_COLOR.shadow,
  opacity = 0.42,
}: {
  /** Centre of the body casting the shadow. */
  apexFrom: Vec3;
  /** A point on the far side — the shadow runs this way. */
  towards: Vec3;
  radius: number;
  length: number;
  color?: string;
  opacity?: number;
}) {
  const { position, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(apexFrom[0], apexFrom[1], apexFrom[2]);
    const b = new THREE.Vector3(towards[0], towards[1], towards[2]);
    const dir = b.clone().sub(a).normalize();
    /* The cone's own axis is +Y with the tip up, so it is turned to point the
       other way: base at the body, tip out along the shadow. */
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    return { position: a.clone().add(dir.clone().multiplyScalar(length / 2)), quaternion: q };
  }, [apexFrom, towards, length]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <coneGeometry args={[radius, length, 20, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** A small pointer used for equinox marks, nodes and the like. */
export function Marker({
  position,
  color,
  size = 0.05,
  pointDown = false,
}: {
  position: Vec3;
  color: string;
  size?: number;
  pointDown?: boolean;
}) {
  return (
    <mesh position={position} rotation={[pointDown ? Math.PI : 0, 0, 0]}>
      <coneGeometry args={[size, size * 2.4, 10]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}
