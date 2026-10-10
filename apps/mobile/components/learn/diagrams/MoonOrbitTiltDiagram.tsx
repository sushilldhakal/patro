/**
 * Why most full moons and new moons pass without an eclipse. The Moon's
 * orbit is tilted ~5.14° from the ecliptic (drawn larger here for clarity);
 * the Sun–Earth–shadow line sweeps around once a year. An eclipse needs the
 * Moon to sit ON that line AND at a node (rahu/ketu) at the same time — the
 * line of nodes itself drifts through an 18.6-year precession, which is why
 * eclipse seasons shift around the year. Native 3D reimagining of web's
 * `MoonOrbitTilt` (oblique-projected SVG); Tier 3.
 */
import { memo, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { EclipticPlane, OrbitPath, Ray, orientRay } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const D2R = Math.PI / 180;
const SIDEREAL_MONTH = 27.32166;
const YEAR_DAYS = 365.2422;
const NODAL_YEARS = 18.6;
const YEAR_RANGE = 400;
const NODE0 = 120;
const REAL_TILT = 5.14;
const INC = 20 * D2R;
const CI = Math.cos(INC);
const SI = Math.sin(INC);
const R_DISK = 0.55;
const RM = 0.36;
const R_SUN = 0.85;

const norm360 = (a: number) => ((a % 360) + 360) % 360;
const angDiff = (a: number, b: number) => Math.abs(((a - b + 180) % 360) - 180);

function orbitPoint(uDeg: number, omegaDeg: number): [number, number, number] {
  const u = uDeg * D2R;
  const O = omegaDeg * D2R;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const X = RM * (Math.cos(O) * cu - Math.sin(O) * su * CI);
  const Z = RM * (Math.sin(O) * cu + Math.cos(O) * su * CI);
  const Y = RM * su * SI;
  return [X, Y, Z];
}

function moonOrbitPoints(omegaDeg: number, steps = 96): [number, number, number][] {
  return Array.from({ length: steps }, (_, i) => orbitPoint((i / steps) * 360, omegaDeg));
}

type Status = "lunar" | "solar" | "none";

type SceneProps = {
  clock: DiagramClockRef;
  precT: number;
  onSample?: (day: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: { sun: string; moon: string; asc: string; desc: string; eclipse: string };
};

const MoonOrbitTiltScene = memo(function MoonOrbitTiltScene({ clock, precT, onSample, onLabels, copy }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const moonRef = useRef<THREE.Mesh>(null);
  const dropRef = useRef<THREE.Mesh>(null);
  const baseRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const shadowRayRef = useRef<THREE.Mesh>(null);

  const omega = norm360(NODE0 - (360 * precT) / NODAL_YEARS);
  const orbitPts = useMemo(() => moonOrbitPoints(omega), [omega]);
  const N: [number, number, number] = [Math.cos(omega * D2R), 0, Math.sin(omega * D2R)];
  const ascPt: [number, number, number] = [RM * N[0], 0, RM * N[2]];
  const descPt: [number, number, number] = [-RM * N[0], 0, -RM * N[2]];

  useFrame(() => {
    const day = readClock(0.016);
    const sunLon = norm360((360 * day) / YEAR_DAYS);
    const moonLon = norm360((360 * day) / SIDEREAL_MONTH);
    const u = norm360(moonLon - omega);
    const E = norm360(moonLon - sunLon);
    const nodeProx = Math.abs(Math.sin(u * D2R));
    const atNode = nodeProx < Math.sin(11 * D2R);
    let status: Status = "none";
    if (atNode && angDiff(E, 180) < 15) status = "lunar";
    else if (atNode && angDiff(E, 0) < 15) status = "solar";

    const moonPos = orbitPoint(u, omega);
    moonRef.current?.position.set(...moonPos);
    const base: [number, number, number] = [moonPos[0], 0, moonPos[2]];
    orientRay(dropRef.current, moonPos, base, 1);
    baseRef.current?.position.set(...base);

    const sunPos: [number, number, number] = [R_SUN * Math.cos(sunLon * D2R), 0, R_SUN * Math.sin(sunLon * D2R)];
    const shadowPos: [number, number, number] = [-sunPos[0], 0, -sunPos[2]];
    sunRef.current?.position.set(...sunPos);
    orientRay(shadowRayRef.current, sunPos, shadowPos, 1);

    if (moonRef.current) {
      const mat = moonRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(status === "lunar" ? DIAGRAM_LABEL_COLOR.warn : status === "solar" ? "#33373d" : "#cbd5e1");
      mat.emissive?.set(status === "lunar" ? DIAGRAM_LABEL_COLOR.warn : "#000000");
      mat.emissiveIntensity = status === "lunar" ? 0.5 : 0;
    }

    if (projector.begin()) {
      projector.push({ id: "sun", text: copy.sun, color: DIAGRAM_COLOR.sun, size: 9 }, [sunPos[0], 0.08, sunPos[2]]);
      projector.push({ id: "moon", text: copy.moon, color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [moonPos[0], moonPos[1] + 0.06, moonPos[2]]);
      if (status !== "none") {
        projector.push({ id: "ecl", text: copy.eclipse, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [moonPos[0], moonPos[1] + 0.11, moonPos[2]]);
      }
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.5]} intensity={1.1} />
      <EclipticPlane radius={R_DISK} opacity={0.06} />
      <OrbitPath points={orbitPts} color={DIAGRAM_COLOR.tropical} opacity={0.55} radius={0.0035} />
      <Ray from={[-R_DISK * N[0], 0, -R_DISK * N[2]]} to={[R_DISK * N[0], 0, R_DISK * N[2]]} color={DIAGRAM_LABEL_COLOR.dim} opacity={0.35} radius={0.0025} />
      <mesh position={ascPt}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
      </mesh>
      <mesh position={descPt}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
      </mesh>
      <mesh ref={shadowRayRef}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} transparent opacity={0.5} />
      </mesh>
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.026, 16, 16]} />
        <meshStandardMaterial color={"#cbd5e1"} roughness={0.9} />
      </mesh>
      <mesh ref={dropRef}>
        <cylinderGeometry args={[0.0018, 0.0018, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
      </mesh>
      <mesh ref={baseRef}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} />
      </mesh>
    </>
  );
});

export function MoonOrbitTiltDiagram() {
  const { pick, digits } = useLocale();
  const [precT, setPrecT] = useState(0);
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: 0,
    max: YEAR_RANGE,
    speed: 40,
  });

  const sunLon = norm360((360 * day) / YEAR_DAYS);
  const moonLon = norm360((360 * day) / SIDEREAL_MONTH);
  const omega = norm360(NODE0 - (360 * precT) / NODAL_YEARS);
  const u = norm360(moonLon - omega);
  const E = norm360(moonLon - sunLon);
  const atNode = Math.abs(Math.sin(u * D2R)) < Math.sin(11 * D2R);
  const status: Status = atNode && angDiff(E, 180) < 15 ? "lunar" : atNode && angDiff(E, 0) < 15 ? "solar" : "none";
  const season = angDiff(omega, sunLon) < 13 || angDiff(omega, sunLon + 180) < 13;
  const phase = angDiff(E, 180) < 12 ? pick("पूर्णिमा", "Purnima") : angDiff(E, 0) < 12 ? pick("औंसी", "Aunsi") : E < 180 ? pick("शुक्ल पक्ष", "Shukla paksha") : pick("कृष्ण पक्ष", "Krishna paksha");
  const statusText =
    status === "lunar"
      ? pick("चन्द्रग्रहण", "Lunar eclipse")
      : status === "solar"
        ? pick("सूर्यग्रहण", "Solar eclipse")
        : season
          ? pick("ग्रहण ऋतु", "Eclipse season")
          : pick("ग्रहण छैन", "No eclipse");

  const copy = {
    sun: pick("सूर्य", "Sun"),
    moon: pick("चन्द्र", "Moon"),
    asc: pick("राहु", "Rahu"),
    desc: pick("केतु", "Ketu"),
    eclipse: statusText,
  };

  return (
    <LearnDiagram3D
      title={pick("३D — चन्द्र-कक्षको झुकाव र ग्रहण", "3D — the Moon's tilted orbit and eclipses")}
      height={300}
      camera={{ yaw: 0.35, pitch: 0.8 }}
      frame={{ width: 1.4, height: 0.9 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.tropical, label: pick("चन्द्र-कक्ष (झुकेको)", "Moon's orbit (tilted)") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: pick("सूर्य–पृथ्वी–छायाँ रेखा", "Sun–Earth–shadow line") },
        { color: DIAGRAM_COLOR.tropical, label: pick("राहु / केतु — पात बिन्दु", "Rahu / Ketu — the nodes") },
      ]}
      readouts={[
        { k: pick("कक्ष झुकाव", "Orbital tilt"), v: `~${digits(REAL_TILT.toFixed(1))}°` },
        { k: pick("चन्द्र चरण", "Moon phase"), v: phase },
        { k: pick("पात-चक्र", "Nodal cycle"), v: `${digits(precT.toFixed(1))} / ${digits(NODAL_YEARS)} ${pick("वर्ष", "yr")}` },
        { k: pick("अवस्था", "Status"), v: statusText, tone: status !== "none" ? "warn" : undefined },
      ]}
      slider={{
        value: day,
        min: 0,
        max: YEAR_RANGE,
        label: pick(`दिन ${digits(Math.round(day))} — सूर्य रेखा घुम्छ`, `Day ${digits(Math.round(day))} — the Sun line turns`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("पात रेखा: ०%", "Nodes: 0%"), value: 0 },
        { label: pick("पात रेखा: २५%", "Nodes: 25%"), value: NODAL_YEARS * 0.25 },
        { label: pick("पात रेखा: ५०%", "Nodes: 50%"), value: NODAL_YEARS * 0.5 },
        { label: pick("पात रेखा: ७५%", "Nodes: 75%"), value: NODAL_YEARS * 0.75 },
      ]}
      onPreset={setPrecT}
      presetValue={precT}
      presetTolerance={0.3}
      caption={pick(
        "पृथ्वीको बीचबाट गएको सूर्य–पृथ्वी (ग्रहण) रेखा सूर्यसँगै वर्षमा एक फेरो घुम्छ। चन्द्रको कक्ष ~५.१° झुकेको छ (यहाँ स्पष्टताका लागि ठूलो देखाइएको), त्यसैले धेरैजसो पूर्णिमामा चन्द्र यो रेखाभन्दा माथि वा तल हुन्छ — ग्रहण हुँदैन। ग्रहण त्यतिबेला मात्र हुन्छ जब यो रेखा राहु वा केतुमा पुग्छ र त्यहीँ पूर्णिमा/औंसी पर्छ। माथिको प्रिसेटले पात रेखालाई १८.६ वर्षे चक्रमा घुमाउँछ — त्यसैले ग्रहण ऋतु हरेक वर्ष सर्दै जान्छ।",
        "The Sun–Earth (eclipse) line through Earth's centre turns once a year with the Sun. The Moon's orbit is tilted ~5.1° (shown larger here for clarity), so at most full moons the Moon passes above or below this line — no eclipse. An eclipse happens only when this line reaches Rahu or Ketu and a full/new moon lands there too. The presets above rotate the line of nodes through its 18.6-year cycle — which is why eclipse season drifts year to year.",
      )}
    >
      {({ onLabels }) => <MoonOrbitTiltScene clock={clock} precT={precT} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
