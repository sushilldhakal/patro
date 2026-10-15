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

import { midnight, wheel } from "@vedic-patro/design-tokens";
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
        <meshStandardMaterial color={midnight.card} />
      </mesh>
      {/* full moon (lit) */}
      <mesh position={[xOf(FULL_MOON_DAY), 0.06, 0]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={wheel.ink} emissive={wheel.ink} emissiveIntensity={0.3} />
      </mesh>
    </>
  );
});

export function EclipseSeasonWindowDiagram() {
  const { t, digits } = useLocale();
  const copy = {
    newMoon: t("ui.learn.new_moon"),
    fullMoon: t("ui.learn.full_moon"),
    solar: t("learn.study.eclipse.status_solar"),
    lunar: t("ui.learn.lunar_eclipse"),
    window: t("ui.learn.eclipse_season_about_34_days"),
  };

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_eclipse_season_window")}
      height={210}
      camera={{ yaw: 0, pitch: 0.5 }}
      frame={{ width: 1.4, height: 0.4 }}
      idleSpin={0}
      legend={[
        { color: midnight.card, label: t("ui.learn.new_moon_possible_solar_eclipse") },
        { color: wheel.ink, label: t("ui.learn.full_moon_possible_lunar_eclipse") },
      ]}
      readouts={[
        { k: t("ui.learn.window_length"), v: `~${digits(34)} ${t("common.days")}`, tone: "accent" },
        { k: t("ui.learn.new_to_full_gap"), v: `${digits(FULL_MOON_DAY - NEW_MOON_DAY)} ${t("common.days")}` },
      ]}
      caption={t("ui.learn.when_the_line_of_nodes_rahu")}
    >
      {({ onLabels }) => <EclipseSeasonWindowScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
