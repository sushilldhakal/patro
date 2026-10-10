/**
 * Nine real lit Moon phases across one lunation, split into Shukla (waxing,
 * tithi 1–15) and Krishna (waning, tithi 16–30) paksha. Each sphere gets its
 * own point light positioned at the correct Sun-elongation angle, so the
 * crescent/gibbous shape is genuinely rendered, not drawn. Native 3D
 * reimagining of web's `PakshaStrip` (flat SVG discs); Tier 2.
 */
import { memo } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const N = 9;
const SPAN = 1.1;
const MOON_R = 0.055;

function MoonPhase({ x, f }: { x: number; f: number }) {
  const angle = (f * 360 * Math.PI) / 180;
  const lightR = 1.4;
  const lx = x + lightR * Math.cos(angle);
  const lz = lightR * Math.sin(angle);
  return (
    <group position={[x, 0, 0]}>
      <pointLight position={[lightR * Math.cos(angle), 0, lightR * Math.sin(angle)]} intensity={2.2} distance={0} decay={0} />
      <mesh>
        <sphereGeometry args={[MOON_R, 20, 20]} />
        <meshStandardMaterial color={"#cbd5e1"} roughness={0.9} />
      </mesh>
    </group>
  );
}

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void };

const PakshaStripScene = memo(function PakshaStripScene({ onLabels: _onLabels }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.12} />
      {Array.from({ length: N }, (_, i) => {
        const f = i / (N - 1);
        const x = -SPAN / 2 + f * SPAN;
        return <MoonPhase key={i} x={x} f={f} />;
      })}
      {/* paksha divider */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.003, 0.14, 0.003]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.5} />
      </mesh>
      <mesh position={[-SPAN / 4, -0.14, 0]}>
        <boxGeometry args={[SPAN / 2 - 0.05, 0.006, 0.006]} />
        <meshBasicMaterial color={"#4ade80"} transparent opacity={0.6} />
      </mesh>
      <mesh position={[SPAN / 4, -0.14, 0]}>
        <boxGeometry args={[SPAN / 2 - 0.05, 0.006, 0.006]} />
        <meshBasicMaterial color={"#60a5fa"} transparent opacity={0.6} />
      </mesh>
    </>
  );
});

export function PakshaStripDiagram() {
  const { pick, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={pick("३D — पक्ष र चन्द्र कला", "3D — the pakshas and the Moon's phases")}
      height={210}
      camera={{ yaw: 0, pitch: 0.3 }}
      frame={{ width: 1.5, height: 0.4 }}
      idleSpin={0}
      legend={[
        { color: "#4ade80", label: pick("शुक्ल पक्ष — तिथि १–१५", "Shukla paksha — tithi 1–15") },
        { color: "#60a5fa", label: pick("कृष्ण पक्ष — तिथि १६–३०", "Krishna paksha — tithi 16–30") },
      ]}
      readouts={[
        { k: pick("देखाइएका चरण", "Phases shown"), v: digits(N) },
        { k: pick("एक लुनेसन", "One lunation"), v: `${digits("29.5")} ${pick("दिन", "days")}`, tone: "accent" },
      ]}
      caption={pick(
        "प्रत्येक चन्द्रलाई साँचो सूर्य-कोणबाट उज्यालो पारिएको छ — औंसीदेखि (अन्धकार) पूर्णिमासम्म (पूर्ण उज्यालो) उज्यालो भाग बढ्दै जाने आधा शुक्ल पक्ष हो; पूर्णिमादेखि फेरि औंसीसम्म घट्दै जाने आधा कृष्ण पक्ष। प्रत्येक तिथि यही १२° कोणको एक खण्ड हो।",
        "Each Moon is lit from the true Sun-elongation angle — the growing-light half from new moon (dark) to full moon (fully lit) is Shukla paksha; the shrinking half from full moon back to new moon is Krishna paksha. Each tithi is one 12° slice of this same angle.",
      )}
    >
      {({ onLabels }) => <PakshaStripScene onLabels={onLabels} />}
    </LearnDiagram3D>
  );
}
