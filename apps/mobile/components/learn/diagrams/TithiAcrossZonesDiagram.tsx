/**
 * The same instant, two places, two different tithis — and no disagreement.
 * A tithi ends at one absolute moment for the whole planet; what differs is
 * where each place's sunrise falls relative to it. Native 3D reimagining of
 * web's `TithiAcrossZones` (flat SVG, two timelines); Tier 2.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const PLACES = [
  { ne: "काठमाडौँ", en: "Kathmandu", tz: "UTC+05:45", end: 3.75, rise: 6.17, before: true },
  { ne: "सिड्नी", en: "Sydney", tz: "UTC+11:00", end: 9.0, rise: 6.5, before: false },
];
const L = -0.55;
const Rr = 0.55;
const xOf = (h: number) => L + (h / 12) * (Rr - L);
const rowZ = (i: number) => -0.14 + i * 0.28;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { sunrise: string; before: string; after: string } };

const TithiAcrossZonesScene = memo(function TithiAcrossZonesScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    PLACES.forEach((p, i) => {
      const z = rowZ(i);
      projector.push({ id: `place-${i}`, text: p.ne, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [L - 0.1, 0.05, z]);
      projector.push({ id: `rise-${i}`, text: copy.sunrise, color: DIAGRAM_LABEL_COLOR.rashi, size: 7 }, [xOf(p.rise), 0.1, z]);
      projector.push(
        { id: `res-${i}`, text: p.before ? copy.before : copy.after, color: p.before ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_LABEL_COLOR.rashi, size: 7 },
        [Rr + 0.05, 0.04, z],
      );
    });
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {PLACES.map((p, i) => {
        const z = rowZ(i);
        return (
          <group key={p.ne}>
            <mesh position={[0, 0, z]}>
              <boxGeometry args={[Rr - L, 0.004, 0.006]} />
              <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
            </mesh>
            {/* sunrise */}
            <mesh position={[xOf(p.rise), 0.03, z]}>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
            </mesh>
            {/* the tithi-end boundary, absolute across both rows */}
            <mesh position={[xOf(p.end), 0.02, z]}>
              <boxGeometry args={[0.006, 0.12, 0.02]} />
              <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
            </mesh>
          </group>
        );
      })}
    </>
  );
});

export function TithiAcrossZonesDiagram() {
  const { pick, digits } = useLocale();
  const copy = {
    sunrise: pick("सूर्योदय", "Sunrise"),
    before: pick("तिथि सूर्योदयअघि सकियो", "Tithi ended before sunrise"),
    after: pick("तिथि सूर्योदयपछि सकियो", "Tithi ended after sunrise"),
  };

  return (
    <LearnDiagram3D
      title={pick("३D — एउटै क्षण, दुई ठाउँ, दुई तिथि", "3D — same instant, two places, two tithis")}
      height={230}
      camera={{ yaw: 0.1, pitch: 0.6 }}
      frame={{ width: 1.4, height: 0.6 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: pick("सूर्योदय", "Sunrise") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: pick("तिथि सकिने क्षण (विश्वव्यापी)", "Tithi-end instant (global)") },
      ]}
      readouts={[
        { k: pick("तिथि सकिने क्षण", "Tithi ends"), v: `${digits("22:00")} UTC`, tone: "accent" },
        { k: pick("काठमाडौँ", "Kathmandu"), v: pick("सूर्योदयअघि सकियो", "ended before sunrise"), tone: "warn" },
        { k: pick("सिड्नी", "Sydney"), v: pick("सूर्योदयपछि सकियो", "ended after sunrise") },
      ]}
      caption={pick(
        "तिथि सिंगो पृथ्वीका लागि एउटै क्षणमा सकिन्छ। फरक पर्ने कुरा हो — त्यो क्षण प्रत्येक ठाउँको सूर्योदयको सापेक्ष कहाँ पर्छ। काठमाडौँमा सीमा सूर्योदयअघि पर्छ, त्यसैले त्यो दिनले अर्को तिथि लिन्छ; सिड्नीमा सीमा सूर्योदयपछि पर्छ, त्यसैले त्यो दिनले अघिल्लै तिथि राख्छ। दुवै सही छन् — कारण सूर्योदय नियम हो, खगोलशास्त्रमा भिन्नता होइन।",
        "A tithi ends at one absolute instant for the whole planet. What differs is where that instant falls relative to each place's own sunrise. At Kathmandu the boundary falls before sunrise, so that day takes the next tithi; at Sydney it falls after sunrise, so that day keeps the earlier one. Both are correct — the reason is the sunrise rule, not a difference in the astronomy.",
      )}
    >
      {({ onLabels }) => <TithiAcrossZonesScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
