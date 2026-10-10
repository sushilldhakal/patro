/**
 * Sun, Earth and Moon — the diagram the whole calendar hangs off.
 *
 * Earth runs its Kepler ellipse around the Sun while the Moon runs its own
 * around Earth, and the sidereal belt outside the orbit shows which rashi the
 * Sun stands in as seen from Earth. That crossing is sankranti; the Moon
 * lapping the year ~12.37 times is where adhik maas comes from.
 */

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabelProjector } from "@/components/learn/diagrams/diagram-labels";
import type { DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import { useLearnTextures } from "@/components/learn/diagrams/learn-textures";
import {
  EclipticPlane,
  Globe,
  OrbitPath,
  RashiRing,
  SunBody,
  ellipsePoints,
  orientRay,
} from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import {
  EARTH_AXIAL_TILT,
  RAD,
  SEM,
  earthOrbitFromMeanAnomaly,
  rashiIndexFromLon,
  sunEarthMoonLayout3D,
  sunSiderealLonFromEarthNu,
  yearAngleFromDay,
} from "@/lib/learn/sun-earth-moon-math";
import { getRashiName } from "@/lib/rashi-i18n";

const SUN_R = 0.2;
const EARTH_R = 0.085;
const MOON_R = 0.028;
const BELT_IN = 1.32;
const BELT_OUT = 1.62;

type Props = {
  clock: DiagramClockRef;
  onSample?: (day: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  lang: "ne" | "en";
  /** Names for the three bodies, already in the reader's language. */
  names: { sun: string; earth: string; moon: string };
  showBelt?: boolean;
};

export const SunEarthMoonScene = memo(function SunEarthMoonScene({
  clock,
  onSample,
  onLabels,
  lang,
  names,
  showBelt = true,
}: Props) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const labels = useLabelProjector(onLabels);

  const earthRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Group>(null);
  const moonOrbitRef = useRef<THREE.Group>(null);
  const sunRayRef = useRef<THREE.Mesh>(null);
  const sightRayRef = useRef<THREE.Mesh>(null);

  const earthOrbit = useMemo(
    () => ellipsePoints(SEM.earthOrbitA, SEM.earthOrbitE, 120),
    [],
  );
  const moonOrbit = useMemo(() => ellipsePoints(SEM.moonOrbitA, SEM.moonOrbitE, 64), []);

  useFrame((_state, delta) => {
    const day = readClock(delta);
    const layout = sunEarthMoonLayout3D(day);

    earthRef.current?.position.set(...layout.earth);
    moonRef.current?.position.set(...layout.moon);
    /* The Moon's ellipse keeps its long axis pointed at the Sun in this
       simplified model, so the ring travels and turns with the Earth. */
    if (moonOrbitRef.current) {
      moonOrbitRef.current.position.set(...layout.earth);
      moonOrbitRef.current.rotation.y = -Math.atan2(-layout.earth[2], -layout.earth[0]);
    }

    orientRay(sunRayRef.current, [0, 0, 0], layout.earth);

    const nu = earthOrbitFromMeanAnomaly(yearAngleFromDay(day)).nuDeg;
    const sunLon = sunSiderealLonFromEarthNu(nu);
    const beltR = (BELT_IN + BELT_OUT) / 2;
    /* Longitude runs anticlockwise from +X in the ecliptic plane; the scene's
       Z axis points the other way, hence the negated sine. */
    const beltPoint: [number, number, number] = [
      beltR * Math.cos(sunLon * RAD),
      0,
      -beltR * Math.sin(sunLon * RAD),
    ];
    orientRay(sightRayRef.current, layout.earth, beltPoint);

    if (labels.begin()) {
      labels.push(
        { id: "sun", text: names.sun, color: DIAGRAM_LABEL_COLOR.sun, size: 11 },
        [0, SUN_R + 0.12, 0],
      );
      labels.push(
        { id: "earth", text: names.earth, color: DIAGRAM_LABEL_COLOR.earth },
        [layout.earth[0], EARTH_R + 0.1, layout.earth[2]],
      );
      /* No Moon label here: at this scale it sits a few pixels from Earth and
         the two names collide. The legend names it instead. */
      if (showBelt) {
        labels.push(
          {
            id: "rashi",
            text: getRashiName(rashiIndexFromLon(sunLon) + 1, lang),
            color: DIAGRAM_LABEL_COLOR.rashi,
            size: 11,
          },
          [beltPoint[0] * 1.14, 0.06, beltPoint[2] * 1.14],
        );
      }
      labels.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.28} />
      {/* The Sun is the only real light — which is what draws the terminator
          across Earth and gives the Moon its phase for free. */}
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={0} decay={0} />

      <SunBody radius={SUN_R} map={textures.sun} />

      <EclipticPlane radius={showBelt ? BELT_OUT : SEM.earthOrbitA * 1.15} />
      {showBelt ? <RashiRing inner={BELT_IN} outer={BELT_OUT} opacity={0.42} y={-0.002} /> : null}

      <OrbitPath points={earthOrbit} color={DIAGRAM_COLOR.orbit} opacity={0.5} radius={0.005} />

      <group ref={moonOrbitRef}>
        <OrbitPath
          points={moonOrbit}
          color={DIAGRAM_COLOR.moon}
          opacity={0.35}
          radius={0.0035}
        />
      </group>

      {/* Sun → Earth radius, and Earth → belt sight line. */}
      <mesh ref={sunRayRef}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.ray} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh ref={sightRayRef}>
        <cylinderGeometry args={[0.0035, 0.0035, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <Globe ref={earthRef} radius={EARTH_R} map={textures.earth} tiltDeg={EARTH_AXIAL_TILT} axis />
      <Globe ref={moonRef} radius={MOON_R} map={textures.moon} />
    </>
  );
});
