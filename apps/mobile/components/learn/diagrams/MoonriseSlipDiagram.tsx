/**
 * Moonrise slips about 50 minutes later each civil day — the Moon has moved
 * ~13° along its own orbit while Earth turned. Slide an event 50 minutes
 * later against a 24-hour grid and, with no extra rule, some days get two
 * moonrises and some get none. Native 3D reimagining of web's
 * `MoonriseSlip` (flat SVG timeline); Tier 1.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

import { illustration } from "@vedic-patro/design-tokens";
/* Successive moonrises are ~24h50m apart — always more than a civil day, so a
   day can miss out entirely but two can never land inside one. */
const DAYS = [
  { d: 1, rises: [22.67] },
  { d: 2, rises: [23.5] },
  { d: 3, rises: [] as number[] },
  { d: 4, rises: [0.33] },
  { d: 5, rises: [1.17] },
];
const L = -0.6;
const Rr = 0.6;
const rowZ = (i: number) => -0.32 + i * 0.16;
const xOf = (h: number) => L + (h / 24) * (Rr - L);

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { day: string; none: string } };

const MoonriseSlipScene = memo(function MoonriseSlipScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    DAYS.forEach((row, i) => {
      const z = rowZ(i);
      projector.push({ id: `day-${i}`, text: `${copy.day} ${row.d}`, color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [L - 0.08, 0.04, z]);
      if (row.rises.length === 0) {
        projector.push({ id: `none-${i}`, text: copy.none, color: DIAGRAM_LABEL_COLOR.warn, size: 8 }, [0, 0.04, z]);
      }
    });
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {[0, 6, 12, 18, 24].map((h) => (
        <mesh key={h} position={[xOf(h), 0, 0]}>
          <boxGeometry args={[0.004, 0.02, 0.72]} />
          <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
        </mesh>
      ))}
      {DAYS.map((row, i) => {
        const z = rowZ(i);
        return (
          <group key={row.d}>
            <mesh position={[0, 0, z]}>
              <boxGeometry args={[Rr - L, 0.003, 0.006]} />
              <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.35} />
            </mesh>
            {row.rises.map((h) => (
              <mesh key={h} position={[xOf(h), 0.03, z]}>
                <sphereGeometry args={[0.028, 14, 14]} />
                <meshStandardMaterial color={illustration.sky84} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
});

export function MoonriseSlipDiagram() {
  const { t, digits } = useLocale();
  const copy = { day: t("panchanga.view_day"), none: t("ui.learn.no_moonrise_this_day") };

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_moonrise_slipping_later")}
      height={240}
      camera={{ yaw: 0.15, pitch: 0.75 }}
      frame={{ width: 1.4, height: 0.7 }}
      idleSpin={0}
      legend={[
        { color: illustration.sky84, label: t("ui.learn.moonrise_time") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("ui.learn.day_with_no_moonrise") },
      ]}
      readouts={[
        { k: t("ui.learn.daily_slip"), v: `~${digits(50)} ${t("common.minutes")}`, tone: "accent" },
        { k: t("ui.learn.day_3"), v: t("ui.learn.no_moonrise"), tone: "warn" },
      ]}
      caption={t("ui.learn.the_moon_rises_about_50_minutes")}
    >
      {({ onLabels }) => <MoonriseSlipScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
