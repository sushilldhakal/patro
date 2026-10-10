/**
 * The zodiac is a belt, not a line — the Sun sits exactly on the ecliptic
 * (0° latitude by definition), but the Moon wanders ±5.1° and the visible
 * grahas up to ±7°, so the "rashi belt" has to be wide enough to hold all of
 * them. Native 3D reimagining of web's `ZodiacBeltWidth`; Tier 1.
 */
import { memo, useEffect } from "react";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { EclipticPlane, OrbitPath, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const R = 0.55;
const BODIES = [
  { lat: 0, ne: "सूर्य", en: "Sun", color: DIAGRAM_COLOR.sun },
  { lat: 5.1, ne: "चन्द्र", en: "Moon", color: "#cbd5e1" },
  { lat: 7.0, ne: "बुध", en: "Mercury", color: "#10b981" },
];
type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void };

const ZodiacBeltWidthScene = memo(function ZodiacBeltWidthScene({ onLabels }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    BODIES.forEach((b, i) => {
      const y = (b.lat / 9) * 0.22;
      projector.push({ id: `b-${i}`, text: `${b.ne === "सूर्य" ? "" : "±"}${b.lat}° ${b.ne}`, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [R + 0.12, y, 0]);
    });
    projector.push({ id: "belt", text: "±9°", color: DIAGRAM_LABEL_COLOR.rashi, size: 9 }, [0, 0.26, R + 0.05]);
    projector.end();
  }, [projector]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      <EclipticPlane radius={R * 1.25} opacity={0.05} />
      {/* the ±9° belt that has to contain everything */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.82, R * 1.18, 64]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sidereal} transparent opacity={0.14} side={THREE.DoubleSide} />
      </mesh>
      {BODIES.map((b) => {
        const tiltRad = b.lat * (Math.PI / 180);
        return (
          <group key={b.ne} rotation={[tiltRad, 0, 0]}>
            <OrbitPath points={ellipsePoints(R, 0, 96)} color={b.color} opacity={b.lat === 0 ? 0.95 : 0.6} radius={b.lat === 0 ? 0.007 : 0.005} />
          </group>
        );
      })}
    </>
  );
});

export function ZodiacBeltWidthDiagram() {
  const { pick, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={pick("३D — राशि पट्टीको चौडाइ", "3D — why the zodiac has width")}
      height={250}
      camera={{ yaw: 0.6, pitch: 0.65 }}
      frame={{ width: 1.3, height: 0.75 }}
      idleSpin={0.04}
      legend={BODIES.map((b) => ({ color: b.color, label: pick(b.ne, b.en) }))}
      readouts={[
        { k: pick("सूर्यको अक्षांश", "Sun's latitude"), v: "0°", tone: "accent" },
        { k: pick("चन्द्रको अक्षांश", "Moon's latitude"), v: `±${digits("5.1")}°` },
        { k: pick("बुधको अक्षांश", "Mercury's latitude"), v: `±${digits(7)}°`, tone: "warn" },
        { k: pick("राशि पट्टीको चौडाइ", "Belt width needed"), v: `±${digits(9)}°` },
      ]}
      caption={pick(
        "सूर्य परिभाषाले नै क्रान्तिवृत्तको ठ्याक्कै ०° अक्षांशमा हुन्छ — त्यो रेखाले नै क्रान्तिवृत्त तय गर्छ। चन्द्र त्यो रेखाबाट ±५.१° सम्म तर्किन्छ, र दृश्य ग्रहहरू केहीले ±७° सम्म। सबैलाई अटाउन राशि पट्टी क्रान्तिवृत्तको दुवैतर्फ लगभग ९° चौडा हुनुपर्छ।",
        "The Sun sits by definition exactly at 0° latitude — that line is the ecliptic. The Moon wanders up to ±5.1° from it, and some visible grahas up to ±7°. To hold all of them, the rashi belt has to run about 9° wide on either side of the ecliptic.",
      )}
    >
      {({ onLabels }) => <ZodiacBeltWidthScene onLabels={onLabels} />}
    </LearnDiagram3D>
  );
}
