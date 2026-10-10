/**
 * The ten missing days of October 1582 — and how long other countries kept
 * using the Julian calendar after Rome switched. Native 3D reimagining of
 * web's `GregorianJump` (flat SVG date tiles); Tier 1.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const BEFORE = [1, 2, 3, 4];
const AFTER = [15, 16, 17, 18];
const ADOPTERS = [
  { ne: "इटाली · स्पेन · पोर्तुगाल", en: "Italy · Spain · Portugal", year: 1582, days: 10 },
  { ne: "बेलायत", en: "Britain", year: 1752, days: 11 },
  { ne: "रुस", en: "Russia", year: 1918, days: 13 },
  { ne: "ग्रीस", en: "Greece", year: 1923, days: 13 },
];

const TILE = 0.16;
const GAP = 0.1;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; digits: (v: string | number) => string };

const GregorianJumpScene = memo(function GregorianJumpScene({ onLabels, digits }: SceneProps) {
  const projector = useLabelProjector(onLabels);
  const all = [...BEFORE.map((d) => ({ d, jump: false })), ...AFTER.map((d) => ({ d, jump: true }))];

  useEffect(() => {
    if (!projector.begin()) return;
    let x = -((all.length - 1) * TILE + GAP) / 2;
    all.forEach((t, i) => {
      if (i > 0 && t.jump && !all[i - 1]!.jump) x += GAP;
      projector.push({ id: `d-${i}`, text: digits(t.d), color: DIAGRAM_LABEL_COLOR.body, size: 10 }, [x, 0.16, 0]);
      x += TILE;
    });
    projector.end();
  }, [projector, digits]);

  let x = -((all.length - 1) * TILE + GAP) / 2;
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 1.2, 1]} intensity={1.2} />
      {all.map((t, i) => {
        if (i > 0 && t.jump && !all[i - 1]!.jump) x += GAP;
        const tileX = x;
        x += TILE;
        return (
          <mesh key={i} position={[tileX, 0, 0]}>
            <boxGeometry args={[TILE * 0.82, 0.06, TILE * 0.82]} />
            <meshStandardMaterial color={t.jump ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_COLOR.orbit} />
          </mesh>
        );
      })}
    </>
  );
});

export function GregorianJumpDiagram() {
  const { pick, digits } = useLocale();

  return (
    <LearnDiagram3D
      title={pick("३D — अक्टोबर १५८२ को १० दिन हराए", "3D — the 10 lost days of October 1582")}
      height={220}
      camera={{ yaw: 0, pitch: 0.6 }}
      frame={{ width: 1.3, height: 0.4 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.orbit, label: pick("जुलियन मिति", "Julian date") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: pick("ग्रेगोरियन मिति (हप्ता नबदली)", "Gregorian date (weekday unbroken)") },
      ]}
      readouts={ADOPTERS.map((a) => ({
        k: pick(a.ne, a.en),
        v: pick(`${digits(a.year)} — ${digits(a.days)} दिन`, `${digits(a.year)} — ${digits(a.days)} days`),
      }))}
      caption={pick(
        "पोप ग्रेगोरी १३ ले १५८२ मा अक्टोबर ४ पछि सिधै अक्टोबर १५ लागू गरे — बीचका १० दिन क्यालेन्डरबाट हराए (हप्ताको क्रम भने अटुट रह्यो — बिहीबार पछि सिधै शुक्रबार)। हरेक देशले फरक-फरक समयमा अपनायो, र जति ढिलो अपनायो त्यति धेरै दिन हराउनुपर्‍यो — किनकि जुलियन र ग्रेगोरियनबीचको फरक हरेक शताब्दीको हिसाबले बढ्दै गयो।",
        "Pope Gregory XIII decreed that October 4, 1582 was followed directly by October 15 — the ten days in between vanished from the calendar (the weekday sequence stayed unbroken — Thursday was followed straight by Friday). Different countries adopted the reform at different times, and the later they switched, the more days they had to drop — the Julian–Gregorian gap kept growing with every century.",
      )}
    >
      {({ onLabels }) => <GregorianJumpScene onLabels={onLabels} digits={digits} />}
    </LearnDiagram3D>
  );
}
