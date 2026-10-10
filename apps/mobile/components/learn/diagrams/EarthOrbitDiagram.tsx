/**
 * Earth's elliptical orbit — closest to the Sun (perihelion) in January, not
 * summer. Reuses the same orbit math as `SeasonsScene`/`SunEarthMoonScene`
 * (`sun-earth-moon-math.ts`), driven by day-of-year. Native 3D reimagining of
 * web's `HeliocentricOrbitStudy`; Tier 2.
 */
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { useLearnTextures } from "@/components/learn/diagrams/learn-textures";
import { EclipticPlane, Globe, OrbitPath, SunBody, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { SEM, TROPICAL_YEAR, earthOrbitFromMeanAnomaly, yearAngleFromDay } from "@/lib/learn/sun-earth-moon-math";
import { useLocale } from "@/lib/i18n";

const SUN_R = 0.16;
const EARTH_R = 0.1;

type SceneProps = { clock: DiagramClockRef; onSample?: (day: number) => void; onLabels?: (labels: DiagramLabel[]) => void; copy: { sun: string; earth: string; peri: string; aphe: string } };

const EarthOrbitScene = memo(function EarthOrbitScene({ clock, onSample, onLabels, copy }: SceneProps) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const earthRef = useRef<THREE.Group>(null);

  const orbit = ellipsePoints(SEM.earthOrbitA, SEM.earthOrbitE, 120);
  const periPoint = ellipsePoints(SEM.earthOrbitA, SEM.earthOrbitE, 2)[0]!;
  const apheA = SEM.earthOrbitA * (1 + SEM.earthOrbitE);
  const aphePoint: [number, number, number] = [-apheA, 0, 0];

  useFrame(() => {
    const day = readClock(0.016);
    const mean = yearAngleFromDay(day);
    const { nuDeg, r } = earthOrbitFromMeanAnomaly(mean);
    const nu = (nuDeg * Math.PI) / 180;
    const pos: [number, number, number] = [r * Math.cos(nu), 0, r * Math.sin(nu)];
    earthRef.current?.position.set(...pos);

    if (projector.begin()) {
      projector.push({ id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun, size: 10 }, [0, SUN_R + 0.14, 0]);
      projector.push({ id: "earth", text: copy.earth, color: DIAGRAM_LABEL_COLOR.earth }, [pos[0], EARTH_R + 0.1, pos[2]]);
      projector.push({ id: "peri", text: copy.peri, color: DIAGRAM_LABEL_COLOR.warn, size: 8 }, [periPoint[0], 0.04, periPoint[2]]);
      projector.push({ id: "aphe", text: copy.aphe, color: DIAGRAM_LABEL_COLOR.rashi, size: 8 }, [aphePoint[0], 0.04, aphePoint[2]]);
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.28} />
      <pointLight position={[0, 0, 0]} intensity={3} distance={0} decay={0} />
      <SunBody radius={SUN_R} map={textures.sun} />
      <EclipticPlane radius={SEM.earthOrbitA * 1.3} opacity={0.05} />
      <OrbitPath points={orbit} color={DIAGRAM_COLOR.orbit} opacity={0.55} radius={0.006} />
      <mesh position={periPoint}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
      </mesh>
      <mesh position={aphePoint}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.rashi} />
      </mesh>
      <Globe ref={earthRef} radius={EARTH_R} map={textures.earth} />
    </>
  );
});

export function EarthOrbitDiagram() {
  const { pick, digits } = useLocale();
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: 0,
    max: TROPICAL_YEAR,
    speed: 26,
  });

  const mean = yearAngleFromDay(day);
  const { r } = earthOrbitFromMeanAnomaly(mean);
  const copy = {
    sun: pick("सूर्य", "Sun"),
    earth: pick("पृथ्वी", "Earth"),
    peri: pick("उपसौर (जनवरी)", "Perihelion (January)"),
    aphe: pick("अपसौर (जुलाई)", "Aphelion (July)"),
  };

  return (
    <LearnDiagram3D
      title={pick("३D — पृथ्वीको अण्डाकार कक्ष", "3D — Earth's elliptical orbit")}
      height={270}
      camera={{ yaw: 0.6, pitch: 0.7 }}
      frame={{ width: 1.7, height: 0.85 }}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: pick("सूर्य", "Sun") },
        { color: DIAGRAM_COLOR.earth, label: pick("पृथ्वी", "Earth") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: pick("उपसौर — सबैभन्दा नजिक", "Perihelion — closest") },
        { color: DIAGRAM_LABEL_COLOR.rashi, label: pick("अपसौर — सबैभन्दा टाढा", "Aphelion — farthest") },
      ]}
      readouts={[
        { k: pick("वर्षको दिन", "Day of year"), v: `${digits(Math.round(day))} / ${digits(365)}`, tone: "accent" },
        { k: pick("सूर्यसम्म दूरी (सापेक्ष)", "Distance from Sun (relative)"), v: digits(r.toFixed(3)) },
      ]}
      slider={{
        value: day,
        min: 0,
        max: TROPICAL_YEAR,
        label: pick(`वर्षको दिन ${digits(Math.round(day))}`, `Day of year ${digits(Math.round(day))}`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("उपसौर", "Perihelion"), value: 0 },
        { label: pick("अपसौर", "Aphelion"), value: TROPICAL_YEAR / 2 },
      ]}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={4}
      caption={pick(
        "पृथ्वीको कक्ष पूरा वृत्त होइन, हल्का अण्डाकार हो (कक्ष यहाँ स्पष्ट देखिनका लागि बढाइचढाइ गरिएको)। पृथ्वी जनवरीतिर सूर्यको सबैभन्दा नजिक (उपसौर) र जुलाईतिर सबैभन्दा टाढा (अपसौर) हुन्छ — अर्थात् उत्तरी गोलार्धको जाडोमा नजिक। त्यसैले दूरीले ऋतु बनाउँदैन — दूरीले ऋतु बनाएको भए ठीक उल्टो हुनुपर्थ्यो; साँचो कारण अक्ष झुकाव हो।",
        "Earth's orbit is not a perfect circle but a gentle ellipse (exaggerated here to be visible). Earth is closest to the Sun (perihelion) around January and farthest (aphelion) around July — that is, closest during the northern hemisphere's winter. So distance does not make the seasons — if it did, they'd run backwards; the real cause is the axial tilt.",
      )}
    >
      {({ onLabels }) => <EarthOrbitScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
