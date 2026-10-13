/**
 * Three calendar-year lengths compared by how far each overshoots the true
 * tropical year — a static 3D bar comparison. Native reimagining of web's
 * `YearLengthLadder` (flat SVG bars); Tier 1.
 */
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { useLocale } from "@/lib/i18n";
import { memo, useEffect } from "react";

const ROWS = [
  { ne: "जुलियन वर्ष", en: "Julian year", len: "365.2500", excess: 0.0078, color: DIAGRAM_LABEL_COLOR.warn },
  { ne: "ग्रेगोरियन वर्ष", en: "Gregorian year", len: "365.2425", excess: 0.0003, color: DIAGRAM_COLOR.arc },
  { ne: "साँचो (उष्णकटिबन्धीय) वर्ष", en: "True (tropical) year", len: "365.2422", excess: 0, color: DIAGRAM_LABEL_COLOR.body },
];

const BAR_SCALE = 40;
const MIN_H = 0.01;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void };

const YearLengthLadderScene = memo(function YearLengthLadderScene({ onLabels }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    ROWS.forEach((r, i) => {
      const x = (i - 1) * 0.45;
      projector.push({ id: `row-${i}`, text: r.len, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [x, 0.65, 0]);
    });
    projector.end();
  }, [projector]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0.5, 1.2, 1]} intensity={1.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[1.6, 0.6]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.grid} transparent opacity={0.15} />
      </mesh>
      {ROWS.map((r, i) => {
        const h = Math.max(r.excess * BAR_SCALE, MIN_H);
        const x = (i - 1) * 0.45;
        return (
          <mesh key={r.ne} position={[x, h / 2, 0]}>
            <boxGeometry args={[0.22, h, 0.22]} />
            <meshStandardMaterial color={r.color} />
          </mesh>
        );
      })}
    </>
  );
});

export function YearLengthLadderDiagram() {
  const { t, pick, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_year_length_comparison")}
      height={230}
      camera={{ yaw: 0.5, pitch: 0.4 }}
      frame={{ width: 1.2, height: 0.55 }}
      idleSpin={0.05}
      legend={ROWS.map((r) => ({ color: r.color, label: pick(r.ne, r.en) }))}
      readouts={ROWS.map((r) => ({
        k: pick(r.ne, r.en),
        v: `${digits(r.len)} ${t("common.days")}`,
        tone: r.excess === 0 ? undefined : r.excess > 0.005 ? "warn" : "accent",
      }))}
      caption={t("ui.learn.the_true_tropical_year_is_365")}
    >
      {({ onLabels }) => <YearLengthLadderScene onLabels={onLabels} />}
    </LearnDiagram3D>
  );
}
