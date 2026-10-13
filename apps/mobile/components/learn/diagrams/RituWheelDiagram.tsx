/**
 * The six ṛtu as a ring against the twelve BS months and the four tropical
 * (sāyana) markers — the spokes deliberately don't land on ṛtu boundaries,
 * because one ruler is tied to the stars and the other to the seasons.
 * Native 3D reimagining of web's `RituWheel`; Tier 2.
 */
import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

import { illustration } from "@vedic-patro/design-tokens";
const AYANAMSHA = 24;
const R_OUT = 0.58;
const R_MID = 0.46;

const RITUS = [
  { ne: "वसन्त", en: "Vasanta", color: illustration.green55 },
  { ne: "ग्रीष्म", en: "Grishma", color: illustration.orange53b },
  { ne: "वर्षा", en: "Varsha", color: illustration.sky54 },
  { ne: "शरद्", en: "Sharad", color: illustration.amber45 },
  { ne: "हेमन्त", en: "Hemanta", color: illustration.sky65 },
  { ne: "शिशिर", en: "Shishira", color: illustration.sky74 },
];
const MONTHS_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
const MONTHS_EN = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const MARKERS = [
  { lambda: 90, ne: "ग्रीष्म अयनान्त", en: "Summer solstice", eq: false },
  { lambda: 180, ne: "शरद् विषुव", en: "Autumn equinox", eq: true },
  { lambda: 270, ne: "शीत अयनान्त", en: "Winter solstice", eq: false },
  { lambda: 0, ne: "वसन्त विषुव", en: "Spring equinox", eq: true },
];

/* बैशाख १ at angle 0, running clockwise (screen +x, +z). */
function at(deg: number, r: number): [number, number, number] {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), 0, -r * Math.cos(a)];
}

function ringGeometry(fromDeg: number, toDeg: number, rOut: number, rIn: number) {
  const shape = new THREE.Shape();
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const d = fromDeg + ((toDeg - fromDeg) * i) / steps;
    const a = ((d - 90) * Math.PI) / 180;
    const p: [number, number] = [rOut * Math.cos(a), rOut * Math.sin(a)];
    if (i === 0) shape.moveTo(...p);
    else shape.lineTo(...p);
  }
  for (let i = steps; i >= 0; i--) {
    const d = fromDeg + ((toDeg - fromDeg) * i) / steps;
    const a = ((d - 90) * Math.PI) / 180;
    shape.lineTo(rIn * Math.cos(a), rIn * Math.sin(a));
  }
  return new THREE.ShapeGeometry(shape, 8);
}

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; monthNames: string[]; rituNames: string[] };

const RituWheelScene = memo(function RituWheelScene({ onLabels, monthNames, rituNames }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const rituGeoms = useMemo(() => RITUS.map((_, i) => ringGeometry(i * 60, (i + 1) * 60, R_MID, R_MID * 0.62)), []);

  useEffect(() => {
    if (!projector.begin()) return;
    RITUS.forEach((_, i) => {
      const [x, , z] = at(i * 60 + 30, (R_MID + R_MID * 0.62) / 2);
      projector.push({ id: `ritu-${i}`, text: rituNames[i]!, color: RITUS[i]!.color, size: 9 }, [x, 0.02, z]);
    });
    monthNames.forEach((m, i) => {
      const [x, , z] = at(i * 30 + 15, (R_OUT + R_MID) / 2);
      projector.push({ id: `month-${i}`, text: m, color: DIAGRAM_LABEL_COLOR.dim, size: 7 }, [x, 0.02, z]);
    });
    MARKERS.forEach((mk, i) => {
      const deg = (mk.lambda - AYANAMSHA + 360) % 360;
      const [x, , z] = at(deg, R_OUT + 0.12);
      projector.push({ id: `mk-${i}`, text: mk.ne, color: mk.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal, size: 8 }, [x, 0.02, z]);
    });
    projector.end();
  }, [projector, monthNames, rituNames]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 1.2, 0.4]} intensity={1.3} />
      {rituGeoms.map((geo, i) => (
        <mesh key={i} geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={RITUS[i]!.color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* month ring ticks */}
      {Array.from({ length: 12 }, (_, i) => {
        const inner = at(i * 30, R_MID);
        const outer = at(i * 30, R_OUT);
        return (
          <group key={i}>
            <mesh position={[(inner[0] + outer[0]) / 2, 0.001, (inner[2] + outer[2]) / 2]}>
              <boxGeometry args={[0.004, 0.002, R_OUT - R_MID]} />
              <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
            </mesh>
          </group>
        );
      })}
      {/* sāyana spokes */}
      {MARKERS.map((mk, i) => {
        const deg = (mk.lambda - AYANAMSHA + 360) % 360;
        const inner = at(deg, R_MID * 0.5);
        const outer = at(deg, R_OUT + 0.05);
        const color = mk.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal;
        const mid: [number, number, number] = [(inner[0] + outer[0]) / 2, 0.01, (inner[2] + outer[2]) / 2];
        const len = Math.hypot(outer[0] - inner[0], outer[2] - inner[2]);
        const angle = Math.atan2(outer[0] - inner[0], outer[2] - inner[2]);
        return (
          <mesh key={i} position={mid} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.008, 0.01, len]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </>
  );
});

export function RituWheelDiagram() {
  const { t, pick, lang } = useLocale();
  const monthNames = lang === "en" ? MONTHS_EN : MONTHS_NE;
  const rituNames = RITUS.map((r) => pick(r.ne, r.en));

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_six_tu_wheel")}
      height={280}
      camera={{ yaw: 0.2, pitch: 0.95 }}
      frame={{ width: 1.5, height: 0.75 }}
      idleSpin={0.02}
      legend={[
        { color: DIAGRAM_COLOR.tropical, label: t("ui.learn.equinox_tropical") },
        { color: DIAGRAM_COLOR.sidereal, label: t("ui.learn.solstice_tropical") },
      ]}
      readouts={[
        { k: t("ui.learn.tu"), v: `${6} (${t("ui.learn.n2_months_each")})` },
        { k: t("kundali.ayanamsha"), v: `${AYANAMSHA}°`, tone: "accent" },
      ]}
      caption={t("ui.learn.the_outer_ring_is_the_12")}
    >
      {({ onLabels }) => <RituWheelScene onLabels={onLabels} monthNames={monthNames} rituNames={rituNames} />}
    </LearnDiagram3D>
  );
}
