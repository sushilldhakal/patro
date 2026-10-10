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
                <meshStandardMaterial color={"#cbd5e1"} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
});

export function MoonriseSlipDiagram() {
  const { pick, digits } = useLocale();
  const copy = { day: pick("दिन", "Day"), none: pick("यो दिन चन्द्रोदय छैन", "No moonrise this day") };

  return (
    <LearnDiagram3D
      title={pick("३D — चन्द्रोदय ढिलो हुँदै जाने क्रम", "3D — moonrise slipping later")}
      height={240}
      camera={{ yaw: 0.15, pitch: 0.75 }}
      frame={{ width: 1.4, height: 0.7 }}
      idleSpin={0}
      legend={[
        { color: "#cbd5e1", label: pick("चन्द्रोदयको समय", "Moonrise time") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: pick("चन्द्रोदय नभएको दिन", "Day with no moonrise") },
      ]}
      readouts={[
        { k: pick("दैनिक ढिलाइ", "Daily slip"), v: `~${digits(50)} ${pick("मिनेट", "min")}`, tone: "accent" },
        { k: pick("दिन ३", "Day 3"), v: pick("चन्द्रोदय छैन", "no moonrise"), tone: "warn" },
      ]}
      caption={pick(
        "चन्द्रमा प्रत्येक दिन ~५० मिनेट ढिलो उदाउँछ — किनभने पृथ्वी घुम्दा चन्द्र आफ्नै कक्षमा ~१३° अघि बढिसकेको हुन्छ। लगातार दुई चन्द्रोदयबीचको फरक (~२४ घण्टा ५० मिनेट) सधैँ एक नागरिक दिनभन्दा बढी हुन्छ — त्यसैले कहिलेकाहीँ कुनै दिनमा चन्द्रोदय नै पर्दैन (यहाँ दिन ३)।",
        "The Moon rises about 50 minutes later each day — because while Earth turns, the Moon has moved ~13° further along its own orbit. The gap between two successive moonrises (~24h50m) is always more than one civil day — so occasionally a day gets no moonrise at all (here, day 3).",
      )}
    >
      {({ onLabels }) => <MoonriseSlipScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
