/**
 * Twelve lunar months (354.4 days) fall short of a solar year (365.24 days)
 * by ~10.9 days — and that shortfall compounds every year until it exceeds a
 * full lunar month, which is the whole argument for adhik maas in one
 * picture. Native 3D reimagining of web's `LunarSolarGap` (flat SVG bars);
 * Tier 2.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

import { illustration } from "@vedic-patro/design-tokens";
const SYNODIC = 29.5306;
const LUNAR_YEAR = SYNODIC * 12;
const SOLAR_YEAR = 365.2422;
const DRIFT = SOLAR_YEAR - LUNAR_YEAR;
const YEARS = 3;
const SPAN = SOLAR_YEAR * YEARS;
const SCALE = 1.1 / SPAN;
const rowZ = (i: number) => -0.2 + i * 0.2;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { year: (n: number) => string } };

const LunarSolarGapScene = memo(function LunarSolarGapScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    for (let i = 0; i < YEARS; i++) {
      const z = rowZ(i);
      const solarEnd = SOLAR_YEAR * (i + 1);
      const gap = solarEnd - LUNAR_YEAR * (i + 1);
      projector.push({ id: `row-${i}`, text: copy.year(i + 1), color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [-0.62, 0.05, z]);
      projector.push({ id: `gap-${i}`, text: `+${gap.toFixed(1)}d`, color: DIAGRAM_LABEL_COLOR.warn, size: 8 }, [solarEnd * SCALE - 0.55, 0.05, z]);
    }
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {Array.from({ length: YEARS }, (_, i) => {
        const z = rowZ(i);
        const lunarEnd = LUNAR_YEAR * (i + 1);
        const solarEnd = SOLAR_YEAR * (i + 1);
        const lunarW = lunarEnd * SCALE;
        const solarW = solarEnd * SCALE;
        return (
          <group key={i}>
            <mesh position={[-0.55 + solarW / 2, 0.02, z]}>
              <boxGeometry args={[solarW, 0.03, 0.05]} />
              <meshStandardMaterial color={DIAGRAM_COLOR.sun} transparent opacity={0.4} />
            </mesh>
            <mesh position={[-0.55 + lunarW / 2, -0.01, z]}>
              <boxGeometry args={[lunarW, 0.03, 0.05]} />
              <meshStandardMaterial color={illustration.sky84} transparent opacity={0.45} />
            </mesh>
            <mesh position={[-0.55 + (lunarW + solarW) / 2, 0.005, z]}>
              <boxGeometry args={[solarW - lunarW, 0.06, 0.06]} />
              <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} transparent opacity={0.5} />
            </mesh>
          </group>
        );
      })}
    </>
  );
});

export function LunarSolarGapDiagram() {
  const { t, digits } = useLocale();
  const copy = { year: (n: number) => t("ui.learn.after_n_years", { n: digits(n) }) };

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_lunar_solar_year_gap")}
      height={220}
      camera={{ yaw: 0.1, pitch: 0.65 }}
      frame={{ width: 1.5, height: 0.5 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: t("ui.learn.solar_year") },
        { color: illustration.sky84, label: t("ui.learn.n12_lunar_months") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("ui.learn.accumulated_gap") },
      ]}
      readouts={[
        { k: t("ui.learn.yearly_shortfall"), v: `${digits(DRIFT.toFixed(2))} ${t("common.days")}`, tone: "warn" },
        { k: t("ui.learn.after_3_years"), v: `${digits((DRIFT * 3).toFixed(1))} ${t("common.days")}`, tone: "accent" },
      ]}
      caption={t("ui.learn.twelve_lunar_months_come_to_354")}
    >
      {({ onLabels }) => <LunarSolarGapScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
