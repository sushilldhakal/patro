/**
 * How the siddhantas made a uniform circle fit an unequal sky. A mean graha
 * moves at a dead-constant rate — easy to compute, wrong on the sky. Two
 * corrections repair it: manda (orbit not centred on us, one wave per
 * revolution) then shighra (our own orbital motion, the seed of retrograde).
 * Applied in turn they give the sphuta graha — the true position. Native 3D
 * reimagining of web's `MandaShighra` (three stacked flat curves) as three
 * concentric rings and a correction chain; Tier 3.
 */
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { OrbitPath } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const R_MEAN = 0.3;
const R_MANDA = 0.45;
const R_TRUE = 0.62;
const D2R = Math.PI / 180;

function mandaOffset(f: number) {
  return 15 * Math.sin(f * Math.PI * 2);
}
function shighraOffset(f: number) {
  return 13 * Math.sin(f * Math.PI * 6);
}

function ringPoints(r: number, n = 96): [number, number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [r * Math.cos(a), 0, r * Math.sin(a)] as [number, number, number];
  });
}

type SceneProps = { clock: DiagramClockRef; onSample?: (f: number) => void; onLabels?: (labels: DiagramLabel[]) => void; copy: { mean: string; manda: string; shighra: string } };

const MandaShighraScene = memo(function MandaShighraScene({ clock, onSample, onLabels, copy }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const meanRef = useRef<THREE.Mesh>(null);
  const mandaRef = useRef<THREE.Mesh>(null);
  const trueRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const f = readClock(0.016) % 1;
    const meanA = f * 360;
    const mandaA = meanA + mandaOffset(f);
    const trueA = mandaA + shighraOffset(f);

    const mp: [number, number, number] = [R_MEAN * Math.cos(meanA * D2R), 0, R_MEAN * Math.sin(meanA * D2R)];
    const dp: [number, number, number] = [R_MANDA * Math.cos(mandaA * D2R), 0, R_MANDA * Math.sin(mandaA * D2R)];
    const tp: [number, number, number] = [R_TRUE * Math.cos(trueA * D2R), 0, R_TRUE * Math.sin(trueA * D2R)];

    meanRef.current?.position.set(...mp);
    mandaRef.current?.position.set(...dp);
    trueRef.current?.position.set(...tp);

    if (projector.begin()) {
      projector.push({ id: "mean", text: copy.mean, color: DIAGRAM_LABEL_COLOR.dim, size: 8 }, [mp[0] * 1.15, 0.05, mp[2] * 1.15]);
      projector.push({ id: "manda", text: copy.manda, color: DIAGRAM_COLOR.tropical, size: 8 }, [dp[0] * 1.1, 0.05, dp[2] * 1.1]);
      projector.push({ id: "true", text: copy.shighra, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [tp[0] * 1.08, 0.08, tp[2] * 1.08]);
      projector.end();
    }
  });

  const meanRing = ringPoints(R_MEAN);
  const mandaRing = ringPoints(R_MANDA);
  const trueRing = ringPoints(R_TRUE);

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 1.2, 0.5]} intensity={1.3} />
      <OrbitPath points={meanRing} color={DIAGRAM_LABEL_COLOR.dim} opacity={0.28} radius={0.004} />
      <OrbitPath points={mandaRing} color={DIAGRAM_COLOR.tropical} opacity={0.3} radius={0.004} />
      <OrbitPath points={trueRing} color={DIAGRAM_LABEL_COLOR.warn} opacity={0.5} radius={0.004} />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <mesh ref={meanRef}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial color={DIAGRAM_LABEL_COLOR.dim} />
      </mesh>
      <mesh ref={mandaRef}>
        <sphereGeometry args={[0.022, 12, 12]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.tropical} />
      </mesh>
      <mesh ref={trueRef}>
        <sphereGeometry args={[0.028, 14, 14]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
      </mesh>
    </>
  );
});

export function MandaShighraDiagram() {
  const { pick, digits } = useLocale();
  const { clock, value: f, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: 0,
    max: 1,
    speed: 0.12,
  });

  const manda = mandaOffset(f);
  const shighra = shighraOffset(f);
  const copy = { mean: pick("मध्यम ग्रह", "Mean planet"), manda: pick("+ मन्द सुधार", "+ manda correction"), shighra: pick("+ शीघ्र = स्फुट ग्रह", "+ shighra = true planet") };

  return (
    <LearnDiagram3D
      title={pick("३D — मन्द र शीघ्र सुधार", "3D — manda and shighra corrections")}
      height={280}
      camera={{ yaw: 0.35, pitch: 0.85 }}
      frame={{ width: 1.4, height: 0.8 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_LABEL_COLOR.dim, label: copy.mean },
        { color: DIAGRAM_COLOR.tropical, label: copy.manda },
        { color: DIAGRAM_LABEL_COLOR.warn, label: copy.shighra },
      ]}
      readouts={[
        { k: pick("फेरो", "Revolution"), v: `${digits((f * 100).toFixed(0))}%`, tone: "accent" },
        { k: pick("मन्द सच्याइ", "Manda correction"), v: `${digits(manda >= 0 ? "+" + manda.toFixed(1) : manda.toFixed(1))}°` },
        { k: pick("शीघ्र सच्याइ", "Shighra correction"), v: `${digits(shighra >= 0 ? "+" + shighra.toFixed(1) : shighra.toFixed(1))}°`, tone: "warn" },
      ]}
      slider={{
        value: f,
        min: 0,
        max: 1,
        label: pick(`फेरो ${digits((f * 100).toFixed(0))}%`, `Revolution ${digits((f * 100).toFixed(0))}%`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      caption={pick(
        "मध्यम ग्रह (भित्री घेरा) एउटा स्थिर गतिमा वृत्तमा घुम्छ — गणना सजिलो तर आकाशमा गलत। मन्द सुधारले कक्ष हामीबाट केन्द्रित नभएको कुरा मिलाउँछ — प्रति फेरो एक तरङ्ग। शीघ्र सुधारले हाम्रो आफ्नै परिक्रमा गति मिलाउँछ — यहीँबाट वक्री गतिको बीउ आउँछ। दुवै लगाएपछि बाहिरी घेराको स्फुट ग्रह — साँचो स्थान — बन्छ।",
        "The mean planet (inner ring) moves at a constant rate around a circle — easy to compute, wrong on the sky. The manda correction accounts for the orbit not being centred on us — one wave per revolution. The shighra correction accounts for our own orbital motion — this is where the seed of retrograde motion comes from. Applied together they give the outer ring's sphuta graha — the true position.",
      )}
    >
      {({ onLabels }) => <MandaShighraScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
