/**
 * Nine real lit Moon phases across one lunation, split into Shukla (waxing,
 * tithi 1–15) and Krishna (waning, tithi 16–30) paksha. Each sphere gets its
 * own point light positioned at the correct Sun-elongation angle, so the
 * crescent/gibbous shape is genuinely rendered, not drawn. Native 3D
 * reimagining of web's `PakshaStrip` (flat SVG discs); Tier 2.
 */
import { memo } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

import { illustration } from "@vedic-patro/design-tokens";
const N = 9;
const SPAN = 1.1;
const MOON_R = 0.055;

function MoonPhase({ x, f }: { x: number; f: number }) {
  const angle = (f * 360 * Math.PI) / 180;
  const lightR = 1.4;
  const lx = x + lightR * Math.cos(angle);
  const lz = lightR * Math.sin(angle);
  return (
    <group position={[x, 0, 0]}>
      <pointLight position={[lightR * Math.cos(angle), 0, lightR * Math.sin(angle)]} intensity={2.2} distance={0} decay={0} />
      <mesh>
        <sphereGeometry args={[MOON_R, 20, 20]} />
        <meshStandardMaterial color={illustration.sky84} roughness={0.9} />
      </mesh>
    </group>
  );
}

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void };

const PakshaStripScene = memo(function PakshaStripScene({ onLabels: _onLabels }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.12} />
      {Array.from({ length: N }, (_, i) => {
        const f = i / (N - 1);
        const x = -SPAN / 2 + f * SPAN;
        return <MoonPhase key={i} x={x} f={f} />;
      })}
      {/* paksha divider */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.003, 0.14, 0.003]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.5} />
      </mesh>
      <mesh position={[-SPAN / 4, -0.14, 0]}>
        <boxGeometry args={[SPAN / 2 - 0.05, 0.006, 0.006]} />
        <meshBasicMaterial color={illustration.green58} transparent opacity={0.6} />
      </mesh>
      <mesh position={[SPAN / 4, -0.14, 0]}>
        <boxGeometry args={[SPAN / 2 - 0.05, 0.006, 0.006]} />
        <meshBasicMaterial color={illustration.sky68b} transparent opacity={0.6} />
      </mesh>
    </>
  );
});

export function PakshaStripDiagram() {
  const { t, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_pakshas_and_the_moon")}
      height={210}
      camera={{ yaw: 0, pitch: 0.3 }}
      frame={{ width: 1.5, height: 0.4 }}
      idleSpin={0}
      legend={[
        { color: illustration.green58, label: t("ui.learn.shukla_paksha_tithi_1_15") },
        { color: illustration.sky68b, label: t("ui.learn.krishna_paksha_tithi_16_30") },
      ]}
      readouts={[
        { k: t("ui.learn.phases_shown"), v: digits(N) },
        { k: t("ui.learn.one_lunation"), v: `${digits("29.5")} ${t("common.days")}`, tone: "accent" },
      ]}
      caption={t("ui.learn.each_moon_is_lit_from_the")}
    >
      {({ onLabels }) => <PakshaStripScene onLabels={onLabels} />}
    </LearnDiagram3D>
  );
}
