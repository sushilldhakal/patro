/**
 * Why the weekday order is Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn —
 * step three places around a ring of the seven grahas in classical
 * slowest-to-fastest order (24 hora ÷ 7 grahas leaves a remainder of 3), and
 * the week falls out. Native 3D reimagining of web's `HoraWeekdayCycle`.
 */
import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR, RASHI_RING_COLORS } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const RING_NE = ["शनि", "बृहस्पति", "मंगल", "सूर्य", "शुक्र", "बुध", "चन्द्र"];
const RING_EN = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
/* Start at सूर्य (index 3), step 3 each time (24 mod 7 = 3): produces
   Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn — the week, exactly. */
const WEEK = Array.from({ length: 7 }, (_, k) => (3 + k * 3) % 7);
const RING_R = 0.5;

function ringPos(i: number): [number, number, number] {
  const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
  return [RING_R * Math.cos(a), 0, RING_R * Math.sin(a)];
}

type SceneProps = {
  clock: DiagramClockRef;
  onSample?: (step: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  ringLabels: string[];
};

const HoraWeekdayCycleScene = memo(function HoraWeekdayCycleScene({ clock, onSample, onLabels, ringLabels }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const chordRefs = useRef<(THREE.Mesh | null)[]>([]);
  const markerRef = useRef<THREE.Mesh>(null);

  const ringPoints = useMemo(() => Array.from({ length: 7 }, (_, i) => ringPos(i)), []);

  useFrame(() => {
    const step = readClock(0.016);
    const visibleChords = Math.floor(step);

    for (let k = 0; k < 6; k++) {
      const mesh = chordRefs.current[k];
      if (!mesh) continue;
      if (k >= visibleChords) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const a = new THREE.Vector3(...ringPos(WEEK[k]!));
      const b = new THREE.Vector3(...ringPos(WEEK[k + 1]!));
      const dir = b.clone().sub(a);
      const len = dir.length() || 1e-6;
      mesh.position.copy(a).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      mesh.scale.set(1, len, 1);
    }

    const landedIdx = WEEK[Math.min(6, Math.max(0, Math.round(step)))]!;
    const pos = ringPos(landedIdx);
    markerRef.current?.position.set(pos[0], 0.06, pos[2]);

    if (projector.begin()) {
      ringPoints.forEach((p, i) => {
        projector.push(
          { id: `ring-${i}`, text: ringLabels[i]!, color: DIAGRAM_LABEL_COLOR.body, size: 9 },
          [p[0] * 1.28, 0.04, p[2] * 1.28],
        );
      });
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 1.4, 0]} intensity={1.6} />
      {ringPoints.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color={RASHI_RING_COLORS[i % RASHI_RING_COLORS.length]} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, k) => (
        <mesh key={k} ref={(el) => (chordRefs.current[k] = el)}>
          <cylinderGeometry args={[0.01, 0.01, 1, 6]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.arc} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sunGlow} />
      </mesh>
    </>
  );
});

export function HoraWeekdayCycleDiagram() {
  const { pick, digits, lang } = useLocale();
  const { clock, value: step, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 6,
    min: 0,
    max: 6,
    speed: 1.4,
  });

  const ringLabels = lang === "en" ? RING_EN : RING_NE;
  const landedIdx = WEEK[Math.round(Math.min(6, Math.max(0, step)))]!;
  const dayNames = lang === "en"
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];

  return (
    <LearnDiagram3D
      title={pick("३D — होरा चक्रबाट वारको क्रम", "3D — the weekday order from the hora cycle")}
      height={270}
      camera={{ yaw: 0.3, pitch: 0.75 }}
      frame={{ width: 1.5, height: 0.75 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.arc, label: pick("३ पाइला जम्प (चरण)", "3-step jump (chord)") },
        { color: DIAGRAM_COLOR.sunGlow, label: pick("अहिलेको वार", "Current weekday") },
      ]}
      readouts={[
        { k: pick("चरण", "Step"), v: `${digits(Math.min(7, Math.round(step) + 1))} / ${digits(7)}`, tone: "accent" },
        { k: pick("ग्रह", "Graha"), v: ringLabels[landedIdx]! },
        { k: pick("वार", "Weekday"), v: dayNames[Math.min(6, Math.round(step))]!, tone: "warn" },
      ]}
      slider={{
        value: step,
        min: 0,
        max: 6,
        step: 1,
        label: pick(`चरण ${digits(Math.round(step) + 1)}`, `Step ${digits(Math.round(step) + 1)}`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("सुरु", "Start"), value: 0 },
        { label: pick("पूरा", "Complete"), value: 6 },
      ]}
      onPreset={scrubTo}
      presetValue={step}
      presetTolerance={0.4}
      caption={pick(
        "बाहिरी वृत्तमा सात ग्रह गति अनुसार क्रमबद्ध छन् — सबैभन्दा ढिलो (शनि) देखि सबैभन्दा छिटो (चन्द्र)। दिनका २४ होरा सातवटा ग्रहमा बाँड्दा ३ पूरा फेरो पछि ३ बाँकी रहन्छ — त्यसैले हरेक दिनको पहिलो होराको स्वामी अघिल्लो दिनको स्वामीभन्दा ३ स्थान पर पर्छ। सूर्यबाट सुरु गरी ३–३ पाइला उफ्रँदै जाँदा ठ्याक्कै हप्ताको क्रम बन्छ — आइत, सोम, मंगल, बुध, बिही, शुक्र, शनि।",
        "The outer ring orders the seven grahas by speed — slowest (Saturn) to fastest (Moon). Splitting the day's 24 horas across seven grahas leaves a remainder of 3 after full turns, so each day's first hora lord sits 3 places past the previous day's. Starting from the Sun and jumping 3 places each time produces the week exactly — Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.",
      )}
    >
      {({ onLabels }) => (
        <HoraWeekdayCycleScene clock={clock} onSample={onSample} onLabels={onLabels} ringLabels={ringLabels} />
      )}
    </LearnDiagram3D>
  );
}
