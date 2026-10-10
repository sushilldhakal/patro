/**
 * The seven named points of a lunation, each a real lit sphere — a point
 * light positioned at the true Sun-elongation angle renders the crescent or
 * gibbous shape, rather than drawing it. Same per-moon-light technique as
 * `PakshaStripDiagram`, at the seven named elongations web's
 * `MoonPhasesStrip` lists (Amavasya 0°, Shukla Moon 45°, First Quarter 90°,
 * Purnima 180°, Krishna Moon 225°, Last Quarter 270°, next Amavasya 354°);
 * Tier 3.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const SPAN = 1.2;
const MOON_R = 0.06;

const PHASES = [
  { ne: "औंसी", en: "Amavasya", E: 0 },
  { ne: "शुक्ल चन्द्र", en: "Shukla Moon", E: 45 },
  { ne: "प्रथम त्रैमासिक", en: "First Quarter", E: 90 },
  { ne: "पूर्णिमा", en: "Purnima", E: 180 },
  { ne: "कृष्ण चन्द्र", en: "Krishna Moon", E: 225 },
  { ne: "अन्तिम त्रैमासिक", en: "Last Quarter", E: 270 },
  { ne: "अर्को औंसी", en: "Next Amavasya", E: 354 },
] as const;

const xOf = (i: number) => -SPAN / 2 + (i / (PHASES.length - 1)) * SPAN;

function MoonPhaseSphere({ x, e }: { x: number; e: number }) {
  const angle = (e * Math.PI) / 180;
  const lightR = 1.4;
  return (
    <group position={[x, 0, 0]}>
      <pointLight position={[lightR * Math.cos(angle), 0, lightR * Math.sin(angle)]} intensity={2.2} distance={0} decay={0} />
      <mesh>
        <sphereGeometry args={[MOON_R, 22, 22]} />
        <meshStandardMaterial color={"#cbd5e1"} roughness={0.9} />
      </mesh>
    </group>
  );
}

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; lang: "ne" | "en" };

const MoonPhasesScene = memo(function MoonPhasesScene({ onLabels, lang }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    PHASES.forEach((p, i) => {
      projector.push({ id: p.en, text: lang === "en" ? p.en : p.ne, color: DIAGRAM_LABEL_COLOR.body, size: 7.5 }, [xOf(i), -0.11, 0]);
    });
    projector.end();
  }, [projector, lang]);

  return (
    <>
      <ambientLight intensity={0.1} />
      {PHASES.map((p, i) => (
        <MoonPhaseSphere key={p.en} x={xOf(i)} e={p.E} />
      ))}
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[SPAN + 0.1, 0.004, 0.004]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
      </mesh>
    </>
  );
});

export function MoonPhasesDiagram() {
  const { pick, digits, lang } = useLocale();

  return (
    <LearnDiagram3D
      title={pick("३D — चन्द्र कलाका सात चरण", "3D — the seven named Moon phases")}
      height={220}
      camera={{ yaw: 0, pitch: 0.25 }}
      frame={{ width: 1.5, height: 0.42 }}
      idleSpin={0}
      legend={[{ color: "#cbd5e1", label: pick("साँचो सूर्य-कोणले उज्यालो पारिएको चन्द्र", "Moon lit from the true Sun angle") }]}
      readouts={[
        { k: pick("देखाइएका चरण", "Phases shown"), v: digits(PHASES.length) },
        { k: pick("एक लुनेसन", "One lunation"), v: `${digits("29.53")} ${pick("दिन", "days")}`, tone: "accent" },
      ]}
      caption={pick(
        "औंसी (कोण ०°, अन्धकार) देखि पूर्णिमा (कोण १८०°, पूर्ण उज्यालो) हुँदै फेरि अर्को औंसीसम्म — सातवटा नामाकरण गरिएका बिन्दु। प्रत्येक चन्द्र साँचो सूर्य-कोणबाट उज्यालो पारिएको छ, त्यसैले आकार कोरिएको होइन — गणना गरिएको हो।",
        "From Amavasya (0°, dark) through Purnima (180°, fully lit) to the next Amavasya — seven named points along the way. Each Moon is lit from its true Sun-elongation angle, so the shape is computed, not drawn.",
      )}
    >
      {({ onLabels }) => <MoonPhasesScene onLabels={onLabels} lang={lang} />}
    </LearnDiagram3D>
  );
}
