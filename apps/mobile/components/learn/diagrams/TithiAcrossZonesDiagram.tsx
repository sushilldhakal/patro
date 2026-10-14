/**
 * The same instant, two places, two different tithis — and no disagreement.
 * A tithi ends at one absolute moment for the whole planet; what differs is
 * where each place's sunrise falls relative to it. Native 3D reimagining of
 * web's `TithiAcrossZones` (flat SVG, two timelines); Tier 2.
 */
import { memo, useEffect } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { tFor } from "@vedic-patro/i18n/runtime";

const PLACES = [
  { get ne() { return tFor("ne", "learn.diagrams.city_kathmandu"); }, get en() { return tFor("en", "learn.diagrams.city_kathmandu"); }, tz: "UTC+05:45", end: 3.75, rise: 6.17, before: true },
  { get ne() { return tFor("ne", "learn.diagrams.city_sydney"); }, get en() { return tFor("en", "learn.diagrams.city_sydney"); }, tz: "UTC+11:00", end: 9.0, rise: 6.5, before: false },
];
const L = -0.55;
const Rr = 0.55;
const xOf = (h: number) => L + (h / 12) * (Rr - L);
const rowZ = (i: number) => -0.14 + i * 0.28;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; copy: { sunrise: string; before: string; after: string } };

const TithiAcrossZonesScene = memo(function TithiAcrossZonesScene({ onLabels, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  useEffect(() => {
    if (!projector.begin()) return;
    PLACES.forEach((p, i) => {
      const z = rowZ(i);
      projector.push({ id: `place-${i}`, text: p.ne, color: DIAGRAM_LABEL_COLOR.body, size: 9 }, [L - 0.1, 0.05, z]);
      projector.push({ id: `rise-${i}`, text: copy.sunrise, color: DIAGRAM_LABEL_COLOR.rashi, size: 7 }, [xOf(p.rise), 0.1, z]);
      projector.push(
        { id: `res-${i}`, text: p.before ? copy.before : copy.after, color: p.before ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_LABEL_COLOR.rashi, size: 7 },
        [Rr + 0.05, 0.04, z],
      );
    });
    projector.end();
  }, [projector, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {PLACES.map((p, i) => {
        const z = rowZ(i);
        return (
          <group key={p.ne}>
            <mesh position={[0, 0, z]}>
              <boxGeometry args={[Rr - L, 0.004, 0.006]} />
              <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
            </mesh>
            {/* sunrise */}
            <mesh position={[xOf(p.rise), 0.03, z]}>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
            </mesh>
            {/* the tithi-end boundary, absolute across both rows */}
            <mesh position={[xOf(p.end), 0.02, z]}>
              <boxGeometry args={[0.006, 0.12, 0.02]} />
              <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
            </mesh>
          </group>
        );
      })}
    </>
  );
});

export function TithiAcrossZonesDiagram() {
  const { t, digits } = useLocale();
  const copy = {
    sunrise: t("kundali.sunrise"),
    before: t("ui.learn.tithi_ended_before_sunrise"),
    after: t("ui.learn.tithi_ended_after_sunrise"),
  };

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_same_instant_two_places_two")}
      height={230}
      camera={{ yaw: 0.1, pitch: 0.6 }}
      frame={{ width: 1.4, height: 0.6 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: t("kundali.sunrise") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("ui.learn.tithi_end_instant_global") },
      ]}
      readouts={[
        { k: t("ui.learn.tithi_ends"), v: `${digits("22:00")} UTC`, tone: "accent" },
        { k: t("learn.diagrams.city_kathmandu"), v: t("ui.learn.ended_before_sunrise"), tone: "warn" },
        { k: t("learn.diagrams.city_sydney"), v: t("ui.learn.ended_after_sunrise") },
      ]}
      caption={t("ui.learn.a_tithi_ends_at_one_absolute")}
    >
      {({ onLabels }) => <TithiAcrossZonesScene onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
