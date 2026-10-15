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

import { illustration } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
const R = 0.55;
const BODIES = [
  { lat: 0, get ne() { return tFor("ne", "kundali.report.meta_sun"); }, get en() { return tFor("en", "kundali.report.meta_sun"); }, color: DIAGRAM_COLOR.sun },
  { lat: 5.1, get ne() { return tFor("ne", "kundali.graha_name_moon"); }, get en() { return tFor("en", "kundali.graha_name_moon"); }, color: illustration.sky84 },
  { lat: 7.0, get ne() { return tFor("ne", "kundali.graha_name_mercury"); }, get en() { return tFor("en", "kundali.graha_name_mercury"); }, color: illustration.teal39 },
];
type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void };

const ZodiacBeltWidthScene = memo(function ZodiacBeltWidthScene({ onLabels }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    BODIES.forEach((b, i) => {
      const y = (b.lat / 9) * 0.22;
      projector.push({ id: `b-${i}`, text: `${b.ne === /* copy-ok */ "सूर्य" ? "" : "±"}${b.lat}° ${b.ne}`, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [R + 0.12, y, 0]);
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
  const { t, pick, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_why_the_zodiac_has_width")}
      height={250}
      camera={{ yaw: 0.6, pitch: 0.65 }}
      frame={{ width: 1.3, height: 0.75 }}
      idleSpin={0.04}
      legend={BODIES.map((b) => ({ color: b.color, label: pick(b.ne, b.en) }))}
      readouts={[
        { k: t("ui.learn.sun_s_latitude"), v: "0°", tone: "accent" },
        { k: t("ui.learn.moon_s_latitude"), v: `±${digits("5.1")}°` },
        { k: t("ui.learn.mercury_s_latitude"), v: `±${digits(7)}°`, tone: "warn" },
        { k: t("ui.learn.belt_width_needed"), v: `±${digits(9)}°` },
      ]}
      caption={t("ui.learn.the_sun_sits_by_definition_exactly")}
    >
      {({ onLabels }) => <ZodiacBeltWidthScene onLabels={onLabels} />}
    </LearnDiagram3D>
  );
}
