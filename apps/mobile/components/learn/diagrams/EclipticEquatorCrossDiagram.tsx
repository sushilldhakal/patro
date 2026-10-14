/**
 * The celestial equator and the ecliptic are two great circles on the same
 * sphere, crossing at exactly 23.44° (the obliquity) — those two crossings
 * are the equinoxes, and the points farthest apart are the solstices. Native
 * 3D reimagining of web's `EclipticEquatorCross` (unrolled flat plot); Tier 1.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { OrbitPath, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { tFor } from "@vedic-patro/i18n/runtime";

const OBLIQUITY = 23.44;
const R = 0.55;

const MARKS = [
  { lon: 0, get ne() { return tFor("ne", "learn.study.spring_equinox"); }, get en() { return tFor("en", "learn.study.spring_equinox"); }, eq: true },
  { lon: 90, get ne() { return tFor("ne", "learn.study.summer_solstice"); }, get en() { return tFor("en", "learn.study.summer_solstice"); }, eq: false },
  { lon: 180, get ne() { return tFor("ne", "learn.study.autumn_equinox"); }, get en() { return tFor("en", "learn.study.autumn_equinox"); }, eq: true },
  { lon: 270, get ne() { return tFor("ne", "learn.study.winter_solstice"); }, get en() { return tFor("en", "learn.study.winter_solstice"); }, eq: false },
];

function pointOn(ring: readonly (readonly [number, number, number])[], lon: number) {
  const idx = Math.round((lon / 360) * ring.length) % ring.length;
  return ring[idx]!;
}

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; labels: { ne: string; en: string }[] };

const EclipticEquatorCrossScene = memo(function EclipticEquatorCrossScene({ onLabels, labels }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const equator = ellipsePoints(R, 0, 144);
  const eclipticRad = OBLIQUITY * (Math.PI / 180);

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "equator", text: labels[0]!.ne, color: DIAGRAM_LABEL_COLOR.arc, size: 9 }, [R + 0.1, 0, 0]);
    MARKS.forEach((m, i) => {
      const p = pointOn(equator, m.lon);
      const lift = m.eq ? 0 : (m.lon === 90 ? 1 : -1) * Math.sin(eclipticRad) * R * 1.15;
      projector.push({ id: `m-${i}`, text: m.ne, color: m.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal, size: 8 }, [p[0], lift, p[2]]);
    });
    projector.end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projector]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      <OrbitPath points={equator} color={DIAGRAM_COLOR.equator} opacity={0.85} radius={0.006} />
      <group rotation={[eclipticRad, 0, 0]}>
        <OrbitPath points={ellipsePoints(R, 0, 144)} color={DIAGRAM_COLOR.tropical} opacity={0.9} radius={0.006} />
      </group>
      {MARKS.map((m, i) => {
        const eqPoint = pointOn(equator, m.lon);
        const angle = (m.lon / 360) * Math.PI * 2;
        const eclX = R * Math.cos(angle);
        const eclZFlat = R * Math.sin(angle);
        const y = m.eq ? 0 : Math.sin(eclipticRad) * eclZFlat;
        const z = m.eq ? eclZFlat : Math.cos(eclipticRad) * eclZFlat;
        return (
          <mesh key={i} position={[eclX, y, z]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial color={m.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal} />
          </mesh>
        );
      })}
    </>
  );
});

export function EclipticEquatorCrossDiagram() {
  const { t, digits } = useLocale();
  const labels = [{ ne: tFor("ne", "ui.learn.celestial_equator"), en: tFor("en", "ui.learn.celestial_equator") }];

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_where_the_ecliptic_crosses_the")}
      height={250}
      camera={{ yaw: 0.5, pitch: 0.6 }}
      frame={{ width: 1.3, height: 0.75 }}
      idleSpin={0.04}
      legend={[
        { color: DIAGRAM_COLOR.equator, label: t("ui.learn.celestial_equator") },
        { color: DIAGRAM_COLOR.tropical, label: t("ui.learn.ecliptic") },
        { color: DIAGRAM_COLOR.sidereal, label: t("ui.learn.solstices") },
      ]}
      readouts={[
        { k: t("ui.learn.obliquity"), v: `${digits(OBLIQUITY)}°`, tone: "accent" },
        { k: t("ui.learn.equinoxes"), v: `${digits(2)}` },
        { k: t("ui.learn.solstices"), v: `${digits(2)}` },
      ]}
      caption={t("ui.learn.the_ecliptic_and_the_celestial_equator")}
    >
      {({ onLabels }) => <EclipticEquatorCrossScene onLabels={onLabels} labels={labels} />}
    </LearnDiagram3D>
  );
}
