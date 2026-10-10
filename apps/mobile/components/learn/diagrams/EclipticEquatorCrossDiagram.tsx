/**
 * The celestial equator and the ecliptic are two great circles on the same
 * sphere, crossing at exactly 23.44° (the obliquity) — those two crossings
 * are the equinoxes, and the points farthest apart are the solstices. Native
 * 3D reimagining of web's `EclipticEquatorCross` (unrolled flat plot); Tier 1.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { OrbitPath, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const OBLIQUITY = 23.44;
const R = 0.55;

const MARKS = [
  { lon: 0, ne: "वसन्त विषुव", en: "Spring equinox", eq: true },
  { lon: 90, ne: "ग्रीष्म अयनान्त", en: "Summer solstice", eq: false },
  { lon: 180, ne: "शरद् विषुव", en: "Autumn equinox", eq: true },
  { lon: 270, ne: "शीत अयनान्त", en: "Winter solstice", eq: false },
];

function pointOn(ring: readonly (readonly [number, number, number])[], lon: number) {
  const idx = Math.round((lon / 360) * ring.length) % ring.length;
  return ring[idx]!;
}

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; labels: { ne: string; en: string }[] };

const EclipticEquatorCrossScene = memo(function EclipticEquatorCrossScene({ onLabels, labels }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const equator = ellipsePoints(R, 0, 144);
  const eclipticRad = OBLIQUITY * (Math.PI / 180);

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "equator", text: labels[0]!.ne, color: DIAGRAM_LABEL_COLOR.arc, size: 9 }, [R + 0.1, 0, 0]);
    MARKS.forEach((m, i) => {
      const p = pointOn(equator, m.lon);
      const lift = m.eq ? 0 : (m.lon === 90 ? 1 : -1) * Math.sin(eclipticRad) * R * 1.15;
      projector.push({ id: `m-${i}`, text: m.ne, color: m.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal, size: 8 }, [p[0], lift, p[2]]);
    });
    projector.end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projector]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      <OrbitPath points={equator} color={DIAGRAM_COLOR.equator} opacity={0.85} radius={0.006} />
      <group rotation={[eclipticRad, 0, 0]}>
        <OrbitPath points={ellipsePoints(R, 0, 144)} color={DIAGRAM_COLOR.tropical} opacity={0.9} radius={0.006} />
      </group>
      {MARKS.map((m, i) => {
        const eqPoint = pointOn(equator, m.lon);
        const angle = (m.lon / 360) * Math.PI * 2;
        const eclX = R * Math.cos(angle);
        const eclZFlat = R * Math.sin(angle);
        const y = m.eq ? 0 : Math.sin(eclipticRad) * eclZFlat;
        const z = m.eq ? eclZFlat : Math.cos(eclipticRad) * eclZFlat;
        return (
          <mesh key={i} position={[eclX, y, z]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial color={m.eq ? DIAGRAM_COLOR.tropical : DIAGRAM_COLOR.sidereal} />
          </mesh>
        );
      })}
    </>
  );
});

export function EclipticEquatorCrossDiagram() {
  const { pick, digits } = useLocale();
  const labels = [{ ne: "खगोलीय विषुवत् रेखा", en: "Celestial equator" }];

  return (
    <LearnDiagram3D
      title={pick("३D — क्रान्तिवृत्त र विषुवत् रेखाको काट", "3D — where the ecliptic crosses the equator")}
      height={250}
      camera={{ yaw: 0.5, pitch: 0.6 }}
      frame={{ width: 1.3, height: 0.75 }}
      idleSpin={0.04}
      legend={[
        { color: DIAGRAM_COLOR.equator, label: pick("खगोलीय विषुवत् रेखा", "Celestial equator") },
        { color: DIAGRAM_COLOR.tropical, label: pick("क्रान्तिवृत्त", "Ecliptic") },
        { color: DIAGRAM_COLOR.sidereal, label: pick("अयनान्त", "Solstices") },
      ]}
      readouts={[
        { k: pick("तिर्यकता", "Obliquity"), v: `${digits(OBLIQUITY)}°`, tone: "accent" },
        { k: pick("विषुव", "Equinoxes"), v: `${digits(2)}` },
        { k: pick("अयनान्त", "Solstices"), v: `${digits(2)}` },
      ]}
      caption={pick(
        "क्रान्तिवृत्त र खगोलीय विषुवत् रेखा एउटै गोलामा दुई ठूला वृत्त हुन्, र दुई ठूला वृत्त सधैँ दुई ठाउँमा काटिन्छन् — ठ्याक्कै २३.४४° (तिर्यकता) को कोणमा। ती दुई काटछाँट नै विषुव हुन्; दुई वृत्त सबैभन्दा टाढा भएका बिन्दु अयनान्त हुन्। यसरी चार ऋतु-चिह्न चार छुट्टै तथ्य होइनन् — यी त दुई वृत्तको ज्यामितिबाट आउने एउटै कथाका दुई पाटा हुन्।",
        "The ecliptic and the celestial equator are two great circles on the same sphere, and two great circles always cross at two points — exactly at the 23.44° obliquity angle. Those two crossings are the equinoxes; the points where the two circles are farthest apart are the solstices. So the four seasonal markers aren't four separate facts — they're two sides of one geometric story.",
      )}
    >
      {({ onLabels }) => <EclipticEquatorCrossScene onLabels={onLabels} labels={labels} />}
    </LearnDiagram3D>
  );
}
