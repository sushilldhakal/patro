/**
 * Why slanted light heats less — a beam bundle of fixed width spreads over a
 * wider footprint (and thins its energy) the shallower it hits the ground.
 * Native 3D reimagining of web's `SunRayAngle` (flat SVG); Tier 1.
 */
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { Ray } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const RAD = Math.PI / 180;
const BEAM_WIDTH = 0.4;
const BEAM_TOP_Y = 0.9;
const STEEP_DEG = 12;

function footprint(deg: number) {
  return BEAM_WIDTH / Math.cos(deg * RAD);
}

type SceneProps = {
  clock: DiagramClockRef;
  onSample?: (deg: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: { steep: string; shallow: string };
};

function beamRays(cx: number, deg: number): [[number, number, number], [number, number, number]][] {
  const foot = footprint(deg);
  const dx = Math.tan(deg * RAD) * BEAM_TOP_Y;
  return [-0.5, -0.166, 0.166, 0.5].map((f) => [
    [cx + f * BEAM_WIDTH - dx, BEAM_TOP_Y, 0],
    [cx + f * foot, 0, 0],
  ]);
}

const SunRayAngleScene = memo(function SunRayAngleScene({ clock, onSample, onLabels, copy }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const footRef = useRef<THREE.Mesh>(null);

  const steepRays = beamRays(-0.55, STEEP_DEG);

  useFrame(() => {
    const deg = readClock(0.016);
    const foot = footprint(deg);
    footRef.current?.scale.set(foot / BEAM_WIDTH, 1, 1);
    footRef.current?.position.set(0.55, 0.002, 0);

    if (projector.begin()) {
      projector.push({ id: "steep", text: copy.steep, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [-0.55, BEAM_TOP_Y + 0.1, 0]);
      projector.push({ id: "shallow", text: copy.shallow, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [0.55, BEAM_TOP_Y + 0.1, 0]);
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[0, 2, 1]} intensity={1.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 1]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.grid} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>

      {steepRays.map((r, i) => (
        <Ray key={i} from={r[0]} to={r[1]} color={DIAGRAM_COLOR.sun} opacity={0.85} radius={0.008} />
      ))}
      <mesh position={[-0.55, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[footprint(STEEP_DEG), 0.06]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} transparent opacity={0.5} />
      </mesh>

      <ShallowBeam clock={clock} />
      <mesh ref={footRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BEAM_WIDTH, 0.06]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sunGlow} transparent opacity={0.55} />
      </mesh>
    </>
  );
});

/** Redrawn every frame since the shallow beam's angle scrubs live. */
function ShallowBeam({ clock }: { clock: DiagramClockRef }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const deg = clock.current.value;
    const rays = beamRays(0.55, deg);
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const [from, to] = rays[i]!;
      const mesh = child as THREE.Mesh;
      const a = new THREE.Vector3(...from);
      const b = new THREE.Vector3(...to);
      const dir = b.clone().sub(a);
      const len = dir.length() || 1e-6;
      mesh.position.copy(a).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      mesh.scale.set(1, len, 1);
    });
  });
  return (
    <group ref={group}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i}>
          <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.sunGlow} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function SunRayAngleDiagram() {
  const { pick, digits } = useLocale();
  const { clock, value: deg, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 62,
    min: 15,
    max: 85,
    speed: 8,
  });

  const copy = { steep: pick(`~१२°`, `~12°`), shallow: pick("शंकु — तपाईंले चलाउनुभएको", "your angle") };
  const foot = footprint(deg);
  const intensity = Math.round(Math.cos(deg * RAD) * 100);
  const steepIntensity = Math.round(Math.cos(STEEP_DEG * RAD) * 100);

  return (
    <LearnDiagram3D
      title={pick("३D — सूर्यको किरण कोण", "3D — angle of sunlight")}
      height={250}
      camera={{ yaw: 0, pitch: 0.5 }}
      frame={{ width: 1.5, height: 0.6 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: pick("~१२° — ठाडो किरण", "~12° — steep beam") },
        { color: DIAGRAM_COLOR.sunGlow, label: pick("चलाउनुभएको कोण", "your angle") },
      ]}
      readouts={[
        { k: pick("कोण", "Angle"), v: `${digits(Math.round(deg))}°`, tone: "accent" },
        { k: pick("जमिनको चौडाइ", "Ground footprint"), v: `${digits(foot.toFixed(2))}×`, tone: "warn" },
        { k: pick("सापेक्ष तीव्रता (चलाउनु)", "Relative intensity (yours)"), v: `${digits(intensity)}%` },
        { k: pick("सापेक्ष तीव्रता (~१२°)", "Relative intensity (~12°)"), v: `${digits(steepIntensity)}%` },
      ]}
      slider={{
        value: deg,
        min: 15,
        max: 85,
        label: pick(`कोण ${digits(Math.round(deg))}°`, `Angle ${digits(Math.round(deg))}°`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("झन्डै ठाडो", "Nearly overhead"), value: 20 },
        { label: pick("मध्य", "Midday-ish"), value: 45 },
        { label: pick("छड्के", "Grazing"), value: 75 },
      ]}
      onPreset={scrubTo}
      presetValue={deg}
      presetTolerance={2}
      caption={pick(
        "उही चौडाइको किरण बन्डल ठाडो पर्दा साँघुरो ठाउँमा पर्छ — त्यहाँ ताप बढी घनीभूत हुन्छ। छड्के कोणमा उही किरणले फराकिलो ठाउँ ढाक्छ, त्यसैले प्रति एकाइ क्षेत्रफल ताप घट्छ — यही कारण दिउँसो घाम बढी तातो र बिहान–साँझ कम।",
        "The same-width beam bundle lands on a narrow patch when it arrives steep — the heat there is concentrated. At a grazing angle the same beam covers a wide patch, so heat per unit area drops — this is why midday sun feels hotter than morning or evening sun.",
      )}
    >
      {({ onLabels }) => <SunRayAngleScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
