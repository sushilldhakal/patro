/**
 * The Sun's declination (north–south position) across a BS year, drawn as a
 * curve — equinoxes are where it crosses zero fastest, solstices are where
 * it turns around at ±23.44°. Native 3D reimagining of web's
 * `SolarDeclinationYear` (flat SVG curve); Tier 2.
 */
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { OrbitPath } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const EPS = 23.44;
const AYANAMSHA = 24;
const DAYS = 365;
const D2R = Math.PI / 180;
const lambdaAt = (day: number) => AYANAMSHA + (day / DAYS) * 360;
const declAt = (day: number) => (Math.asin(Math.sin(EPS * D2R) * Math.sin(lambdaAt(day) * D2R)) / D2R);
const dayOfLambda = (lambda: number) => (((lambda - AYANAMSHA + 360) % 360) / 360) * DAYS;

const W = 1.2;
const HSCALE = 0.34 / EPS;
const xOf = (day: number) => -W / 2 + (day / DAYS) * W;
const yOf = (deg: number) => deg * HSCALE;

const MARKERS = [
  { lambda: 90, ne: "ग्रीष्म अयनान्त", en: "Summer solstice", eq: false },
  { lambda: 180, ne: "शरद् विषुव", en: "Autumn equinox", eq: true },
  { lambda: 270, ne: "शीत अयनान्त", en: "Winter solstice", eq: false },
  { lambda: 0, ne: "वसन्त विषुव", en: "Spring equinox", eq: true },
];

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void };

const DeclinationYearScene = memo(function DeclinationYearScene({ onLabels }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const curve = useMemo(
    () => Array.from({ length: 121 }, (_, i) => {
      const day = (i / 120) * DAYS;
      return [xOf(day), yOf(declAt(day)), 0] as [number, number, number];
    }),
    [],
  );

  useEffect(() => {
    if (!projector.begin()) return;
    MARKERS.forEach((m, i) => {
      const day = dayOfLambda(m.lambda);
      const deg = declAt(day);
      projector.push(
        { id: `m-${i}`, text: m.ne, color: m.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal, size: 8 },
        [xOf(day), yOf(deg) + (deg >= 0 ? 0.08 : -0.08), 0],
      );
    });
    projector.end();
  }, [projector]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {/* equator + tropics */}
      {[EPS, 0, -EPS].map((d) => (
        <mesh key={d} position={[0, yOf(d), 0]}>
          <boxGeometry args={[W, 0.003, 0.006]} />
          <meshBasicMaterial color={d === 0 ? DIAGRAM_COLOR.equator : DIAGRAM_LABEL_COLOR.dim} transparent opacity={d === 0 ? 0.6 : 0.3} />
        </mesh>
      ))}
      <OrbitPath points={curve} color={DIAGRAM_COLOR.sun} opacity={0.95} radius={0.005} closed={false} />
      {MARKERS.map((m, i) => {
        const day = dayOfLambda(m.lambda);
        const deg = declAt(day);
        return (
          <mesh key={i} position={[xOf(day), yOf(deg), 0.002]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshBasicMaterial color={m.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal} />
          </mesh>
        );
      })}
    </>
  );
});

export function DeclinationYearDiagram() {
  const { t, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_sun_s_declination_across")}
      height={240}
      camera={{ yaw: 0.15, pitch: 0.55 }}
      frame={{ width: 1.5, height: 0.6 }}
      idleSpin={0.02}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: t("ui.learn.sun_s_declination") },
        { color: DIAGRAM_COLOR.tropical, label: t("ui.learn.equinox_zero_crossing") },
        { color: DIAGRAM_COLOR.sidereal, label: t("ui.learn.solstice_turning_point") },
      ]}
      readouts={[
        { k: t("ui.learn.obliquity"), v: `±${digits(EPS)}°`, tone: "accent" },
        { k: t("ui.learn.equinoxes"), v: digits(2) },
        { k: t("ui.learn.solstices"), v: digits(2) },
      ]}
      caption={t("ui.learn.equinoxes_and_solstices_are_different_points")}
    >
      {({ onLabels }) => <DeclinationYearScene onLabels={onLabels} />}
    </LearnDiagram3D>
  );
}
