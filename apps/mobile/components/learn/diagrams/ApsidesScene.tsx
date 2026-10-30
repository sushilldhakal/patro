/**
 * Perihelion and aphelion against the seasons.
 *
 * Two frames turn against each other here. The solstice line is fixed by where
 * Earth's tilted axis points, so it stays put in this scene. The orbit's oval —
 * and with it perihelion (उपसौर) and aphelion (अपसौर) — slowly turns, once in
 * about 21,000 years. Earth keeps running round the year on top of that, fast
 * near perihelion and slow near aphelion, so you can see which season gets the
 * close pass in any era.
 */

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { perihelionAngle } from "@vedic-patro/domain/learn/apsidal-precession";
import { eccentricAnomaly } from "@vedic-patro/domain/learn/kepler";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { useLabelProjector } from "@/components/learn/diagrams/diagram-labels";
import { useLearnTextures } from "@/components/learn/diagrams/learn-textures";
import { EclipticPlane, Globe, Marker, OrbitPath, SunBody, ellipsePoints, orientRay } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { EARTH_AXIAL_TILT, RAD } from "@/lib/learn/sun-earth-moon-math";

const SUN_R = 0.16;
const EARTH_R = 0.1;
/** Drawn eccentricity — Earth's real 0.0167 would look like a circle. */
const DRAWN_E = 0.28;
const A = 1;
/** Seconds of animation per Earth year. */
const YEAR_SECONDS = 7;
const STATION_R = 1.55;

/** Seasonal angle (0 = December solstice, Earth's direction of travel) → scene point. */
function seasonal(angleDeg: number, r: number, y = 0): [number, number, number] {
  return [r * Math.cos(angleDeg * RAD), y, -r * Math.sin(angleDeg * RAD)];
}

type Props = {
  clock: DiagramClockRef;
  onSample?: (yearCe: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: { sun: string; perihelion: string; aphelion: string; stations: [string, string, string, string] };
};

export const ApsidesScene = memo(function ApsidesScene({ clock, onSample, onLabels, copy }: Props) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);

  const orbitRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Group>(null);
  const rayRef = useRef<THREE.Mesh>(null);
  const meanAnomaly = useRef(0);

  /* Perihelion at angle 0 in the orbit group; the group turns to the era's perihelion. */
  const orbit = useMemo(
    () => ellipsePoints(A, DRAWN_E, 128).map(([x, y, z]) => [x, y, -z] as [number, number, number]),
    [],
  );
  const rPeri = A * (1 - DRAWN_E);
  const rAph = A * (1 + DRAWN_E);
  const stations = useMemo(() => [0, 90, 180, 270].map((a) => seasonal(a, STATION_R, 0.02)), []);

  useFrame((_state, delta) => {
    const year = readClock(delta);
    const peri = perihelionAngle(year);
    if (orbitRef.current) orbitRef.current.rotation.y = peri * RAD;

    /* Kepler: a steady mean anomaly gives the true, uneven pace round the oval. */
    meanAnomaly.current = (meanAnomaly.current + (Math.min(delta, 0.1) / YEAR_SECONDS) * Math.PI * 2) % (Math.PI * 2);
    const E = eccentricAnomaly(meanAnomaly.current, DRAWN_E);
    const nu = 2 * Math.atan2(Math.sqrt(1 + DRAWN_E) * Math.sin(E / 2), Math.sqrt(1 - DRAWN_E) * Math.cos(E / 2));
    const r = (A * (1 - DRAWN_E * DRAWN_E)) / (1 + DRAWN_E * Math.cos(nu));
    const earth = seasonal(peri + nu / RAD, r);
    earthRef.current?.position.set(...earth);
    orientRay(rayRef.current, [0, 0, 0], earth);

    if (projector.begin()) {
      projector.push({ id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun, size: 11 }, [0, SUN_R + 0.14, 0]);
      projector.push({ id: "peri", text: copy.perihelion, color: DIAGRAM_LABEL_COLOR.warn, size: 10 }, seasonal(peri, rPeri, 0.12));
      projector.push({ id: "aph", text: copy.aphelion, color: DIAGRAM_LABEL_COLOR.earth, size: 10 }, seasonal(peri + 180, rAph, 0.12));
      stations.forEach((p, i) => {
        projector.push({ id: `st-${i}`, text: copy.stations[i]!, color: DIAGRAM_LABEL_COLOR.rashi, size: 9 }, [p[0] * 1.08, 0.04, p[2] * 1.08]);
      });
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.24} />
      <pointLight position={[0, 0, 0]} intensity={3.4} distance={0} decay={0} />
      <SunBody radius={SUN_R} map={textures.sun} />
      <EclipticPlane radius={STATION_R * 1.1} opacity={0.05} />

      {/* Fixed by the axis: the solstice line and the four stations of the year. */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, STATION_R * 2, 6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {stations.map((p, i) => (
        <Marker key={i} position={p} color={i % 2 === 0 ? DIAGRAM_COLOR.sun : DIAGRAM_COLOR.orbitFaint} size={0.03} />
      ))}

      {/* Turned by apsidal precession: the oval, its long axis and its two ends. */}
      <group ref={orbitRef}>
        <OrbitPath points={orbit} color={DIAGRAM_COLOR.orbit} opacity={0.6} radius={0.006} />
        <mesh position={[(rPeri - rAph) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.003, 0.003, rPeri + rAph, 6]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.tropical} transparent opacity={0.6} depthWrite={false} />
        </mesh>
        <mesh position={[rPeri, 0, 0]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
        </mesh>
        <mesh position={[-rAph, 0, 0]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.earth} />
        </mesh>
      </group>

      <mesh ref={rayRef}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.ray} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* The axis keeps one direction in space; at the June solstice (left) the north leans sunward. */}
      <Globe ref={earthRef} radius={EARTH_R} map={textures.earth} tiltDeg={EARTH_AXIAL_TILT} axis equator />
    </>
  );
});
