/**
 * How a single API call turns into everything the app shows — observer +
 * clock go in, the ephemeris runs once, and every panchanga limb, app
 * screen, and graha reading comes out of that one pass. Native 3D
 * reimagining of web's `ServerPipelineDiagram` (a flat SVG box-and-arrow
 * graph) as a five-stage node chain; "how we calculate" chapter, mobile-only
 * (no matching id in web's diagram registry — this sits outside it there
 * too, embedded directly in `HowWeCalculateStudy`).
 */
import { memo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { Ray } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

type Stage = { ne: string; en: string; items: { ne: string; en: string }[]; color: string };

const STAGES: Stage[] = [
  {
    ne: "आधार",
    en: "Foundation",
    color: DIAGRAM_COLOR.earth,
    items: [
      { ne: "अवलोककको स्थान", en: "Observer's place" },
      { ne: "जुलियन दिन", en: "Julian Day" },
      { ne: "स्विस एफेमेरिस", en: "Swiss Ephemeris" },
    ],
  },
  {
    ne: "कच्चा गणना",
    en: "Raw output",
    color: DIAGRAM_COLOR.tropical,
    items: [
      { ne: "उदय/अस्त", en: "Rise / set" },
      { ne: "निरयन देशान्तर", en: "Sidereal longitudes" },
      { ne: "लग्न", en: "Lagna" },
    ],
  },
  {
    ne: "पञ्चाङ्गका अङ्ग",
    en: "Panchanga limbs",
    color: DIAGRAM_LABEL_COLOR.warn,
    items: [
      { ne: "तिथि, नक्षत्र, योग, करण", en: "Tithi, nakshatra, yoga, karana" },
      { ne: "अङ्ग समाप्ति समय", en: "Limb end times" },
    ],
  },
  {
    ne: "दैनिक पञ्चाङ्ग",
    en: "Daily panchanga",
    color: DIAGRAM_LABEL_COLOR.rashi,
    items: [
      { ne: "उदय-आधारित दिन", en: "Sunrise-anchored day" },
      { ne: "नागरिक समयरेखा", en: "Civil timeline" },
      { ne: "कुनै क्षणको झलक", en: "At-time snapshot" },
    ],
  },
  {
    ne: "एपहरू",
    en: "Apps",
    color: DIAGRAM_LABEL_COLOR.dim,
    items: [
      { ne: "पात्रो", en: "Patro" },
      { ne: "पर्व", en: "Festivals" },
      { ne: "साइत", en: "Sait" },
      { ne: "गोचर", en: "Gochar" },
      { ne: "ग्रहण", en: "Eclipses" },
      { ne: "कुण्डली", en: "Kundali" },
    ],
  },
];

const X0 = -0.85;
const X1 = 0.85;
const xOf = (i: number) => X0 + (i / (STAGES.length - 1)) * (X1 - X0);

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; lang: "ne" | "en" };

const ServerPipelineScene = memo(function ServerPipelineScene({ onLabels, lang }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);

  useEffect(() => {
    if (!projector.begin()) return;
    STAGES.forEach((s, i) => {
      projector.push({ id: `stage-${i}`, text: lang === "en" ? s.en : s.ne, color: s.color, size: 9 }, [xOf(i), 0.14, 0]);
    });
    projector.end();
  }, [projector, lang]);

  useFrame((_, delta) => {
    t.current += delta;
    nodeRefs.current.forEach((n, i) => {
      if (!n) return;
      n.position.y = Math.sin(t.current * 0.8 + i * 0.7) * 0.015;
    });
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {STAGES.slice(0, -1).map((s, i) => (
        <Ray key={i} from={[xOf(i), 0, 0]} to={[xOf(i + 1), 0, 0]} color={DIAGRAM_LABEL_COLOR.dim} opacity={0.5} radius={0.004} />
      ))}
      {STAGES.map((s, i) => (
        <mesh key={i} ref={(el) => { nodeRefs.current[i] = el; }} position={[xOf(i), 0, 0]}>
          <sphereGeometry args={[i === 0 || i === STAGES.length - 1 ? 0.038 : 0.03, 16, 16]} />
          <meshStandardMaterial color={s.color} />
        </mesh>
      ))}
    </>
  );
});

export function ServerPipelineDiagram() {
  const { pick, lang } = useLocale();

  return (
    <LearnDiagram3D
      title={pick("३D — गणना पाइपलाइन", "3D — the computation pipeline")}
      height={240}
      camera={{ yaw: 0.1, pitch: 0.5 }}
      frame={{ width: 1.9, height: 0.6 }}
      idleSpin={0}
      legend={STAGES.map((s) => ({ color: s.color, label: pick(s.ne, s.en) }))}
      readouts={STAGES.map((s) => ({ k: pick(s.ne, s.en), v: s.items.map((it) => pick(it.ne, it.en)).join(" · ") }))}
      caption={pick(
        "अवलोककको स्थान, समय र स्विस एफेमेरिस मिलेर एकपटक गणना चल्छ — त्यसबाट उदय/अस्त, निरयन देशान्तर र लग्न निस्किन्छ। यिनैबाट पञ्चाङ्गका पाँच अङ्ग र तिनका समाप्ति समय बन्छन्, जसले दैनिक पञ्चाङ्ग तयार पार्छ। त्यही एउटा दैनिक पञ्चाङ्गबाट पात्रो, पर्व, साइत, गोचर, ग्रहण र कुण्डली — सबै एपले लेबल मात्र देखाउँछन्, फेरि गणना गर्दैनन्।",
        "The observer's place, the clock, and Swiss Ephemeris run once — that single pass yields rise/set, sidereal longitudes, and the lagna. Those feed the five panchanga limbs and their end times, which assemble the daily panchanga. That one daily panchanga then feeds patro, festivals, sait, gochar, eclipses, and kundali — every app just formats the labels, none of them recompute.",
      )}
    >
      {({ onLabels }) => <ServerPipelineScene onLabels={onLabels} lang={lang} />}
    </LearnDiagram3D>
  );
}
