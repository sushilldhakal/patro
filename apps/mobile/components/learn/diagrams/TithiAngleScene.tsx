/**
 * The tithi angle, from where it is actually measured: Earth.
 *
 * The Sun is pinned to one side, the Moon swings round, and the arc between
 * them is the elongation. Every 12° of that arc closes one tithi — and because
 * the Moon is lit by the same Sun, its phase in the diagram is the phase the
 * angle implies, not a drawing of one.
 */

import { memo, useRef } from "react";
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
  OrbitPath,
  SunBody,
  ellipsePoints,
  orientRay,
  setArcSweep,
} from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import {
  EARTH_AXIAL_TILT,
  RAD,
  elongationFromDay,
  tithiIndexFromElongation,
} from "@/lib/learn/sun-earth-moon-math";

const EARTH_R = 0.16;
const MOON_R = 0.06;
const MOON_ORBIT = 0.78;
const SUN_AT: [number, number, number] = [1.5, 0, 0];
const SUN_R = 0.2;
const ARC_R = 0.44;
const ARC_THICKNESS = 0.011;
/** One tithi is 12° of elongation, and thirty of them close a lunar month. */
const TITHI_DEG = 12;
const TITHI_COUNT = 30;
/** A sliver taken off each block so neighbours read as separate steps. */
const TITHI_GAP_DEG = 1.6;

type Props = {
  clock: DiagramClockRef;
  onSample?: (day: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  labels: {
    sun: string;
    earth: string;
    moon: string;
    /** "तिथि" / "Tithi" — the running count is appended. */
    tithi: string;
    /** Names the whole sweep, e.g. "कुल कोण" / "Total angle". */
    totalAngle: string;
  };
  digits: (v: string | number) => string;
};

export const TithiAngleScene = memo(function TithiAngleScene({
  clock,
  onSample,
  onLabels,
  labels: copy,
  digits,
}: Props) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);

  const moonRef = useRef<THREE.Group>(null);
  const moonRayRef = useRef<THREE.Mesh>(null);
  const sunRayRef = useRef<THREE.Mesh>(null);
  const stepRefs = useRef<(THREE.Mesh | null)[]>([]);
  const runningRef = useRef<THREE.Mesh>(null);
  const runningSweep = useRef({ deg: -1 });
  const orbitPoints = useRef(ellipsePoints(MOON_ORBIT, 0, 72)).current;

  useFrame((_state, delta) => {
    const day = readClock(delta);
    const elong = elongationFromDay(day);
    /* Elongation is measured from the Sun, so the Moon starts on the Sun's own
       side (new moon) and swings anticlockwise from there. */
    const angle = elong * RAD;
    const moonAt: [number, number, number] = [
      MOON_ORBIT * Math.cos(angle),
      0,
      -MOON_ORBIT * Math.sin(angle),
    ];

    moonRef.current?.position.set(...moonAt);
    orientRay(moonRayRef.current, [0, 0, 0], moonAt);
    orientRay(sunRayRef.current, [0, 0, 0], [SUN_AT[0] * 0.7, 0, 0]);

    /* The arc is never drawn as one sweep: whole tithis already closed show as
       separate 12° blocks, and only the one in progress grows. Counting the
       blocks is the point of the diagram. */
    const completed = Math.floor(elong / TITHI_DEG);
    for (let i = 0; i < TITHI_COUNT; i++) {
      const step = stepRefs.current[i];
      if (step) step.visible = i < completed;
    }
    const partialDeg = elong - completed * TITHI_DEG;
    if (runningRef.current) {
      runningRef.current.rotation.set(-Math.PI / 2, 0, completed * TITHI_DEG * RAD);
      setArcSweep(runningRef.current, ARC_R, ARC_THICKNESS * 1.5, partialDeg * RAD, runningSweep.current);
    }

    if (projector.begin()) {
      projector.push(
        { id: "earth", text: copy.earth, color: DIAGRAM_LABEL_COLOR.earth },
        [0, EARTH_R + 0.12, 0],
      );
      projector.push(
        { id: "moon", text: copy.moon, color: DIAGRAM_LABEL_COLOR.moon, size: 9 },
        [moonAt[0], MOON_R + 0.1, moonAt[2]],
      );
      projector.push(
        { id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun },
        [SUN_AT[0], SUN_R + 0.16, 0],
      );
      /* The whole sweep, named for what it is: an angle, not a tithi. */
      projector.push(
        {
          id: "angle",
          text: `${copy.totalAngle} ${digits(Math.round(elong))}°`,
          color: DIAGRAM_LABEL_COLOR.body,
          size: 10,
        },
        arcPoint(elong / 2, 0.74),
      );
      /* One block, named — this is the 12° the count is made of. */
      projector.push(
        { id: "unit", text: `${digits(12)}°`, color: DIAGRAM_LABEL_COLOR.arc, size: 9 },
        arcPoint(TITHI_DEG / 2, ARC_R * 0.74),
      );
      /* And the block currently filling, which is the tithi you are in. */
      projector.push(
        {
          id: "tithi",
          text: `${copy.tithi} ${digits(tithiIndexFromElongation(elong))}`,
          color: DIAGRAM_LABEL_COLOR.rashi,
          size: 11,
        },
        arcPoint(completed * TITHI_DEG + TITHI_DEG / 2, ARC_R * 1.42),
      );
      /* The running total as a sum, so the arithmetic is on screen. */
      projector.push(
        {
          id: "sum",
          text: `${digits(completed)} × ${digits(12)}° + ${digits(Math.round(partialDeg))}°`,
          color: DIAGRAM_LABEL_COLOR.dim,
          size: 9,
          dy: 14,
        },
        arcPoint(elong / 2, 0.74),
      );
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={SUN_AT} intensity={4.5} distance={0} decay={0} />

      <group position={SUN_AT}>
        <SunBody radius={SUN_R} map={textures.sun} />
      </group>

      <EclipticPlane radius={MOON_ORBIT * 1.25} opacity={0.05} />
      <OrbitPath points={orbitPoints} color={DIAGRAM_COLOR.moon} opacity={0.3} radius={0.004} />

      <Globe radius={EARTH_R} map={textures.earth} tiltDeg={EARTH_AXIAL_TILT} axis />
      <Globe ref={moonRef} radius={MOON_R} map={textures.moon} />

      {/* Sight lines out of Earth, and the arc between them. */}
      <mesh ref={sunRayRef}>
        <cylinderGeometry args={[0.005, 0.005, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh ref={moonRayRef}>
        <cylinderGeometry args={[0.005, 0.005, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.moon} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {/* Closed tithis: one block each, with a gap between them so they can be
          counted off the screen. */}
      {Array.from({ length: TITHI_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            stepRefs.current[i] = mesh;
          }}
          rotation={[-Math.PI / 2, 0, i * TITHI_DEG * RAD]}
          visible={false}
        >
          <torusGeometry
            args={[ARC_R, ARC_THICKNESS, 8, 10, (TITHI_DEG - TITHI_GAP_DEG) * RAD]}
          />
          <meshBasicMaterial
            color={DIAGRAM_COLOR.arc}
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* The tithi in progress — the only part that grows. */}
      <mesh ref={runningRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARC_R, ARC_THICKNESS * 1.5, 8, 4, 0.02]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} depthWrite={false} />
      </mesh>

      {/* Every 12° — the tithi boundaries, drawn once. */}
      <TithiTicks />
    </>
  );
});

/** A point on the count ring at a given angle from the Sun, degrees. */
function arcPoint(deg: number, radius: number): [number, number, number] {
  const a = deg * RAD;
  return [radius * Math.cos(a), 0.02, -radius * Math.sin(a)];
}

/** The thirty 12° marks the arc is counted in. */
function TithiTicks() {
  return (
    <group>
      {Array.from({ length: 30 }, (_, i) => {
        const a = i * 12 * RAD;
        const inner = 0.5;
        const outer = i % 15 === 0 ? 0.6 : 0.55;
        const mid = (inner + outer) / 2;
        return (
          <mesh
            key={i}
            position={[mid * Math.cos(a), 0, -mid * Math.sin(a)]}
            rotation={[0, a, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.004, 0.004, outer - inner, 4]} />
            <meshBasicMaterial
              color={i % 15 === 0 ? DIAGRAM_COLOR.sun : DIAGRAM_COLOR.orbitFaint}
              transparent
              opacity={i % 15 === 0 ? 0.9 : 0.5}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
