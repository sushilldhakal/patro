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
import { tFor } from "@vedic-patro/i18n/runtime";

type Stage = { ne: string; en: string; items: { ne: string; en: string }[]; color: string };

const STAGES: Stage[] = [
  {
    get ne() { return tFor("ne", "learn.study.pipeline.group_foundation"); },
    get en() { return tFor("en", "learn.study.pipeline.group_foundation"); },
    color: DIAGRAM_COLOR.earth,
    items: [
      { get ne() { return tFor("ne", "ui.learn.observer_s_place"); }, get en() { return tFor("en", "ui.learn.observer_s_place"); } },
      { get ne() { return tFor("ne", "ui.learn.julian_day"); }, get en() { return tFor("en", "ui.learn.julian_day"); } },
      { get ne() { return tFor("ne", "ui.learn.swiss_ephemeris"); }, get en() { return tFor("en", "ui.learn.swiss_ephemeris"); } },
    ],
  },
  {
    get ne() { return tFor("ne", "ui.learn.raw_output"); },
    get en() { return tFor("en", "ui.learn.raw_output"); },
    color: DIAGRAM_COLOR.tropical,
    items: [
      { get ne() { return tFor("ne", "ui.learn.rise_set"); }, get en() { return tFor("en", "ui.learn.rise_set"); } },
      { get ne() { return tFor("ne", "learn.study.pipeline.node_longitudes"); }, get en() { return tFor("en", "learn.study.pipeline.node_longitudes"); } },
      { get ne() { return tFor("ne", "kundali.report.meta_lagna"); }, get en() { return tFor("en", "kundali.report.meta_lagna"); } },
    ],
  },
  {
    get ne() { return tFor("ne", "ui.learn.panchanga_limbs"); },
    get en() { return tFor("en", "ui.learn.panchanga_limbs"); },
    color: DIAGRAM_LABEL_COLOR.warn,
    items: [
      { get ne() { return tFor("ne", "ui.learn.tithi_nakshatra_yoga_karana"); }, get en() { return tFor("en", "ui.learn.tithi_nakshatra_yoga_karana"); } },
      { get ne() { return tFor("ne", "ui.learn.limb_end_times"); }, get en() { return tFor("en", "ui.learn.limb_end_times"); } },
    ],
  },
  {
    get ne() { return tFor("ne", "ui.learn.daily_panchanga"); },
    get en() { return tFor("en", "ui.learn.daily_panchanga"); },
    color: DIAGRAM_LABEL_COLOR.rashi,
    items: [
      { get ne() { return tFor("ne", "ui.learn.sunrise_anchored_day"); }, get en() { return tFor("en", "ui.learn.sunrise_anchored_day"); } },
      { get ne() { return tFor("ne", "learn.study.pipeline.node_civil_timeline"); }, get en() { return tFor("en", "learn.study.pipeline.node_civil_timeline"); } },
      { get ne() { return tFor("ne", "ui.learn.at_time_snapshot"); }, get en() { return tFor("en", "ui.learn.at_time_snapshot"); } },
    ],
  },
  {
    get ne() { return tFor("ne", "ui.learn.apps"); },
    get en() { return tFor("en", "ui.learn.apps"); },
    color: DIAGRAM_LABEL_COLOR.dim,
    items: [
      { get ne() { return tFor("ne", "brand_patro"); }, get en() { return tFor("en", "brand_patro"); } },
      { get ne() { return tFor("ne", "ui.learn.festivals"); }, get en() { return tFor("en", "ui.learn.festivals"); } },
      { get ne() { return tFor("ne", "panchanga.tabs.sait"); }, get en() { return tFor("en", "panchanga.tabs.sait"); } },
      { get ne() { return tFor("ne", "ui.gochar.gochar"); }, get en() { return tFor("en", "ui.gochar.gochar"); } },
      { get ne() { return tFor("ne", "learn.study.pipeline.node_eclipses"); }, get en() { return tFor("en", "learn.study.pipeline.node_eclipses"); } },
      { get ne() { return tFor("ne", "nav.jyotish_kundali"); }, get en() { return tFor("en", "nav.jyotish_kundali"); } },
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
  const { t, pick, lang } = useLocale();

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_computation_pipeline")}
      height={240}
      camera={{ yaw: 0.1, pitch: 0.5 }}
      frame={{ width: 1.9, height: 0.6 }}
      idleSpin={0}
      legend={STAGES.map((s) => ({ color: s.color, label: pick(s.ne, s.en) }))}
      readouts={STAGES.map((s) => ({ k: pick(s.ne, s.en), v: s.items.map((it) => pick(it.ne, it.en)).join(" · ") }))}
      caption={t("ui.learn.the_observer_s_place_the_clock")}
    >
      {({ onLabels }) => <ServerPipelineScene onLabels={onLabels} lang={lang} />}
    </LearnDiagram3D>
  );
}
