/**
 * Why latitude decides how much sky you can ever see. A genuine 3D celestial
 * sphere: the polar axis tilted out of the horizon by exactly the observer's
 * latitude, and each star riding a diurnal circle around that axis — entirely
 * above the horizon (circumpolar, never sets), crossing it (rises and sets),
 * or entirely below (never rises). Native 3D reimagining of web's
 * `CircumpolarSky` (edge-on flat projection) — this one is a better fit for
 * real 3D than the original SVG. Tier 2.
 */
import { memo, useEffect } from "react";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const LAT = 27.7;
const LIMIT = 90 - LAT;
const R = 0.55;
const D2R = Math.PI / 180;
const AXIS = new THREE.Vector3(-Math.cos(LAT * D2R), Math.sin(LAT * D2R), 0).normalize();
const UP = new THREE.Vector3(0, 1, 0);
const AXIS_QUAT = new THREE.Quaternion().setFromUnitVectors(UP, AXIS);

const NEVER_SETS = "#35d05a";
const RISES = "#8fb6d8";
const NEVER_RISES = "#ef4444";

const TRACKS = [
  { dec: 78, kind: "never-sets" as const },
  { dec: LIMIT, kind: "never-sets" as const },
  { dec: 20, kind: "rises" as const },
  { dec: 0, kind: "rises" as const },
  { dec: -40, kind: "rises" as const },
  { dec: -LIMIT, kind: "never-rises" as const },
  { dec: -78, kind: "never-rises" as const },
];
const COLOR = { "never-sets": NEVER_SETS, rises: RISES, "never-rises": NEVER_RISES };

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { pole: string; horizon: string } };

const CircumpolarSkyScene = memo(function CircumpolarSkyScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    const poleTip = AXIS.clone().multiplyScalar(R * 1.15);
    projector.push({ id: "pole", text: copy.pole, color: DIAGRAM_LABEL_COLOR.rashi, size: 9 }, [poleTip.x, poleTip.y, poleTip.z]);
    projector.push({ id: "horizon", text: copy.horizon, color: DIAGRAM_LABEL_COLOR.dim, size: 8 }, [0, 0.01, R * 1.1]);
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {/* the horizon plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 1.05, 48]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.grid} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* the celestial sphere, faint */}
      <mesh>
        <sphereGeometry args={[R, 24, 24]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.grid} transparent opacity={0.05} wireframe />
      </mesh>
      {/* the polar axis */}
      <mesh position={AXIS.clone().multiplyScalar(0)} quaternion={AXIS_QUAT}>
        <cylinderGeometry args={[0.006, 0.006, R * 2.1, 8]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.rashi} transparent opacity={0.6} />
      </mesh>
      {/* diurnal circles */}
      {TRACKS.map((track, i) => {
        const radius = R * Math.cos(track.dec * D2R);
        const offset = R * Math.sin(track.dec * D2R);
        const isLimit = Math.abs(Math.abs(track.dec) - LIMIT) < 0.01;
        const center = AXIS.clone().multiplyScalar(offset);
        return (
          <mesh key={i} position={center} quaternion={AXIS_QUAT}>
            <torusGeometry args={[radius, isLimit ? 0.007 : 0.004, 8, 64]} />
            <meshBasicMaterial color={COLOR[track.kind]} transparent opacity={isLimit ? 0.95 : 0.55} />
          </mesh>
        );
      })}
    </>
  );
});

export function CircumpolarSkyDiagram() {
  const { pick, digits } = useLocale();
  const copy = { pole: pick("आकाशीय ध्रुव", "Celestial pole"), horizon: pick("क्षितिज", "Horizon") };

  return (
    <LearnDiagram3D
      title={pick("३D — परिध्रुवीय तारा", "3D — circumpolar stars")}
      height={280}
      camera={{ yaw: 0.6, pitch: 0.6 }}
      frame={{ width: 1.5, height: 0.85 }}
      idleSpin={0.03}
      legend={[
        { color: NEVER_SETS, label: pick("कहिल्यै अस्ताउँदैन (परिध्रुवीय)", "Never sets (circumpolar)") },
        { color: RISES, label: pick("उदाउँछ र अस्ताउँछ", "Rises and sets") },
        { color: NEVER_RISES, label: pick("कहिल्यै उदाउँदैन", "Never rises") },
      ]}
      readouts={[
        { k: pick("अक्षांश (काठमाडौँ)", "Latitude (Kathmandu)"), v: `${digits("27.7")}°N`, tone: "accent" },
        { k: pick("परिध्रुवीय सीमा", "Circumpolar limit"), v: `±${digits("62.3")}°` },
      ]}
      caption={pick(
        "आकाशीय ध्रुव क्षितिजबाट ठ्याक्कै अवलोककको अक्षांश (काठमाडौँमा २७.७°) माथि उठ्छ, र हरेक तारा त्यही अक्षको वरिपरि दैनिक वृत्तमा घुमेको देखिन्छ। पूरै क्षितिजभन्दा माथि पर्ने वृत्त कहिल्यै अस्त्दैन (परिध्रुवीय); पूरै तल पर्ने कहिल्यै उदाउँदैन; बीचमा काट्ने उदाउँछ र अस्ताउँछ। काठमाडौँको सीमा ±६२.३° हो — सप्तर्षि यसभित्र पर्छ, क्रक्स पर्दैन।",
        "The celestial pole rises above the horizon by exactly the observer's latitude — 27.7° at Kathmandu — and every star circles that axis on its own diurnal circle. A circle entirely above the horizon never sets (circumpolar); entirely below, it never rises; crossing it, the star rises and sets. Kathmandu's limit is ±62.3° — the Saptarishi falls inside it, Crux does not.",
      )}
    >
      {({ onLabels }) => <CircumpolarSkyScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
