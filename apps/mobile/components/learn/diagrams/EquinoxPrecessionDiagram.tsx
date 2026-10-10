/**
 * How the tropical spring-equinox point slowly regresses through the fixed
 * sidereal zodiac — the real mechanism behind ṛtu drift and the growing
 * ayanamsha. Native 3D reimagining of web's `EquinoxPrecession`
 * (pseudo-3D-in-SVG); Tier 2.
 */
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { RashiRing } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { getRashiName } from "@/lib/rashi-i18n";

const RATE = 50.2879 / 3600; // deg / BS year
const BS_AYAN_ZERO = 342;
const CYCLE = Math.round(360 / RATE); // ~25,772 years
const R = 0.5;

type SceneProps = { clock: DiagramClockRef; onSample?: (year: number) => void; onLabels?: (labels: DiagramLabel[]) => void; copy: { equinox: string; ring: string } };

const EquinoxPrecessionScene = memo(function EquinoxPrecessionScene({ clock, onSample, onLabels, copy }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const markerRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const year = readClock(0.016);
    const eqSid = (((BS_AYAN_ZERO - year) * RATE) % 360 + 360) % 360;
    const a = (eqSid * Math.PI) / 180;
    markerRef.current?.position.set(R * Math.cos(a), 0.02, R * Math.sin(a));

    if (projector.begin()) {
      const [mx, , mz] = [R * 1.2 * Math.cos(a), 0, R * 1.2 * Math.sin(a)];
      projector.push({ id: "equinox", text: copy.equinox, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [mx, 0.1, mz]);
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 1.2, 0.4]} intensity={1.3} />
      <RashiRing inner={R * 0.8} outer={R} opacity={0.55} />
      {/* the ecliptic circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.79, R * 0.8, 64]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.tropical} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.005, 0]}>
        <sphereGeometry args={[0.05, 18, 18]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.028, 14, 14]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
      </mesh>
    </>
  );
});

export function EquinoxPrecessionDiagram() {
  const { pick, digits, lang } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 2082,
    min: 0,
    max: CYCLE,
    speed: 320,
  });

  const eqSid = (((BS_AYAN_ZERO - year) * RATE) % 360 + 360) % 360;
  const rashiIdx = Math.floor(eqSid / 30);
  const ayanamsha = (year - BS_AYAN_ZERO) * RATE;
  const copy = { equinox: pick("वसन्त विषुव बिन्दु", "Spring equinox point"), ring: pick("निरयन राशि (स्थिर)", "Sidereal rashi (fixed)") };

  return (
    <LearnDiagram3D
      title={pick("३D — विषुव बिन्दुको अयन चलन", "3D — precession of the equinox")}
      height={280}
      camera={{ yaw: 0.3, pitch: 0.9 }}
      frame={{ width: 1.4, height: 0.75 }}
      legend={[
        { color: DIAGRAM_COLOR.sidereal, label: copy.ring },
        { color: DIAGRAM_LABEL_COLOR.warn, label: copy.equinox },
      ]}
      readouts={[
        { k: pick("वि.सं. वर्ष", "BS year"), v: digits(Math.round(year)), tone: "accent" },
        { k: pick("विषुव अहिले", "Equinox now in"), v: getRashiName(rashiIdx + 1, lang), tone: "warn" },
        { k: pick("अयनांश (मेषबाट)", "Ayanamsha (from Mesha)"), v: `${digits(ayanamsha < 0 ? (-ayanamsha).toFixed(1) : ayanamsha.toFixed(1))}°` },
      ]}
      slider={{
        value: year,
        min: 0,
        max: CYCLE,
        label: pick(`वि.सं. ${digits(Math.round(year))}`, `BS ${digits(Math.round(year))}`),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("वि.सं. ०", "BS 0"), value: 0 },
        { label: pick("अहिले", "Now"), value: 2082 },
      ]}
      onPreset={scrubTo}
      presetValue={year}
      presetTolerance={200}
      caption={pick(
        "निरयन राशिचक्र (बाहिरी घेरा) ताराहरूसँग स्थिर बाँधिएको छ। तर वसन्त विषुव बिन्दु — सायन शून्य — यो घेराको सापेक्ष बिस्तारै पछाडि सर्छ, प्रति वर्ष करिब ५०.३″, अर्थात् हरेक ~७२ वर्षमा १°। एक पूरा फेरो ~२५,७७२ वर्षमा हुन्छ। यही सरणले अयनांश बढाउँछ र ऋतुलाई निरयन महिनाको सापेक्ष सार्छ।",
        "The sidereal zodiac (outer ring) is fixed to the stars. But the spring equinox point — the tropical zero — slowly regresses relative to this ring, about 50.3″ per year, or 1° every ~72 years. One full loop takes ~25,772 years. This drift is what grows the ayanamsha and shifts the seasons relative to the sidereal months.",
      )}
    >
      {({ onLabels }) => <EquinoxPrecessionScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
