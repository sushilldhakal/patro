/**
 * Why eclipses cluster a couple of weeks apart, near a node — a ~34-day
 * eclipse-season window can contain both a new moon (solar eclipse) and a
 * full moon (lunar eclipse). Native 3D reimagining of web's
 * `EclipseSeasonWindow` (flat SVG timeline); Tier 2.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const WINDOW_DAYS = 34;
const NEW_MOON_DAY = 9;
const FULL_MOON_DAY = 23;
const L = -0.58;
const Rr = 0.58;
const xOf = (d: number) => L + (d / WINDOW_DAYS) * (Rr - L);

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { newMoon: string; fullMoon: string; solar: string; lunar: string; window: string } };

const EclipseSeasonWindowScene = memo(function EclipseSeasonWindowScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "window", text: copy.window, color: DIAGRAM_LABEL_COLOR.warn, size: 8 }, [0, 0.16, 0]);
    projector.push({ id: "new", text: `${copy.newMoon} — ${copy.solar}`, color: DIAGRAM_LABEL_COLOR.dim, size: 8 }, [xOf(NEW_MOON_DAY), -0.12, 0]);
    projector.push({ id: "full", text: `${copy.fullMoon} — ${copy.lunar}`, color: DIAGRAM_LABEL_COLOR.dim, size: 8 }, [xOf(FULL_MOON_DAY), -0.12, 0]);
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {/* the eclipse-season window */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[Rr - L, 0.08, 0.06]} />
        <meshStandardMaterial color={DIAGRAM_LABEL_COLOR.warn} transparent opacity={0.25} />
      </mesh>
      {[L, Rr].map((v, i) => (
        <mesh key={i} position={[v, 0.06, 0]}>
          <boxGeometry args={[0.006, 0.1, 0.06]} />
          <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
        </mesh>
      ))}
      {/* new moon (dark) */}
      <mesh position={[xOf(NEW_MOON_DAY), 0.06, 0]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={"#1b2430"} />
      </mesh>
      {/* full moon (lit) */}
      <mesh position={[xOf(FULL_MOON_DAY), 0.06, 0]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={"#e8eef6"} emissive={"#e8eef6"} emissiveIntensity={0.3} />
      </mesh>
    </>
  );
});

export function EclipseSeasonWindowDiagram() {
  const { pick, digits } = useLocale();
  const copy = {
    newMoon: pick("औंसी", "New moon"),
    fullMoon: pick("पूर्णिमा", "Full moon"),
    solar: pick("सूर्यग्रहण", "Solar eclipse"),
    lunar: pick("चन्द्रग्रहण", "Lunar eclipse"),
    window: pick("ग्रहण ऋतु — करिब ३४ दिन", "Eclipse season — about 34 days"),
  };

  return (
    <LearnDiagram3D
      title={pick("३D — ग्रहण ऋतुको झ्याल", "3D — the eclipse-season window")}
      height={210}
      camera={{ yaw: 0, pitch: 0.5 }}
      frame={{ width: 1.4, height: 0.4 }}
      idleSpin={0}
      legend={[
        { color: "#1b2430", label: pick("औंसी → सूर्यग्रहणको सम्भावना", "New moon → possible solar eclipse") },
        { color: "#e8eef6", label: pick("पूर्णिमा → चन्द्रग्रहणको सम्भावना", "Full moon → possible lunar eclipse") },
      ]}
      readouts={[
        { k: pick("झ्यालको लम्बाइ", "Window length"), v: `~${digits(34)} ${pick("दिन", "days")}`, tone: "accent" },
        { k: pick("औंसी–पूर्णिमा अन्तर", "New-to-full gap"), v: `${digits(FULL_MOON_DAY - NEW_MOON_DAY)} ${pick("दिन", "days")}` },
      ]}
      caption={pick(
        "जब पात रेखा (राहु–केतु) सूर्यको नजिक पर्छ, त्यसको वरिपरि करिब ३४ दिनको एउटा \"ग्रहण ऋतु\" खुल्छ — यो झ्याल एउटा चान्द्र मासभन्दा अलि लामो भएकाले भित्र प्रायः एउटा औंसी (सूर्यग्रहणको सम्भावना दिने) र एउटा पूर्णिमा (चन्द्रग्रहणको सम्भावना दिने) दुवै पर्छन्, लगभग दुई हप्ता छाडेर।",
        "When the line of nodes (Rahu–Ketu) is near the Sun, an \"eclipse season\" of about 34 days opens around it. Because this window runs slightly longer than a lunar month, it usually contains both a new moon (a possible solar eclipse) and a full moon (a possible lunar eclipse), roughly two weeks apart.",
      )}
    >
      {({ onLabels }) => <EclipseSeasonWindowScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
