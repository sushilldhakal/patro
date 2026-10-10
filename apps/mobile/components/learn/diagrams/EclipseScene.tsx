/**
 * Why eclipses are rare.
 *
 * The Moon's orbit is tilted 5.1° to the ecliptic, so at most new moons its
 * shadow misses Earth entirely and at most full moons it sails over or under
 * Earth's shadow. Only when the line of nodes — where the two planes cross —
 * points at the Sun can the three line up, and the diagram lets you swing that
 * line to see the difference.
 */

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { useLabelProjector } from "@/components/learn/diagrams/diagram-labels";
import { useLearnTextures } from "@/components/learn/diagrams/learn-textures";
import {
  EclipticPlane,
  Globe,
  Marker,
  OrbitPath,
  Ray,
  SunBody,
  ellipsePoints,
  orientRay,
} from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { MOON_ORBIT_TILT, RAD, elongationFromDay } from "@/lib/learn/sun-earth-moon-math";

export const ECLIPSE_SUN_AT: [number, number, number] = [-2.3, 0, 0];
const SUN_R = 0.34;
const EARTH_R = 0.2;
const MOON_R = 0.075;
const MOON_ORBIT_R = 1.0;

export type EclipseSample = {
  day: number;
  elongDeg: number;
  /** Moon's ecliptic latitude, degrees — zero only at the nodes. */
  latDeg: number;
  eclipse: "solar" | "lunar" | "none";
};

type Props = {
  clock: DiagramClockRef;
  /** Where the line of nodes points, degrees from the Sun–Earth line. */
  nodeAngleDeg: number;
  onSample?: (sample: EclipseSample) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: { sun: string; earth: string; moon: string; node: string; umbra: string };
};

/** The Moon's place for a given elongation, lifted onto its tilted orbit. */
function moonAt(elongDeg: number, nodeAngleDeg: number): THREE.Vector3 {
  /* New moon sits between Earth and Sun, and the Sun is out along -X. */
  const phi = (180 + elongDeg) * RAD;
  const flat = new THREE.Vector3(
    MOON_ORBIT_R * Math.cos(phi),
    0,
    -MOON_ORBIT_R * Math.sin(phi),
  );
  return flat.applyAxisAngle(nodeAxis(nodeAngleDeg), MOON_ORBIT_TILT * RAD);
}

function nodeAxis(nodeAngleDeg: number): THREE.Vector3 {
  const n = nodeAngleDeg * RAD;
  return new THREE.Vector3(Math.cos(n), 0, -Math.sin(n));
}

export const EclipseScene = memo(function EclipseScene({
  clock,
  nodeAngleDeg,
  onSample,
  onLabels,
  copy,
}: Props) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock);
  const projector = useLabelProjector(onLabels);

  const moonRef = useRef<THREE.Group>(null);
  const moonShadowRef = useRef<THREE.Mesh>(null);
  const earthShadowRef = useRef<THREE.Mesh>(null);
  const sampled = useRef<EclipseSample | null>(null);
  const frame = useRef(0);

  const eclipticCircle = useMemo(() => ellipsePoints(MOON_ORBIT_R, 0, 72), []);
  const { orbitPoints, nodes } = useMemo(() => {
    const axis = nodeAxis(nodeAngleDeg);
    const points: [number, number, number][] = ellipsePoints(MOON_ORBIT_R, 0, 96).map((p) => {
      const v = new THREE.Vector3(p[0], p[1], p[2]).applyAxisAngle(axis, MOON_ORBIT_TILT * RAD);
      return [v.x, v.y, v.z];
    });
    const ascending = axis.clone().multiplyScalar(MOON_ORBIT_R);
    return {
      orbitPoints: points,
      nodes: [
        [ascending.x, 0, ascending.z] as [number, number, number],
        [-ascending.x, 0, -ascending.z] as [number, number, number],
      ],
    };
  }, [nodeAngleDeg]);

  useFrame((_state, delta) => {
    const day = readClock(delta);
    const elong = elongationFromDay(day);
    const moon = moonAt(elong, nodeAngleDeg);
    const latDeg = Math.asin(moon.y / MOON_ORBIT_R) / RAD;

    moonRef.current?.position.copy(moon);

    /* Both shadows always exist; each points straight away from the Sun. The
       cone geometry is unit height with its tip at +Y, so `orientRay` aims it
       and the Y scale sets how far the shadow is drawn. */
    const sun = new THREE.Vector3(...ECLIPSE_SUN_AT);
    const moonShadowDir = moon.clone().sub(sun).normalize();
    orientRay(
      moonShadowRef.current,
      [moon.x, moon.y, moon.z],
      [
        moon.x + moonShadowDir.x * 1.6,
        moon.y + moonShadowDir.y * 1.6,
        moon.z + moonShadowDir.z * 1.6,
      ],
    );
    const earthShadowDir = new THREE.Vector3(0, 0, 0).sub(sun).normalize();
    orientRay(
      earthShadowRef.current,
      [0, 0, 0],
      [earthShadowDir.x * 2.2, earthShadowDir.y * 2.2, earthShadowDir.z * 2.2],
    );

    /* An eclipse needs the alignment *and* the node: within roughly 15° of new
       or full, and within ~1.4° of the ecliptic. */
    const nearNew = elong < 16 || elong > 344;
    const nearFull = Math.abs(elong - 180) < 16;
    const eclipse: EclipseSample["eclipse"] =
      nearNew && Math.abs(latDeg) < 1.4
        ? "solar"
        : nearFull && Math.abs(latDeg) < 1.1
          ? "lunar"
          : "none";

    frame.current += 1;
    if (onSample && frame.current % 6 === 0) {
      const prev = sampled.current;
      if (
        !prev ||
        prev.eclipse !== eclipse ||
        Math.abs(prev.elongDeg - elong) > 0.4 ||
        Math.abs(prev.latDeg - latDeg) > 0.02
      ) {
        const next: EclipseSample = { day, elongDeg: elong, latDeg, eclipse };
        sampled.current = next;
        onSample(next);
      }
    }

    if (projector.begin()) {
      projector.push(
        { id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun },
        [ECLIPSE_SUN_AT[0], SUN_R + 0.2, 0],
      );
      projector.push(
        { id: "earth", text: copy.earth, color: DIAGRAM_LABEL_COLOR.earth },
        [0, EARTH_R + 0.16, 0],
      );
      projector.push(
        { id: "moon", text: copy.moon, color: DIAGRAM_LABEL_COLOR.moon, size: 9 },
        [moon.x, moon.y + MOON_R + 0.11, moon.z],
      );
      nodes.forEach((node, i) => {
        projector.push(
          { id: `node-${i}`, text: copy.node, color: DIAGRAM_LABEL_COLOR.node, size: 9 },
          [node[0] * 1.12, 0.04, node[2] * 1.12],
        );
      });
      projector.push(
        { id: "umbra", text: copy.umbra, color: DIAGRAM_LABEL_COLOR.dim, size: 9 },
        [earthShadowDir.x * 1.5, -EARTH_R * 0.9, earthShadowDir.z * 1.5],
      );
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.22} />
      <pointLight position={ECLIPSE_SUN_AT} intensity={6} distance={0} decay={0} />

      <group position={ECLIPSE_SUN_AT}>
        <SunBody radius={SUN_R} map={textures.sun} />
      </group>

      <EclipticPlane radius={MOON_ORBIT_R * 1.3} opacity={0.06} />
      {/* The ecliptic circle the tilted orbit is measured against. */}
      <OrbitPath
        points={eclipticCircle}
        color={DIAGRAM_COLOR.orbitFaint}
        opacity={0.4}
        radius={0.0035}
      />
      <OrbitPath points={orbitPoints} color={DIAGRAM_COLOR.moon} opacity={0.6} radius={0.005} />

      {/* Line of nodes — the only two places an eclipse can happen. */}
      {nodes[0] && nodes[1] ? (
        <Ray
          from={nodes[0]}
          to={nodes[1]}
          color={DIAGRAM_COLOR.node}
          radius={0.004}
          opacity={0.7}
        />
      ) : null}
      {nodes.map((node, i) => (
        <Marker key={i} position={[node[0], 0.03, node[2]]} color={DIAGRAM_COLOR.node} size={0.04} />
      ))}

      <Globe radius={EARTH_R} map={textures.earth} axis />
      <Globe ref={moonRef} radius={MOON_R} map={textures.moon} />

      {/* Umbrae: Moon's toward Earth, Earth's away from the Sun. */}
      <mesh ref={moonShadowRef}>
        <coneGeometry args={[MOON_R, 1, 18, 1, true]} />
        <meshBasicMaterial
          color={DIAGRAM_COLOR.shadow}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={earthShadowRef}>
        <coneGeometry args={[EARTH_R, 1, 22, 1, true]} />
        <meshBasicMaterial
          color={DIAGRAM_COLOR.shadow}
          transparent
          opacity={0.34}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
});
