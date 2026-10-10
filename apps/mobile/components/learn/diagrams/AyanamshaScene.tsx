/**
 * Ayanamsha — the gap between the two zero points.
 *
 * The coloured belt is the sidereal zodiac, fixed against the stars, with मेष
 * 0° marked in green. The orange mark is the spring equinox, which slides
 * backwards through the belt as Earth's axis precesses; the arc between them,
 * growing about a degree every seventy-two years, is the ayanamsha.
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
  Marker,
  RashiRing,
  orientRay,
  setArcSweep,
} from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { EARTH_AXIAL_TILT, RAD, lahiriAyanamsha } from "@/lib/learn/sun-earth-moon-math";

const EARTH_R = 0.22;
const BELT_IN = 0.85;
const BELT_OUT = 1.15;
const ARC_R = 0.72;
const ARC_THICKNESS = 0.014;

type Props = {
  clock: DiagramClockRef;
  onSample?: (yearCe: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: { sidereal: string; tropical: string; ayanamsha: string };
  digits: (v: string | number) => string;
};

/** A point on the belt for a sidereal longitude, degrees. */
function beltPoint(lonDeg: number, r: number, y = 0): [number, number, number] {
  return [r * Math.cos(lonDeg * RAD), y, -r * Math.sin(lonDeg * RAD)];
}

export const AyanamshaScene = memo(function AyanamshaScene({
  clock,
  onSample,
  onLabels,
  copy,
  digits,
}: Props) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);

  const equinoxRef = useRef<THREE.Group>(null);
  const equinoxRayRef = useRef<THREE.Mesh>(null);
  const arcRef = useRef<THREE.Mesh>(null);
  const axisRef = useRef<THREE.Group>(null);

  const arcSweep = useRef({ deg: -1 });

  useFrame((_state, delta) => {
    const year = readClock(delta);
    const ayan = lahiriAyanamsha(year);
    /* The equinox runs backwards through the sidereal signs, so its sidereal
       longitude is 360° minus the ayanamsha. */
    const equinoxLon = (360 - (ayan % 360)) % 360;

    const at = beltPoint(equinoxLon, (BELT_IN + BELT_OUT) / 2, 0.05);
    equinoxRef.current?.position.set(at[0], at[1], at[2]);
    orientRay(equinoxRayRef.current, [0, 0.02, 0], beltPoint(equinoxLon, BELT_OUT, 0.02));

    setArcSweep(arcRef.current, ARC_R, ARC_THICKNESS, ayan * RAD, arcSweep.current);
    /* The arc runs from the equinox forward to मेष 0°, so it starts where the
       equinox now sits. */
    arcRef.current?.rotation.set(-Math.PI / 2, 0, equinoxLon * RAD);

    /* Earth's axis wheels round the cone once per precession cycle — the same
       25,772-year turn that moves the equinox. */
    if (axisRef.current) axisRef.current.rotation.y = -equinoxLon * RAD;

    if (projector.begin()) {
      projector.push(
        { id: "aries", text: copy.sidereal, color: DIAGRAM_LABEL_COLOR.arc, size: 10 },
        beltPoint(0, BELT_OUT * 1.16, 0.05),
      );
      projector.push(
        { id: "equinox", text: copy.tropical, color: DIAGRAM_LABEL_COLOR.warn, size: 10 },
        /* The two zeros are only an ayanamsha apart, so the equinox name sits
           further out than मेष 0° to keep the pair legible. */
        beltPoint(equinoxLon, BELT_OUT * 1.34, 0.05),
      );
      projector.push(
        {
          id: "ayan",
          text: `${copy.ayanamsha} ${digits(ayan.toFixed(1))}°`,
          color: DIAGRAM_LABEL_COLOR.rashi,
          size: 11,
        },
        /* Midway along the arc itself, which runs from the equinox forward to
           मेष 0° — not midway around the whole belt. */
        beltPoint(equinoxLon + ayan / 2, ARC_R * 0.78, 0.05),
      );
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 3.5, 2]} intensity={1.5} />

      <EclipticPlane radius={BELT_OUT} opacity={0.05} />
      <RashiRing inner={BELT_IN} outer={BELT_OUT} opacity={0.55} />

      <group ref={axisRef}>
        <Globe radius={EARTH_R} map={textures.earth} tiltDeg={EARTH_AXIAL_TILT} axis />
        {/* The cone the tilted axis sweeps out over one precession cycle. */}
        <mesh position={[0, EARTH_R * 1.75, 0]}>
          <coneGeometry args={[EARTH_R * 1.05, EARTH_R * 2.7, 24, 1, true]} />
          <meshBasicMaterial
            color={DIAGRAM_COLOR.axis}
            transparent
            opacity={0.09}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* मेष ०° — the sidereal zero, fixed. */}
      <Marker position={beltPoint(0, BELT_OUT * 1.04, 0.05)} color={DIAGRAM_COLOR.sidereal} size={0.05} />

      {/* The equinox mark, and the ray out to it. */}
      <group ref={equinoxRef}>
        <mesh>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
        </mesh>
      </group>
      <mesh ref={equinoxRayRef}>
        <cylinderGeometry args={[0.005, 0.005, 1, 6]} />
        <meshBasicMaterial
          color={DIAGRAM_COLOR.tropical}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={arcRef}>
        <torusGeometry args={[ARC_R, ARC_THICKNESS, 8, 4, 0.05]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} depthWrite={false} />
      </mesh>
    </>
  );
});
