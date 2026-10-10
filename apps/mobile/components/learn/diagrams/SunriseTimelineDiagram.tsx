/**
 * Why a tithi sometimes repeats (vriddhi) or gets skipped (kshaya) — six
 * consecutive sunrises sampled against the Moon–Sun elongation angle, at the
 * Moon's slow (vriddhi) or fast (kshaya) end of its speed range. Same
 * generating rule as web's `SunriseTimeline` (startE/rate/6 days), reimagined
 * as a 3D angle strip instead of a flat SVG band. Tier 1.
 */
import { memo, useEffect, useMemo } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { AngleArc, Marker } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const TITHI_NE = [
  "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी",
  "अष्टमी", "नवमी", "दशमी",
];
const TITHI_EN = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami",
];

function samples(mode: "vriddhi" | "kshaya") {
  const isVri = mode === "vriddhi";
  const rate = isVri ? 10.7 : 14.3;
  const startE = isVri ? 24 : 25;
  const nDays = 6;
  const E = Array.from({ length: nDays }, (_, i) => startE + rate * i);
  const band = E.map((e) => Math.floor(e / 12));
  let dupBand: number | null = null;
  let skipBand: number | null = null;
  if (isVri) {
    for (let i = 1; i < nDays; i++) if (band[i] === band[i - 1]) dupBand = band[i]!;
  } else {
    for (let i = 1; i < nDays; i++) if (band[i]! - band[i - 1]! >= 2) skipBand = band[i - 1]! + 1;
  }
  const bandMin = Math.min(...band);
  const bandMax = Math.max(...band);
  return { E, band, dupBand, skipBand, bandMin, bandMax };
}

type SceneProps = {
  onLabels?: (labels: DiagramLabel[]) => void;
  mode: "vriddhi" | "kshaya";
  tithiNames: string[];
};

const R = 0.5;

const SunriseTimelineScene = memo(function SunriseTimelineScene({ onLabels, mode, tithiNames }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const data = useMemo(() => samples(mode), [mode]);
  const specialBand = mode === "vriddhi" ? data.dupBand : data.skipBand;

  useEffect(() => {
    if (!projector.begin()) return;
    for (let b = data.bandMin; b <= data.bandMax; b++) {
      const mid = b * 12 + 6;
      const a = (mid * Math.PI) / 180;
      const special = b === specialBand;
      projector.push(
        { id: `band-${b}`, text: tithiNames[b] ?? String(b), color: special ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_LABEL_COLOR.dim, size: special ? 9 : 7 },
        [R * 1.25 * Math.cos(a), 0.02, R * 1.25 * Math.sin(a)],
      );
    }
    data.E.forEach((e, i) => {
      const a = (e * Math.PI) / 180;
      projector.push({ id: `day-${i}`, text: String(i + 1), color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [R * 0.72 * Math.cos(a), 0.06, R * 0.72 * Math.sin(a)]);
    });
    projector.end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projector, data, specialBand]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {Array.from({ length: data.bandMax - data.bandMin + 1 }, (_, k) => {
        const b = data.bandMin + k;
        const special = b === specialBand;
        return (
          <AngleArc
            key={b}
            radius={R}
            fromDeg={b * 12}
            spanDeg={12}
            color={special ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_COLOR.orbit}
            thickness={special ? 0.02 : 0.014}
            opacity={special ? 0.95 : 0.55}
          />
        );
      })}
      {data.E.map((e, i) => {
        const a = (e * Math.PI) / 180;
        return <Marker key={i} position={[R * Math.cos(a), 0.05, R * Math.sin(a)]} color={DIAGRAM_COLOR.sun} size={0.03} />;
      })}
    </>
  );
});

export function SunriseTimelineDiagram({ mode }: { mode: "vriddhi" | "kshaya" }) {
  const { pick, digits, lang } = useLocale();
  const data = samples(mode);
  const tithiNames = lang === "en" ? TITHI_EN : TITHI_NE;
  const specialBand = mode === "vriddhi" ? data.dupBand : data.skipBand;
  const specialName = specialBand !== null ? tithiNames[specialBand] ?? String(specialBand) : "";

  return (
    <LearnDiagram3D
      title={
        mode === "vriddhi"
          ? pick("३D — तिथि वृद्धि (दोहोरिने)", "3D — tithi vriddhi (repeated)")
          : pick("३D — तिथि क्षय (हराउने)", "3D — tithi kshaya (skipped)")
      }
      height={250}
      camera={{ yaw: 0.4, pitch: 0.85 }}
      frame={{ width: 1.3, height: 0.75 }}
      idleSpin={0.03}
      legend={[
        { color: DIAGRAM_COLOR.orbit, label: pick("सामान्य तिथि खण्ड", "Normal tithi segment") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: mode === "vriddhi" ? pick("दोहोरिएको तिथि", "Repeated tithi") : pick("हराएको तिथि", "Skipped tithi") },
        { color: DIAGRAM_COLOR.sun, label: pick("सूर्योदयको नमुना (६ दिन)", "Sunrise samples (6 days)") },
      ]}
      readouts={[
        { k: pick("चन्द्रको गति", "Moon's speed"), v: `${digits(mode === "vriddhi" ? "10.7" : "14.3")}°/${pick("दिन", "day")}`, tone: mode === "vriddhi" ? undefined : "warn" },
        { k: mode === "vriddhi" ? pick("दोहोरिएको तिथि", "Repeated tithi") : pick("हराएको तिथि", "Skipped tithi"), v: specialName, tone: "accent" },
      ]}
      caption={
        mode === "vriddhi"
          ? pick(
              "जब चन्द्र मन्द गतिमा (~१०.७°/दिन) हिँड्छ, एउटै १२° को तिथि–खण्डले लगातार दुई सूर्योदय समेट्छ — त्यो तिथि दुई दिन देखिन्छ (वृद्धि)। यहाँ छ दिनको सूर्योदय–नमुना देखाइएको छ; रातो खण्ड दुईपटक परेको तिथि हो।",
              "When the Moon moves slowly (~10.7°/day), a single 12° tithi-segment spans two consecutive sunrises — that tithi shows on two days (vriddhi). Six days of sunrise samples are shown here; the red segment is the tithi that got sampled twice.",
            )
          : pick(
              "जब चन्द्र द्रुत गतिमा (~१४.३°/दिन) हिँड्छ, कुनै १२° को तिथि–खण्ड दुई सूर्योदयको बीचमै पूरै सकिन्छ — कुनै पनि सूर्योदयमा नभेटिएकाले त्यो क्षय भई पात्रोबाट हराउँछ। रातो खण्ड कुनै पनि नमुनाले नछोएको तिथि हो।",
              "When the Moon moves fast (~14.3°/day), a 12° tithi-segment finishes entirely between two sunrises — since no sunrise falls in it, it is skipped (kshaya) and disappears from the calendar. The red segment is the tithi no sample landed on.",
            )
      }
    >
      {({ onLabels }) => <SunriseTimelineScene onLabels={onLabels} mode={mode} tithiNames={tithiNames} />}
    </LearnDiagram3D>
  );
}
