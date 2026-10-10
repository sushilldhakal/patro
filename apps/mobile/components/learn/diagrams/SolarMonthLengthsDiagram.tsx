/**
 * Why a BS month runs 29–32 days — a solar month is 30° of the Sun's travel
 * along the rashi belt, and Earth's elliptical orbit means that 30° is
 * crossed faster near perihelion (Poush–Magh) and slower near aphelion
 * (Asar). Real data from `getBSMonthLength` — the same table the patro
 * itself uses. Native 3D reimagining of web's `SolarMonthLengths` (flat SVG
 * bars); Tier 2.
 */
import { memo, useEffect, useMemo } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { BS_MONTHS_NE, BS_MONTH_NAMES, BS_SUPPORTED_END_YEAR, getBSMonthLength } from "@/lib/bs-calendar";

const SAMPLE_YEARS = 10;
const LONGEST = 2; // Asar
const SHORTEST = 8; // Poush
const SPAN = 1.1;
const xOf = (i: number) => -SPAN / 2 + ((i + 0.5) / 12) * SPAN;

function useMonthLengths(): number[] {
  return useMemo(() => {
    const endYear = BS_SUPPORTED_END_YEAR - 1;
    return Array.from({ length: 12 }, (_, m) => {
      let total = 0;
      for (let y = endYear - SAMPLE_YEARS; y < endYear; y++) total += getBSMonthLength(y, m + 1);
      return total / SAMPLE_YEARS;
    });
  }, []);
}

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; lengths: number[]; monthNames: string[] };

const SolarMonthLengthsScene = memo(function SolarMonthLengthsScene({ onLabels, lengths, monthNames }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const lo = 28.6;
  const hi = 32.4;
  const hOf = (d: number) => ((d - lo) / (hi - lo)) * 0.3 + 0.02;

  useEffect(() => {
    if (!projector.begin()) return;
    lengths.forEach((d, i) => {
      projector.push({ id: `m-${i}`, text: monthNames[i]!, color: DIAGRAM_LABEL_COLOR.dim, size: 7 }, [xOf(i), -0.06, 0]);
      if (i === LONGEST || i === SHORTEST) {
        projector.push({ id: `v-${i}`, text: d.toFixed(1), color: i === LONGEST ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_LABEL_COLOR.rashi, size: 8 }, [xOf(i), hOf(d) + 0.05, 0]);
      }
    });
    projector.end();
  }, [projector, lengths, monthNames]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {lengths.map((d, i) => {
        const h = hOf(d);
        const color = i === LONGEST ? DIAGRAM_LABEL_COLOR.warn : i === SHORTEST ? DIAGRAM_LABEL_COLOR.rashi : DIAGRAM_COLOR.orbit;
        return (
          <mesh key={i} position={[xOf(i), h / 2, 0]}>
            <boxGeometry args={[SPAN / 12 - 0.012, h, 0.05]} />
            <meshStandardMaterial color={color} transparent opacity={i === LONGEST || i === SHORTEST ? 0.9 : 0.5} />
          </mesh>
        );
      })}
    </>
  );
});

export function SolarMonthLengthsDiagram() {
  const { pick, digits, lang } = useLocale();
  const lengths = useMonthLengths();
  const monthNames = lang === "en" ? ([...BS_MONTH_NAMES] as string[]) : BS_MONTHS_NE;

  return (
    <LearnDiagram3D
      title={pick("३D — सौर महिनाको लम्बाइ", "3D — solar month lengths")}
      height={220}
      camera={{ yaw: 0.3, pitch: 0.5 }}
      frame={{ width: 1.4, height: 0.5 }}
      idleSpin={0.02}
      legend={[
        { color: DIAGRAM_LABEL_COLOR.rashi, label: `${pick(monthNames[SHORTEST]!, monthNames[SHORTEST]!)} — ${pick("सबैभन्दा छोटो (उपसौर)", "shortest (perihelion)")}` },
        { color: DIAGRAM_LABEL_COLOR.warn, label: `${pick(monthNames[LONGEST]!, monthNames[LONGEST]!)} — ${pick("सबैभन्दा लामो (अपसौर)", "longest (aphelion)")}` },
      ]}
      readouts={[
        { k: pick("न्यूनतम", "Shortest"), v: `${digits(lengths[SHORTEST]!.toFixed(1))} ${pick("दिन", "days")}` },
        { k: pick("अधिकतम", "Longest"), v: `${digits(lengths[LONGEST]!.toFixed(1))} ${pick("दिन", "days")}`, tone: "warn" },
      ]}
      caption={pick(
        "सौर महिना दिनको गन्ती होइन — यो राशि पट्टीमा सूर्यको ३०° यात्रा हो। पृथ्वीको कक्ष अण्डाकार भएकाले उपसौर (पुष–माघ) नजिक सूर्यको देखिने गति छिटो हुन्छ, त्यसैले त्यो ३०° छिटो पार हुन्छ — छोटो महिना। अपसौर (असार) नजिक गति सुस्त हुन्छ — लामो महिना। यो तथ्याङ्क पात्रोले नै प्रयोग गर्ने तालिकाबाटै आएको हो।",
        "A solar month is not a count of days — it is 30° of the Sun's travel along the rashi belt. Because Earth's orbit is elliptical, the Sun's apparent motion is fastest near perihelion (Poush–Magh), so that 30° passes quickly — a short month. Near aphelion (Asar) it crawls — a long month. This data comes from the same table the patro itself uses.",
      )}
    >
      {({ onLabels }) => <SolarMonthLengthsScene onLabels={onLabels} lengths={lengths} monthNames={monthNames} />}
    </LearnDiagram3D>
  );
}
