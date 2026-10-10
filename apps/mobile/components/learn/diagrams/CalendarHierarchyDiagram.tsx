/**
 * Three motions, three streams, one date. Earth's rotation gives the day and
 * vaara; the Sun's path gives rashi, sankranti and the solar month; the
 * Moon's angle from the Sun gives tithi, paksha and the lunar month — all
 * three converge on the panchanga and, from there, a single BS date. Native
 * 3D reimagining of web's `HierarchyDiagram` (a flow, drawn as a converging
 * tree instead of flat SVG boxes); Tier 2.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { Ray } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

type Branch = { ne: string; en: string; color: string; steps: { ne: string; en: string }[]; z: number };

const BRANCHES: Branch[] = [
  {
    ne: "पृथ्वी — घूर्णन",
    en: "Earth — rotation",
    color: "#3aa0d8",
    z: -0.36,
    steps: [{ ne: "दिन", en: "Day" }, { ne: "वार", en: "Vaara" }],
  },
  {
    ne: "सूर्य — राशि गति",
    en: "Sun — rashi motion",
    color: DIAGRAM_LABEL_COLOR.warn,
    z: 0,
    steps: [
      { ne: "राशि", en: "Rashi" },
      { ne: "सङ्क्रान्ति", en: "Sankranti" },
      { ne: "सौर महिना", en: "Solar month" },
    ],
  },
  {
    ne: "चन्द्र — सूर्यसँगको कोण",
    en: "Moon — angle from Sun",
    color: "#cbd5e1",
    z: 0.36,
    steps: [
      { ne: "तिथि", en: "Tithi" },
      { ne: "पक्ष", en: "Paksha" },
      { ne: "चान्द्र महिना", en: "Lunar month" },
    ],
  },
];

const START_X = -0.55;
const END_X = 0.5;
const STEP_W = 0.32;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; lang: "ne" | "en"; copy: { panchanga: string; date: string } };

const CalendarHierarchyScene = memo(function CalendarHierarchyScene({ onLabels, lang, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    BRANCHES.forEach((b) => {
      projector.push({ id: `src-${b.ne}`, text: lang === "en" ? b.en : b.ne, color: b.color, size: 8 }, [START_X, 0.08, b.z]);
      b.steps.forEach((s, si) => {
        const x = START_X + (si + 1) * STEP_W;
        projector.push({ id: `${b.ne}-${si}`, text: lang === "en" ? s.en : s.ne, color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [x, 0.06, b.z]);
      });
    });
    projector.push({ id: "panchanga", text: copy.panchanga, color: DIAGRAM_LABEL_COLOR.rashi, size: 9 }, [END_X, 0.1, 0]);
    projector.push({ id: "date", text: copy.date, color: DIAGRAM_LABEL_COLOR.rashi, size: 8 }, [END_X + 0.14, -0.02, 0]);
    projector.end();
  }, [projector, lang, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {BRANCHES.map((b) => {
        const nodeXs = [START_X, ...b.steps.map((_, si) => START_X + (si + 1) * STEP_W)];
        return (
          <group key={b.ne}>
            {nodeXs.map((x, i) => (
              <mesh key={i} position={[x, 0, b.z]}>
                <sphereGeometry args={[i === 0 ? 0.03 : 0.02, 14, 14]} />
                <meshStandardMaterial color={b.color} />
              </mesh>
            ))}
            {nodeXs.slice(0, -1).map((x, i) => (
              <Ray key={i} from={[x, 0, b.z]} to={[nodeXs[i + 1]!, 0, b.z]} color={b.color} opacity={0.55} radius={0.004} />
            ))}
            {/* converge to the panchanga node */}
            <Ray from={[nodeXs[nodeXs.length - 1]!, 0, b.z]} to={[END_X, 0, 0]} color={b.color} opacity={0.45} radius={0.004} />
          </group>
        );
      })}
      <mesh position={[END_X, 0, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color={DIAGRAM_LABEL_COLOR.rashi} />
      </mesh>
      <Ray from={[END_X, 0, 0]} to={[END_X + 0.2, 0, 0]} color={DIAGRAM_LABEL_COLOR.rashi} opacity={0.6} radius={0.005} />
    </>
  );
});

export function CalendarHierarchyDiagram() {
  const { pick, lang } = useLocale();
  const copy = { panchanga: pick("पञ्चाङ्ग", "Panchanga"), date: pick("बि.सं. मिति", "BS date") };

  return (
    <LearnDiagram3D
      title={pick("३D — तीन गति, एउटा मिति", "3D — three motions, one date")}
      height={260}
      camera={{ yaw: 0.15, pitch: 0.55 }}
      frame={{ width: 1.9, height: 0.85 }}
      idleSpin={0}
      legend={BRANCHES.map((b) => ({ color: b.color, label: pick(b.ne, b.en) }))}
      readouts={[
        { k: pick("स्रोत गति", "Source motions"), v: `${3}`, tone: "accent" },
        { k: pick("अभिसरण", "Converges on"), v: pick("पञ्चाङ्ग", "Panchanga") },
      ]}
      caption={pick(
        "पृथ्वीको घूर्णनले दिन र वार दिन्छ; सूर्यको राशि-गतिले राशि, सङ्क्रान्ति र सौर महिना दिन्छ; चन्द्र र सूर्यबीचको कोणले तिथि, पक्ष र चान्द्र महिना दिन्छ। तीनै धारा पञ्चाङ्गमा मिसिन्छन्, र त्यहाँबाट एउटै बि.सं. मिति बन्छ।",
        "Earth's rotation gives the day and the vaara; the Sun's motion through the rashis gives rashi, sankranti and the solar month; the angle between Moon and Sun gives tithi, paksha and the lunar month. All three streams converge on the panchanga, and from there, a single BS date.",
      )}
    >
      {({ onLabels }) => <CalendarHierarchyScene onLabels={onLabels} lang={lang} copy={copy} />}
    </LearnDiagram3D>
  );
}
