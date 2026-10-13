/**
 * Two rulers around the same sky: the tropical zero (the equinox) and the
 * sidereal zero (the true Mesha star-cluster), offset by the ayanamsha.
 * Native 3D reimagining of web's `TwoZeroPoints` (dual flat ruler); Tier 1.
 */
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { AngleArc, OrbitPath, RashiRing, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const AYAN = 24;
const R_OUT = 0.62;
const R_IN = 0.44;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { tropical: string; sidereal: string; gap: string } };

const TwoZeroPointsScene = memo(function TwoZeroPointsScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const tropicalRing = useMemo(() => ellipsePoints(R_OUT, 0, 96), []);
  const sidPoint = useMemo(() => {
    const a = -AYAN * (Math.PI / 180);
    return [R_IN * Math.cos(a), 0, R_IN * Math.sin(a)] as [number, number, number];
  }, []);

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "tropical", text: copy.tropical, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [R_OUT, 0.05, 0]);
    projector.push({ id: "sidereal", text: copy.sidereal, color: DIAGRAM_LABEL_COLOR.arc, size: 9 }, [sidPoint[0], 0.05, sidPoint[2]]);
    projector.push({ id: "gap", text: copy.gap, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [(R_OUT + R_IN) / 2, 0.09, R_IN * 0.35]);
    projector.end();
  }, [projector, copy, sidPoint]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      <RashiRing inner={R_IN * 0.86} outer={R_IN} opacity={0.5} />
      <OrbitPath points={tropicalRing} color={DIAGRAM_COLOR.tropical} opacity={0.85} radius={0.006} />
      {/* the ayanamsha gap between the two zero points */}
      <AngleArc radius={(R_OUT + R_IN) / 2} fromDeg={-AYAN} spanDeg={AYAN} color={DIAGRAM_LABEL_COLOR.warn} thickness={0.01} opacity={0.7} />
      <mesh position={[R_OUT, 0.01, 0]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
      </mesh>
      <mesh position={sidPoint}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sidereal} />
      </mesh>
    </>
  );
});

export function TwoZeroPointsDiagram() {
  const { t, digits } = useLocale();
  const copy = {
    tropical: t("ui.learn.tropical_zero_equinox"),
    sidereal: t("ui.learn.sidereal_zero_mesha_star"),
    gap: t("kundali.ayanamsha"),
  };

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_two_zero_points")}
      height={250}
      camera={{ yaw: 0.3, pitch: 0.85 }}
      frame={{ width: 1.3, height: 0.75 }}
      idleSpin={0.04}
      legend={[
        { color: DIAGRAM_COLOR.tropical, label: t("ui.learn.tropical_season_based") },
        { color: DIAGRAM_COLOR.sidereal, label: t("ui.learn.sidereal_star_based") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("ui.learn.ayanamsha_gap") },
      ]}
      readouts={[
        { k: t("kundali.ayanamsha"), v: `${digits(AYAN)}°`, tone: "warn" },
        { k: t("ui.learn.in_days"), v: `~${digits(24)}` },
      ]}
      caption={t("ui.learn.the_outer_green_line_is_the")}
    >
      {({ onLabels }) => <TwoZeroPointsScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
