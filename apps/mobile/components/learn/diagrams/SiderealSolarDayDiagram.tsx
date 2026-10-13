/**
 * Why a solar day is ~4 minutes longer than a sidereal rotation. Earth turns
 * once in 23h56m relative to a star infinitely far away — but in that time
 * it has also moved ~1° along its orbit, so it must turn that extra 1° to
 * bring the Sun back overhead. Native 3D reimagining of web's
 * `SiderealSolarDay` (two-panel flat SVG); Tier 1.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { AngleArc, Ray, ellipsePoints, OrbitPath } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

/* The real extra turn is ~1°, invisible at any honest scale — shown
   exaggerated at 20° so the leftover angle actually reads, same choice web's
   SVG version made (its caption says the drawing is exaggerated too). */
const SHOWN = 20;
const ORBIT_R = 0.55;
const EARTH_R = 0.09;
const P0 = [ORBIT_R, 0, 0] as const;
function orbitPoint(deg: number): [number, number, number] {
  const a = (deg * Math.PI) / 180;
  return [ORBIT_R * Math.cos(a), 0, ORBIT_R * Math.sin(a)];
}
const P1 = orbitPoint(SHOWN);

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { start: string; after: string; sun: string; leftover: string } };

const SiderealSolarDayScene = memo(function SiderealSolarDayScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun, size: 10 }, [0, 0.14, 0]);
    projector.push({ id: "p0", text: copy.start, color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [P0[0], -0.12, P0[2]]);
    projector.push({ id: "p1", text: copy.after, color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [P1[0], -0.12, P1[2]]);
    projector.push({ id: "leftover", text: copy.leftover, color: DIAGRAM_LABEL_COLOR.warn, size: 8 }, [P1[0] * 1.35, 0.1, P1[2] * 1.35]);
    projector.end();
  }, [projector, copy]);

  const orbitArc = ellipsePoints(ORBIT_R, 0, 48).slice(0, 13);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={2.2} />
      <mesh>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
      </mesh>
      <OrbitPath points={orbitArc} color={DIAGRAM_COLOR.orbit} opacity={0.5} radius={0.005} closed={false} />

      {/* Earth at the start of the day */}
      <mesh position={P0}>
        <sphereGeometry args={[EARTH_R, 18, 18]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <Ray from={P0} to={[0, 0, 0]} color={DIAGRAM_COLOR.ray} opacity={0.35} radius={0.004} />

      {/* Earth after one full sidereal rotation — has moved SHOWN° around the orbit */}
      <mesh position={P1}>
        <sphereGeometry args={[EARTH_R, 18, 18]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <Ray from={P1} to={[0, 0, 0]} color={DIAGRAM_COLOR.ray} opacity={0.6} radius={0.005} />
      {/* the leftover angle Earth must still turn to face the Sun again */}
      <AngleArc radius={EARTH_R * 1.6} fromDeg={SHOWN + 180} spanDeg={-SHOWN} color={DIAGRAM_LABEL_COLOR.warn} thickness={0.008} opacity={0.9} y={0.001} />
    </>
  );
});

export function SiderealSolarDayDiagram() {
  const { t, digits } = useLocale();
  const copy = {
    start: t("ui.common.start"),
    after: t("ui.learn.after_1_sidereal_rotation"),
    sun: t("kundali.report.meta_sun"),
    leftover: t("ui.learn.n1_still_to_go"),
  };

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_sidereal_day_vs_solar_day")}
      height={250}
      camera={{ yaw: 0.5, pitch: 0.6 }}
      frame={{ width: 1.2, height: 0.75 }}
      idleSpin={0.03}
      legend={[
        { color: DIAGRAM_COLOR.earth, label: t("ui.learn.earth_at_two_positions") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("ui.learn.leftover_angle_exaggerated") },
      ]}
      readouts={[
        { k: t("learn.playground.sidereal_day"), v: "23h 56m 4s" },
        { k: t("ui.learn.solar_day"), v: "24h 00m", tone: "accent" },
        { k: t("ui.learn.extra_rotation"), v: `~1° ≈ ~${digits(4)} ${t("common.minutes")}`, tone: "warn" },
      ]}
      caption={t("ui.learn.earth_turns_once_on_its_axis")}
    >
      {({ onLabels }) => <SiderealSolarDayScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
