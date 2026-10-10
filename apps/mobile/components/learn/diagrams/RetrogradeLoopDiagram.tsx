/**
 * Retrograde motion as a projection, not a reversal — Earth (inner, faster)
 * overtakes Mars (outer, slower); the sightline from Earth through Mars,
 * extended to the fixed star backdrop, sweeps forward, pauses, sweeps
 * backward through the overtaking, then resumes. The loop is where the
 * sightline points, not anywhere either planet went. Native 3D reimagining
 * of web's `RetrogradeLoop` (flat sightline diagram) using real orbital
 * periods; Tier 3.
 */
import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { EclipticPlane, OrbitPath, Ray, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const EARTH_PERIOD = 365.25;
const MARS_PERIOD = 686.98;
const R_E = 0.35;
const R_M = 0.58;
const R_SKY = 0.95;
const SYNODIC = (EARTH_PERIOD * MARS_PERIOD) / (MARS_PERIOD - EARTH_PERIOD);
const TRAIL_N = 90;
const D2R = Math.PI / 180;

function posOf(day: number, period: number, r: number, phase = 0): [number, number, number] {
  const a = ((day / period) * 360 + phase) * D2R;
  return [r * Math.cos(a), 0, r * Math.sin(a)];
}

/** Sky-backdrop longitude the Earth→Mars sightline points at. */
function skyLon(day: number): number {
  const e = posOf(day, EARTH_PERIOD, R_E, 200);
  const m = posOf(day, MARS_PERIOD, R_M, 20);
  return Math.atan2(m[2] - e[2], m[0] - e[0]);
}

type SceneProps = { clock: DiagramClockRef; onSample?: (day: number) => void; onLabels?: (labels: DiagramLabel[]) => void; copy: { earth: string; mars: string; loop: string } };

const RetrogradeLoopScene = memo(function RetrogradeLoopScene({ clock, onSample, onLabels, copy }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const earthRef = useRef<THREE.Mesh>(null);
  const marsRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const trail = useRef<number[]>([]);

  const earthOrbit = useMemo(() => ellipsePoints(R_E, 0, 96), []);
  const marsOrbit = useMemo(() => ellipsePoints(R_M, 0, 96), []);

  const trailGeom = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
    return geo;
  }, []);

  useFrame(() => {
    const day = readClock(0.016) * 3;
    const e = posOf(day, EARTH_PERIOD, R_E, 200);
    const m = posOf(day, MARS_PERIOD, R_M, 20);
    earthRef.current?.position.set(...e);
    marsRef.current?.position.set(...m);

    const lon = skyLon(day);
    trail.current.push(lon);
    if (trail.current.length > TRAIL_N) trail.current.shift();
    const pos = trailGeom.attributes.position as THREE.BufferAttribute;
    trail.current.forEach((l, i) => {
      pos.setXYZ(i, R_SKY * Math.cos(l), 0, R_SKY * Math.sin(l));
    });
    for (let i = trail.current.length; i < TRAIL_N; i++) pos.setXYZ(i, 0, -10, 0);
    pos.needsUpdate = true;

    if (projector.begin()) {
      projector.push({ id: "earth", text: copy.earth, color: DIAGRAM_LABEL_COLOR.earth, size: 9 }, [e[0], 0.08, e[2]]);
      projector.push({ id: "mars", text: copy.mars, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [m[0], 0.08, m[2]]);
      const [lx, , lz] = [R_SKY * 1.15 * Math.cos(lon), 0, R_SKY * 1.15 * Math.sin(lon)];
      projector.push({ id: "sky", text: copy.loop, color: DIAGRAM_LABEL_COLOR.rashi, size: 8 }, [lx, 0.06, lz]);
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      <EclipticPlane radius={R_SKY * 1.1} opacity={0.04} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R_SKY - 0.005, R_SKY + 0.005, 64]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <OrbitPath points={earthOrbit} color={DIAGRAM_COLOR.earth} opacity={0.4} radius={0.004} />
      <OrbitPath points={marsOrbit} color={DIAGRAM_LABEL_COLOR.warn} opacity={0.35} radius={0.004} />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
      </mesh>
      <mesh ref={earthRef}>
        <sphereGeometry args={[0.028, 14, 14]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <mesh ref={marsRef}>
        <sphereGeometry args={[0.024, 14, 14]} />
        <meshStandardMaterial color={DIAGRAM_LABEL_COLOR.warn} />
      </mesh>
      <points ref={trailRef} geometry={trailGeom}>
        <pointsMaterial color={DIAGRAM_LABEL_COLOR.rashi} size={4} sizeAttenuation={false} transparent opacity={0.9} />
      </points>
      <Ray from={[0, 0, 0]} to={[0, 0, 0]} opacity={0} />
    </>
  );
});

export function RetrogradeLoopDiagram() {
  const { pick, digits } = useLocale();
  const { clock, value: t, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: 0,
    max: SYNODIC / 3,
    speed: 30,
  });

  const day = t * 3;
  const copy = { earth: pick("पृथ्वी (छिटो)", "Earth (faster)"), mars: pick("मंगल (सुस्त)", "Mars (slower)"), loop: pick("आकाशमा देखिने बाटो", "Path seen against the sky") };

  return (
    <LearnDiagram3D
      title={pick("३D — मंगलको वक्री गति", "3D — Mars's retrograde loop")}
      height={280}
      camera={{ yaw: 0.4, pitch: 0.95 }}
      frame={{ width: 1.5, height: 0.85 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.earth, label: pick("पृथ्वी", "Earth") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: pick("मंगल", "Mars") },
        { color: DIAGRAM_LABEL_COLOR.rashi, label: pick("तारा-पृष्ठभूमिमा देखिने बिन्दु (लिक)", "Point seen against the stars (trail)") },
      ]}
      readouts={[
        { k: pick("दिन", "Day"), v: digits(Math.round(day)), tone: "accent" },
        { k: pick("सिनोडिक अवधि", "Synodic period"), v: `~${digits(Math.round(SYNODIC))} ${pick("दिन", "days")}` },
      ]}
      slider={{
        value: t,
        min: 0,
        max: SYNODIC / 3,
        label: pick(`दिन ${digits(Math.round(day))}`, `Day ${digits(Math.round(day))}`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      caption={pick(
        "भित्री कक्षमा पृथ्वी बाहिरी कक्षको मंगलभन्दा छिटो घुम्छ। पृथ्वीबाट मंगलतर्फको दृष्टिरेखा तारा-पृष्ठभूमिमा कहाँ पर्छ भनेर हेर्दा — प्रायः यो अगाडि सर्छ, तर पृथ्वीले मंगललाई उछिन्ने बेला केही समयका लागि यो पछाडि सर्छ (वक्री), अनि फेरि अगाडि। यो लूप कतै मंगल वा पृथ्वी गएको ठाउँ होइन — यो दृष्टिरेखाको दिशा मात्र हो।",
        "On the inner orbit, Earth moves faster than Mars on the outer one. Watching where the sightline from Earth to Mars points against the star backdrop, it usually drifts forward — but while Earth overtakes Mars, it drifts backward for a while (retrograde), then resumes forward. This loop is not anywhere either planet actually went — it's only the direction of the sightline.",
      )}
    >
      {({ onLabels }) => <RetrogradeLoopScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
