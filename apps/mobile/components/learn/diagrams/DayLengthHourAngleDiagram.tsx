/**
 * Day length is 2H — the hour angle from the sunrise equation is half a day,
 * so sunrise sits at noon−H and sunset at noon+H. Two bands (summer/winter
 * at Kathmandu's latitude) show H changing with the season. Native 3D
 * reimagining of web's `DayLengthHourAngle` (flat SVG bands); Tier 1.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const ROWS = [
  { ne: "ग्रीष्म अयनान्त", en: "Summer solstice", h: 6.92, len: "~13h 50m", color: DIAGRAM_COLOR.sun, z: -0.18 },
  { ne: "शीत अयनान्त", en: "Winter solstice", h: 5.21, len: "~10h 25m", color: DIAGRAM_COLOR.equator, z: 0.18 },
];
const PX_PER_HOUR = 0.09;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { noon: string; sunrise: string; sunset: string } };

const DayLengthHourAngleScene = memo(function DayLengthHourAngleScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "noon", text: copy.noon, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [0, 0.18, 0]);
    ROWS.forEach((r, i) => {
      projector.push({ id: `rise-${i}`, text: copy.sunrise, color: DIAGRAM_LABEL_COLOR.dim, size: 8 }, [-r.h * PX_PER_HOUR, 0.05, r.z]);
      projector.push({ id: `set-${i}`, text: copy.sunset, color: DIAGRAM_LABEL_COLOR.dim, size: 8 }, [r.h * PX_PER_HOUR, 0.05, r.z]);
    });
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.006, 0.3, 0.5]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} transparent opacity={0.6} />
      </mesh>
      {ROWS.map((r) => {
        const w = r.h * PX_PER_HOUR * 2;
        return (
          <group key={r.ne} position={[0, 0, r.z]}>
            <mesh>
              <boxGeometry args={[w, 0.05, 0.1]} />
              <meshStandardMaterial color={r.color} transparent opacity={0.55} />
            </mesh>
            <mesh position={[-w / 2, 0, 0]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshBasicMaterial color={r.color} />
            </mesh>
            <mesh position={[w / 2, 0, 0]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshBasicMaterial color={r.color} />
            </mesh>
          </group>
        );
      })}
    </>
  );
});

export function DayLengthHourAngleDiagram() {
  const { pick, digits } = useLocale();
  const copy = { noon: pick("स्थानीय मध्याह्न", "Local noon"), sunrise: pick("सूर्योदय", "Sunrise"), sunset: pick("सूर्यास्त", "Sunset") };

  return (
    <LearnDiagram3D
      title={pick("३D — दिनमान = 2H", "3D — day length = 2H")}
      height={220}
      camera={{ yaw: 0.2, pitch: 0.6 }}
      frame={{ width: 1.4, height: 0.5 }}
      idleSpin={0}
      legend={ROWS.map((r) => ({ color: r.color, label: pick(`${r.ne} — ${r.len}`, `${r.en} — ${r.len}`) }))}
      readouts={ROWS.map((r) => ({
        k: pick(r.ne, r.en),
        v: `${pick("H", "H")} ≈ ${digits(r.h.toFixed(2))}h → 2H = ${r.len}`,
      }))}
      caption={pick(
        "सूर्योदय समीकरणबाट आउने घण्टा-कोण H दिनको आधा हो — स्थानीय मध्याह्न बीचमा, सूर्योदय मध्याह्न−H मा, सूर्यास्त मध्याह्न+H मा पर्छ। त्यसैले दिनमान ठ्याक्कै 2H हुन्छ। काठमाडौँको अक्षांशमा ग्रीष्म अयनान्तमा H ठूलो (लामो दिन), शीत अयनान्तमा सानो (छोटो दिन)।",
        "The hour angle H from the sunrise equation is half a day — local noon sits in the middle, sunrise at noon−H, sunset at noon+H. So day length is exactly 2H. At Kathmandu's latitude, H is large at the summer solstice (long day) and small at the winter solstice (short day).",
      )}
    >
      {({ onLabels }) => <DayLengthHourAngleScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
