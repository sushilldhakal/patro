/**
 * Earth's own spin — the simplest of the 38 diagrams built for the mobile
 * Learn port (Phase 3, Tier 1). Web shows this as a small static SVG circle;
 * here it is a genuine spinning globe, reusing `Globe`/`SunBody` from
 * `scene-parts.tsx` and the shared diagram shell/clock — a reimagining
 * rather than an SVG port, per the Learn port plan.
 */
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock } from "@/components/learn/diagrams/diagram-clock";
import { useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { useLearnTextures } from "@/components/learn/diagrams/learn-textures";
import { Globe, Ray } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { EARTH_AXIAL_TILT } from "@/lib/learn/sun-earth-moon-math";
import { useLocale } from "@/lib/i18n";

const EARTH_R = 0.32;
const SUN_DIR: [number, number, number] = [2.2, 0, 0];

type SceneProps = {
  clock: DiagramClockRef;
  onSample?: (hour: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: { sun: string; observer: string };
};

const EarthRotationScene = memo(function EarthRotationScene({ clock, onSample, onLabels, copy }: SceneProps) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const earthRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const hour = readClock(0.016);
    const angle = (hour / 24) * Math.PI * 2;
    earthRef.current?.rotation.set(0, angle, 0);
    const mx = EARTH_R * 1.02 * Math.cos(angle);
    const mz = EARTH_R * 1.02 * Math.sin(angle);
    markerRef.current?.position.set(mx, 0, mz);

    if (projector.begin()) {
      projector.push({ id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun, size: 11 }, [SUN_DIR[0], 0.14, 0]);
      projector.push(
        { id: "observer", text: copy.observer, color: DIAGRAM_LABEL_COLOR.earth, size: 9 },
        [mx * 1.3, 0.12, mz * 1.3],
      );
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={SUN_DIR} intensity={2.6} />
      <Ray from={[0, 0, 0]} to={SUN_DIR} color={DIAGRAM_COLOR.ray} opacity={0.3} radius={0.004} />
      <mesh position={SUN_DIR}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
      </mesh>
      <Globe ref={earthRef} radius={EARTH_R} map={textures.earth} tiltDeg={EARTH_AXIAL_TILT} axis equator />
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.025, 10, 10]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.node} />
      </mesh>
    </>
  );
});

export function EarthRotationDiagram() {
  const { pick, digits } = useLocale();
  const { clock, value: hour, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 6,
    min: 0,
    max: 24,
    speed: 3,
  });

  const copy = { sun: pick("सूर्य", "Sun"), observer: pick("अवलोकक", "Observer") };
  const angle = Math.round((hour / 24) * 360);

  return (
    <LearnDiagram3D
      title={pick("३D — पृथ्वीको घूर्णन", "3D — Earth's rotation")}
      height={260}
      camera={{ yaw: 0.5, pitch: 0.55 }}
      frame={{ width: 1.1, height: 0.85 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: pick("सूर्यको दिशा", "Direction of the Sun") },
        { color: DIAGRAM_COLOR.node, label: pick("अवलोककको बिन्दु", "Observer's point") },
        { color: DIAGRAM_COLOR.axis, label: pick("अक्ष", "Axis") },
      ]}
      readouts={[
        { k: pick("घण्टा", "Hour"), v: `${digits(hour.toFixed(1))} / ${digits(24)}`, tone: "accent" },
        { k: pick("घुर्णन कोण", "Rotation angle"), v: `${digits(angle)}°` },
      ]}
      slider={{
        value: hour,
        min: 0,
        max: 24,
        label: pick(`घण्टा ${digits(hour.toFixed(1))}`, `Hour ${digits(hour.toFixed(1))}`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("मध्यरात", "Midnight"), value: 0 },
        { label: pick("बिहान ६", "6 AM"), value: 6 },
        { label: pick("मध्याह्न", "Noon"), value: 12 },
        { label: pick("साँझ ६", "6 PM"), value: 18 },
      ]}
      onPreset={scrubTo}
      presetValue={hour}
      presetTolerance={0.3}
      caption={pick(
        "पृथ्वी आफ्नै अक्षमा पश्चिमबाट पूर्वतर्फ घुम्छ — एक पूरा फेरो लगभग २४ घण्टामा। बिन्दुले एउटा अवलोककको ठाउँ देखाउँछ; त्यो बिन्दु सूर्यतिर फर्कँदा दिन, विपरीत भए रात।",
        "Earth spins on its own axis from west to east — one full turn takes about 24 hours. The marker traces one observer's spot; when it faces the Sun that is day there, and night when it faces away.",
      )}
    >
      {({ onLabels }) => <EarthRotationScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
