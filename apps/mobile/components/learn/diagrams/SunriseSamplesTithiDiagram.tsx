/**
 * The panchanga samples the sky once a day, at sunrise. A tithi can begin
 * and end at any hour, but the rule reads whichever tithi is running at
 * sunrise and gives the whole day that name. Native 3D reimagining of web's
 * `SunriseSamplesTithi` (flat SVG strip); Tier 2.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const BOUNDARY_H = 4.5;
const SUNRISE_H = 6.17;
const L = -0.62;
const Rr = 0.62;
const xOf = (h: number) => L + (h / 24) * (Rr - L);

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { tritiya: string; chaturthi: string; changed: string; sunrise: string } };

const SunriseSamplesTithiScene = memo(function SunriseSamplesTithiScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "tritiya", text: copy.tritiya, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [(L + xOf(BOUNDARY_H)) / 2, 0.09, 0]);
    projector.push({ id: "chaturthi", text: copy.chaturthi, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [(xOf(BOUNDARY_H) + Rr) / 2, 0.09, 0]);
    projector.push({ id: "changed", text: copy.changed, color: DIAGRAM_LABEL_COLOR.warn, size: 8 }, [xOf(BOUNDARY_H), 0.18, 0]);
    projector.push({ id: "sunrise", text: copy.sunrise, color: DIAGRAM_LABEL_COLOR.rashi, size: 8 }, [xOf(SUNRISE_H), -0.16, 0]);
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {[0, 6, 12, 18, 24].map((h) => (
        <mesh key={h} position={[xOf(h), 0, 0]}>
          <boxGeometry args={[0.004, 0.02, 0.28]} />
          <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
        </mesh>
      ))}
      {/* the two tithi segments */}
      <mesh position={[(L + xOf(BOUNDARY_H)) / 2, 0, 0]}>
        <boxGeometry args={[xOf(BOUNDARY_H) - L, 0.05, 0.24]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.orbit} transparent opacity={0.4} />
      </mesh>
      <mesh position={[(xOf(BOUNDARY_H) + Rr) / 2, 0, 0]}>
        <boxGeometry args={[Rr - xOf(BOUNDARY_H), 0.05, 0.24]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.arc} transparent opacity={0.4} />
      </mesh>
      {/* the tithi boundary */}
      <mesh position={[xOf(BOUNDARY_H), 0.02, 0]}>
        <boxGeometry args={[0.006, 0.14, 0.3]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
      </mesh>
      {/* the sampling instant */}
      <mesh position={[xOf(SUNRISE_H), 0.05, 0]}>
        <sphereGeometry args={[0.03, 14, 14]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
      </mesh>
    </>
  );
});

export function SunriseSamplesTithiDiagram() {
  const { pick, digits } = useLocale();
  const copy = {
    tritiya: pick("तृतीया", "Tritiya"),
    chaturthi: pick("चतुर्थी", "Chaturthi"),
    changed: pick("तिथि बदलियो ०४:३०", "Tithi changes 04:30"),
    sunrise: pick("सूर्योदय ०५:४५", "Sunrise 05:45"),
  };

  return (
    <LearnDiagram3D
      title={pick("३D — सूर्योदयमै तिथि नमुना", "3D — the panchanga samples tithi at sunrise")}
      height={220}
      camera={{ yaw: 0, pitch: 0.55 }}
      frame={{ width: 1.4, height: 0.45 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.orbit, label: pick("अघिल्लो तिथि", "Earlier tithi") },
        { color: DIAGRAM_COLOR.arc, label: pick("पछिल्लो तिथि", "Later tithi") },
        { color: DIAGRAM_COLOR.sun, label: pick("सूर्योदय — नमुना लिने क्षण", "Sunrise — the sampling instant") },
      ]}
      readouts={[
        { k: pick("तिथि परिवर्तन", "Tithi boundary"), v: digits("04:30") },
        { k: pick("सूर्योदय", "Sunrise"), v: digits("05:45"), tone: "accent" },
        { k: pick("त्यो दिनको तिथि", "That day's tithi"), v: pick("चतुर्थी", "Chaturthi"), tone: "warn" },
      ]}
      caption={pick(
        "तिथि दिनको जुनसुकै समयमा सुरु वा सकिन सक्छ, तर पात्रोले दिनको एउटै लेबल चाहिन्छ। यहाँ तिथि ०४:३० मा बद्लिन्छ — सूर्योदयभन्दा (०५:४५) अघि — त्यसैले सूर्योदयमा चलिरहेको तिथि चतुर्थी नै त्यो दिनको तिथि हुन्छ, तृतीया एक क्षण पनि दिन पाउँदैन।",
        "A tithi can begin and end at any hour, but the calendar needs one label per day. Here the tithi changes at 04:30 — before sunrise (05:45) — so the tithi running at sunrise, Chaturthi, is the one that day gets; Tritiya never gets a day of its own.",
      )}
    >
      {({ onLabels }) => <SunriseSamplesTithiScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
