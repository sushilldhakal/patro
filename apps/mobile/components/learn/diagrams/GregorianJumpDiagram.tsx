/**
 * The ten missing days of October 1582 — and how long other countries kept
 * using the Julian calendar after Rome switched. Native 3D reimagining of
 * web's `GregorianJump` (flat SVG date tiles); Tier 1.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { tFor } from "@vedic-patro/i18n/runtime";

const BEFORE = [1, 2, 3, 4];
const AFTER = [15, 16, 17, 18];
const ADOPTERS = [
  { get ne() { return tFor("ne", "ui.learn.italy_spain_portugal"); }, get en() { return tFor("en", "ui.learn.italy_spain_portugal"); }, year: 1582, days: 10 },
  { get ne() { return tFor("ne", "learn.diagrams.country_britain"); }, get en() { return tFor("en", "learn.diagrams.country_britain"); }, year: 1752, days: 11 },
  { get ne() { return tFor("ne", "learn.diagrams.country_russia"); }, get en() { return tFor("en", "learn.diagrams.country_russia"); }, year: 1918, days: 13 },
  { get ne() { return tFor("ne", "learn.diagrams.country_greece"); }, get en() { return tFor("en", "learn.diagrams.country_greece"); }, year: 1923, days: 13 },
];

const TILE = 0.16;
const GAP = 0.1;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; digits: (v: string | number) => string };

const GregorianJumpScene = memo(function GregorianJumpScene({ onLabels, digits }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const all = [...BEFORE.map((d) => ({ d, jump: false })), ...AFTER.map((d) => ({ d, jump: true }))];

  useEffect(() => {
    if (!projector.begin()) return;
    let x = -((all.length - 1) * TILE + GAP) / 2;
    all.forEach((t, i) => {
      if (i > 0 && t.jump && !all[i - 1]!.jump) x += GAP;
      projector.push({ id: `d-${i}`, text: digits(t.d), color: DIAGRAM_LABEL_COLOR.body, size: 10 }, [x, 0.16, 0]);
      x += TILE;
    });
    projector.end();
  }, [projector, digits]);

  let x = -((all.length - 1) * TILE + GAP) / 2;
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 1.2, 1]} intensity={1.2} />
      {all.map((t, i) => {
        if (i > 0 && t.jump && !all[i - 1]!.jump) x += GAP;
        const tileX = x;
        x += TILE;
        return (
          <mesh key={i} position={[tileX, 0, 0]}>
            <boxGeometry args={[TILE * 0.82, 0.06, TILE * 0.82]} />
            <meshStandardMaterial color={t.jump ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_COLOR.orbit} />
          </mesh>
        );
      })}
    </>
  );
});

export function GregorianJumpDiagram() {
  const { t, pick, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_10_lost_days_of")}
      height={220}
      camera={{ yaw: 0, pitch: 0.6 }}
      frame={{ width: 1.3, height: 0.4 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.orbit, label: t("ui.learn.julian_date") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("ui.learn.gregorian_date_weekday_unbroken") },
      ]}
      readouts={ADOPTERS.map((a) => ({
        k: pick(a.ne, a.en),
        v: t("ui.learn.year_days_days", { year: digits(a.year), days: digits(a.days) }),
      }))}
      caption={t("ui.learn.pope_gregory_xiii_decreed_that_october")}
    >
      {({ onLabels }) => <GregorianJumpScene onLabels={onLabels} digits={digits} />}
    </LearnDiagram3D>
  );
}
