/**
 * Precession of the equinoxes — the ~25,772-year wobble. Earth's spin axis
 * stays tilted ~23.5° from the ecliptic pole but slowly sweeps a real cone
 * around it, like a spinning top; the north pole traces a circle among the
 * stars, passing different "pole stars" over millennia, while the equinox
 * line rotates retrograde through the fixed sidereal zodiac — exactly what
 * grows the ayanamsha. A genuine 3D concept, built here as real 3D rather
 * than web's oblique-projected `PrecessionCone` SVG; Tier 3.
 */
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { EclipticPlane, OrbitPath, RashiRing, ellipsePoints, orientRay } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { getRashiName } from "@/lib/rashi-i18n";

const D2R = Math.PI / 180;
const CYCLE = 25772;
const EPS = 23.5 * D2R;
const SE = Math.sin(EPS);
const CE = Math.cos(EPS);
const LA = 0.42;
const R_DISK = 0.5;

const POLE_STARS = [
  { ne: "थुबन", en: "Thuban", bs: -2730 },
  { ne: "कोचाब", en: "Kochab", bs: -943 },
  { ne: "ध्रुवतारा", en: "Polaris", bs: 2159 },
  { ne: "एर्राई", en: "Errai", bs: 4057 },
  { ne: "अल्डेरामिन", en: "Alderamin", bs: 7557 },
  { ne: "डेनेब", en: "Deneb", bs: 9857 },
  { ne: "अभिजित (वेगा)", en: "Vega", bs: 13784 },
].map((s) => ({ ...s, phi: ((((s.bs / CYCLE) % 1) + 1) % 1) * Math.PI * 2 }));

function axisDir(phi: number): [number, number, number] {
  return [SE * Math.cos(phi), CE, SE * Math.sin(phi)];
}

function nearestStar(phi: number) {
  return POLE_STARS.reduce(
    (best, s) => {
      const d = Math.min(Math.abs(s.phi - phi), Math.PI * 2 - Math.abs(s.phi - phi));
      return d < best.d ? { d, s } : best;
    },
    { d: Infinity, s: POLE_STARS[0]! },
  ).s;
}

type SceneProps = {
  clock: DiagramClockRef;
  onSample?: (year: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  lang: "ne" | "en";
  copy: { northPole: string; equinox: string };
};

const PrecessionConeScene = memo(function PrecessionConeScene({ clock, onSample, onLabels, lang, copy }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const axisRef = useRef<THREE.Mesh>(null);
  const eqRef = useRef<THREE.Mesh>(null);
  const poleRef = useRef<THREE.Mesh>(null);
  const starRefs = useRef<(THREE.Mesh | null)[]>([]);

  const topCircle = ellipsePoints(LA * SE, 0, 72, LA * CE);
  const botCircle = ellipsePoints(LA * SE, 0, 72, -LA * CE);

  useFrame(() => {
    const year = readClock(0.016);
    const phi = (year / CYCLE) * Math.PI * 2;
    const a = axisDir(phi);
    const top: [number, number, number] = [LA * a[0], LA * a[1], LA * a[2]];
    const bot: [number, number, number] = [-LA * a[0], -LA * a[1], -LA * a[2]];
    orientRay(axisRef.current, bot, top, 1);
    poleRef.current?.position.set(...top);

    const eqPhi = -phi;
    const eqEnd: [number, number, number] = [R_DISK * 1.08 * Math.cos(eqPhi), 0, R_DISK * 1.08 * Math.sin(eqPhi)];
    const eqEnd2: [number, number, number] = [-eqEnd[0], 0, -eqEnd[2]];
    orientRay(eqRef.current, eqEnd2, eqEnd, 1);

    const near = nearestStar(((phi % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    POLE_STARS.forEach((s, i) => {
      const p: [number, number, number] = [LA * SE * Math.cos(s.phi), LA * CE, LA * SE * Math.sin(s.phi)];
      const mesh = starRefs.current[i];
      if (mesh) {
        mesh.position.set(...p);
        const isNear = s === near;
        mesh.scale.setScalar(isNear ? 1.7 : 1);
        (mesh.material as THREE.MeshBasicMaterial).color.set(isNear ? DIAGRAM_COLOR.sun : DIAGRAM_LABEL_COLOR.dim);
      }
    });

    if (projector.begin()) {
      projector.push({ id: "pole", text: copy.northPole, color: DIAGRAM_COLOR.sun, size: 9 }, [top[0], top[1] + 0.06, top[2]]);
      const eqIdx = ((-Math.round(phi / (30 * D2R)) % 12) + 12) % 12;
      projector.push(
        { id: "eq", text: `${copy.equinox} · ${getRashiName(eqIdx + 1, lang)}`, color: DIAGRAM_LABEL_COLOR.warn, size: 8 },
        [eqEnd[0], 0.06, eqEnd[2]],
      );
      POLE_STARS.forEach((s, i) => {
        const isNear = s === near;
        if (!isNear) return;
        const p = starRefs.current[i]?.position;
        if (!p) return;
        projector.push({ id: `star-${i}`, text: lang === "en" ? s.en : s.ne, color: DIAGRAM_COLOR.sun, size: 8 }, [p.x, p.y + 0.05, p.z]);
      });
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.5]} intensity={1.3} />
      <EclipticPlane radius={R_DISK} opacity={0.05} />
      <RashiRing inner={R_DISK * 0.82} outer={R_DISK} opacity={0.4} />
      <OrbitPath points={topCircle} color={DIAGRAM_COLOR.sun} opacity={0.75} radius={0.004} />
      <OrbitPath points={botCircle} color={DIAGRAM_COLOR.sun} opacity={0.3} radius={0.003} />
      {Array.from({ length: 16 }, (_, k) => {
        const t = (k / 16) * Math.PI * 2;
        const ex = LA * SE * Math.cos(t);
        const ey = LA * CE;
        const ez = LA * SE * Math.sin(t);
        return <OrbitPath key={k} points={[[0, 0, 0], [ex, ey, ez]]} color={DIAGRAM_COLOR.tropical} opacity={0.1} radius={0.0015} closed={false} />;
      })}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.055, 18, 18]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <mesh ref={axisRef}>
        <cylinderGeometry args={[0.005, 0.005, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.body} transparent opacity={0.85} />
      </mesh>
      <mesh ref={eqRef}>
        <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} transparent opacity={0.9} />
      </mesh>
      <mesh ref={poleRef}>
        <sphereGeometry args={[0.024, 14, 14]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
      </mesh>
      {POLE_STARS.map((_, i) => (
        <mesh key={i} ref={(m) => { starRefs.current[i] = m; }}>
          <sphereGeometry args={[0.014, 10, 10]} />
          <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} />
        </mesh>
      ))}
    </>
  );
});

export function PrecessionConeDiagram() {
  const { pick, digits, lang } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: -CYCLE / 2,
    max: CYCLE / 2,
    speed: 900,
  });

  const phi = (year / CYCLE) * Math.PI * 2;
  const phiNorm = ((phi % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const near = nearestStar(phiNorm);
  const eqIdx = ((-Math.round(phi / (30 * D2R)) % 12) + 12) % 12;
  const copy = { northPole: pick("उत्तरी ध्रुव", "North pole"), equinox: pick("वसन्त विषुव", "Spring equinox") };

  const fmtYear = (y: number) => {
    const r = Math.round(y);
    return r < 0 ? pick(`वि.सं. ${digits(Math.abs(r))} अघि`, `${digits(Math.abs(r))} yr before now`) : pick(`वि.सं. +${digits(r)}`, `+${digits(r)} yr from now`);
  };

  return (
    <LearnDiagram3D
      title={pick("३D — विषुवको अयन-शङ्कु", "3D — the precession cone")}
      height={300}
      camera={{ yaw: 0.4, pitch: 0.85 }}
      frame={{ width: 1.3, height: 0.95 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: pick("ध्रुवको मार्ग (शङ्कु)", "Pole's path (cone)") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: copy.equinox },
        { color: DIAGRAM_LABEL_COLOR.body, label: pick("घूर्णन अक्ष", "Spin axis") },
      ]}
      readouts={[
        { k: pick("समय", "Time"), v: fmtYear(year), tone: "accent" },
        { k: pick("अहिलेको ध्रुवतारा", "Current pole star"), v: lang === "en" ? near.en : near.ne, tone: "warn" },
        { k: pick("विषुव अहिले", "Equinox now in"), v: getRashiName(eqIdx + 1, lang) },
        { k: pick("अक्षीय झुकाव", "Axial tilt"), v: `${digits("23.5")}°` },
      ]}
      slider={{
        value: year,
        min: -CYCLE / 2,
        max: CYCLE / 2,
        label: fmtYear(year),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={POLE_STARS.map((s) => ({ label: lang === "en" ? s.en : s.ne, value: s.bs }))}
      onPreset={scrubTo}
      presetValue={year}
      presetTolerance={400}
      caption={pick(
        "पृथ्वीको घूर्णन अक्ष क्रान्तिवृत्तको ध्रुवबाट ~२३.५° तेर्सिएको छ, तर यो झुकाव कायम राखेरै बिस्तारै एउटा शङ्कु कोर्छ — ठ्याक्कै घुम्ने लट्टुझैं। उत्तरी ध्रुवले तारापुञ्जबीच एउटा वृत्त कोर्छ, फरक-फरक 'ध्रुवतारा' छोएर — पूरा फेरो ~२५,७७२ वर्षमा। यसैबीच वसन्त विषुव बिन्दु स्थिर निरयन राशिचक्रको सापेक्षमा उल्टो दिशामा घुम्छ — यही सर्ने चालले अयनांश बढाउँछ।",
        "Earth's spin axis stays tilted ~23.5° from the ecliptic pole but slowly sweeps a real cone around it, keeping that tilt fixed — exactly like a spinning top. The north pole traces a circle among the stars, touching different 'pole stars' along the way — one full loop takes ~25,772 years. Meanwhile the spring equinox point rotates the opposite way relative to the fixed sidereal zodiac — that drift is what grows the ayanamsha.",
      )}
    >
      {({ onLabels }) => <PrecessionConeScene clock={clock} onSample={onSample} onLabels={onLabels} lang={lang} copy={copy} />}
    </LearnDiagram3D>
  );
}
