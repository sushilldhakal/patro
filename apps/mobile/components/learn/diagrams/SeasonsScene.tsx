/**
 * Why there are ritu at all.
 *
 * Earth's axis keeps pointing the same way in space all year — it does not
 * lean toward the Sun and back. What changes is where Earth is: half the year
 * the north pole leans sunward and the north gets its long days, half the year
 * it leans away. The equinoxes are the two crossings in between.
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
  SunBody,
  ellipsePoints,
  orientRay,
} from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import {
  EARTH_AXIAL_TILT,
  SEM,
  TROPICAL_YEAR,
  sunEarthMoonLayout3D,
} from "@/lib/learn/sun-earth-moon-math";

const SUN_R = 0.2;
const EARTH_R = 0.17;

/** The four stations of the year, as day-of-year on this simplified orbit. */
export const SEASON_STATIONS = [0, TROPICAL_YEAR * 0.25, TROPICAL_YEAR * 0.5, TROPICAL_YEAR * 0.75];

type Props = {
  clock: DiagramClockRef;
  onSample?: (day: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  /** Four station names in reading order from day 0. */
  stations: [string, string, string, string];
  copy: { sun: string; earth: string; axis: string };
};

export const SeasonsScene = memo(function SeasonsScene({
  clock,
  onSample,
  onLabels,
  stations,
  copy,
}: Props) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);

  const earthRef = useRef<THREE.Group>(null);
  const rayRef = useRef<THREE.Mesh>(null);

  const orbit = useMemo(() => ellipsePoints(SEM.earthOrbitA, SEM.earthOrbitE, 120), []);
  const stationPoints = useMemo(
    () => SEASON_STATIONS.map((day) => sunEarthMoonLayout3D(day).earth),
    [],
  );

  useFrame((_state, delta) => {
    const day = readClock(delta);
    const { earth } = sunEarthMoonLayout3D(day);
    earthRef.current?.position.set(...earth);
    orientRay(rayRef.current, [0, 0, 0], earth);

    if (projector.begin()) {
      projector.push(
        { id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun, size: 11 },
        [0, SUN_R + 0.16, 0],
      );
      projector.push(
        { id: "earth", text: copy.earth, color: DIAGRAM_LABEL_COLOR.earth },
        [earth[0], EARTH_R + 0.14, earth[2]],
      );
      projector.push(
        { id: "axis", text: copy.axis, color: DIAGRAM_LABEL_COLOR.dim, size: 9 },
        [earth[0], EARTH_R * 2.6, earth[2]],
      );
      stationPoints.forEach((point, i) => {
        const name = stations[i];
        if (!name || !point) return;
        projector.push(
          { id: `station-${i}`, text: name, color: DIAGRAM_LABEL_COLOR.rashi, size: 9 },
          [point[0] * 1.2, 0.02, point[2] * 1.2],
        );
      });
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.24} />
      <pointLight position={[0, 0, 0]} intensity={3.4} distance={0} decay={0} />

      <SunBody radius={SUN_R} map={textures.sun} />
      <EclipticPlane radius={SEM.earthOrbitA * 1.25} opacity={0.06} />
      <OrbitPath points={orbit} color={DIAGRAM_COLOR.orbit} opacity={0.5} radius={0.005} />

      {stationPoints.map((point, i) => (
        <Marker key={i} position={[point[0], 0.03, point[2]]} color={DIAGRAM_COLOR.sun} size={0.035} />
      ))}

      <mesh ref={rayRef}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.ray} transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* The axis never turns with the orbit — that is the whole point. */}
      <Globe
        ref={earthRef}
        radius={EARTH_R}
        map={textures.earth}
        tiltDeg={EARTH_AXIAL_TILT}
        axis
        equator
      />
    </>
  );
});
