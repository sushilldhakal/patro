/**
 * The extra month, seen directly: a solar-month row (sankranti every ~30.44
 * days) and a lunar-month row (amavasya every ~29.53 days), aligned on the
 * same timeline. Because the lunar month is shorter, one lunar interval
 * eventually contains no sankranti at all — that lunar month has no solar
 * month to belong to, so it repeats the name of the one after it, prefixed
 * "adhik" (extra). Native 3D reimagining of web's `AdhikMassDiagram` (flat
 * SVG timeline bars) as two floating 3D rows; Tier 3.
 */
import { memo, useEffect, useMemo } from "react";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { getRashiName } from "@/lib/rashi-i18n";

const SOLAR = 30.44;
const SYN = 29.53;
const DAYS = 95;
const SPAN = 1.3;
const xOf = (d: number) => -SPAN / 2 + (d / DAYS) * SPAN;

const SANKR = [0, SOLAR, SOLAR * 2, SOLAR * 3];
const AMAV = [0.6, 0.6 + SYN, 0.6 + SYN * 2, 0.6 + SYN * 3];

function findAdhik(): number {
  for (let i = 0; i < AMAV.length - 1; i++) {
    const inside = SANKR.some((s) => s > AMAV[i]! + 0.01 && s < AMAV[i + 1]! - 0.01);
    if (!inside) return i;
  }
  return -1;
}
const ADHIK = findAdhik();

const LUNAR_NAME = [
  { ne: "वैशाख", en: "Baisakh" },
  { ne: "जेठ", en: "Jestha" },
  { ne: "असार", en: "Ashadh" },
];

function labelFor(i: number, lang: "ne" | "en") {
  const name = (idx: number) => (lang === "en" ? LUNAR_NAME[idx]?.en ?? LUNAR_NAME.at(-1)!.en : LUNAR_NAME[idx]?.ne ?? LUNAR_NAME.at(-1)!.ne);
  if (i < ADHIK) return name(i);
  if (i === ADHIK) return `${lang === "en" ? "Adhik " : "अधिक "}${name(i)}`;
  return name(i - 1);
}

const SOLAR_Z = -0.16;
const LUNAR_Z = 0.16;

type SceneProps = { onLabels?: (labels: DiagramLabel[]) => void; lang: "ne" | "en"; copy: { adhikNote: string; solarRow: string; lunarRow: string } };

const AdhikMaasScene = memo(function AdhikMaasScene({ onLabels, lang, copy }: SceneProps) {
  const projector = useLabelProjector(onLabels);

  const solarSegs = useMemo(
    () => Array.from({ length: SANKR.length - 1 }, (_, i) => ({ x0: SANKR[i]!, x1: SANKR[i + 1]!, rashi: getRashiName(i + 1, lang) })),
    [lang],
  );
  const lunarSegs = useMemo(
    () => Array.from({ length: AMAV.length - 1 }, (_, i) => ({ x0: AMAV[i]!, x1: AMAV[i + 1]!, isAdhik: i === ADHIK, label: labelFor(i, lang) })),
    [lang],
  );

  useEffect(() => {
    if (!projector.begin()) return;
    projector.push({ id: "solar-row", text: copy.solarRow, color: DIAGRAM_COLOR.sun, size: 8 }, [xOf(-3), 0.02, SOLAR_Z - 0.13]);
    projector.push({ id: "lunar-row", text: copy.lunarRow, color: DIAGRAM_LABEL_COLOR.dim, size: 8 }, [xOf(-3), 0.02, LUNAR_Z + 0.13]);
    solarSegs.forEach((s, i) => {
      projector.push({ id: `sol-${i}`, text: s.rashi, color: DIAGRAM_LABEL_COLOR.body, size: 7.5 }, [xOf((s.x0 + s.x1) / 2), 0.05, SOLAR_Z]);
    });
    lunarSegs.forEach((s, i) => {
      projector.push(
        { id: `lun-${i}`, text: s.label, color: s.isAdhik ? DIAGRAM_LABEL_COLOR.warn : DIAGRAM_LABEL_COLOR.body, size: s.isAdhik ? 8.5 : 7.5 },
        [xOf((s.x0 + s.x1) / 2), s.isAdhik ? 0.09 : 0.05, LUNAR_Z],
      );
      if (s.isAdhik) {
        projector.push({ id: "adhik-note", text: copy.adhikNote, color: DIAGRAM_LABEL_COLOR.warn, size: 8 }, [xOf((s.x0 + s.x1) / 2), 0.14, LUNAR_Z]);
      }
    });
    projector.end();
  }, [projector, solarSegs, lunarSegs, copy]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.6]} intensity={1.3} />
      {solarSegs.map((s, i) => {
        const w = xOf(s.x1) - xOf(s.x0);
        return (
          <mesh key={i} position={[xOf(s.x0) + w / 2, 0, SOLAR_Z]}>
            <boxGeometry args={[w - 0.01, 0.025, 0.09]} />
            <meshStandardMaterial color={DIAGRAM_COLOR.sun} transparent opacity={0.35} />
          </mesh>
        );
      })}
      {lunarSegs.map((s, i) => {
        const w = xOf(s.x1) - xOf(s.x0);
        return (
          <mesh key={i} position={[xOf(s.x0) + w / 2, s.isAdhik ? 0.015 : 0, LUNAR_Z]}>
            <boxGeometry args={[w - 0.01, s.isAdhik ? 0.045 : 0.025, 0.09]} />
            <meshStandardMaterial color={s.isAdhik ? DIAGRAM_LABEL_COLOR.warn : "#cbd5e1"} transparent opacity={s.isAdhik ? 0.65 : 0.35} />
          </mesh>
        );
      })}
      {SANKR.map((d, i) => (
        <mesh key={`sk-${i}`} position={[xOf(d), 0.06, SOLAR_Z]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
        </mesh>
      ))}
      {AMAV.map((d, i) => (
        <mesh key={`am-${i}`} position={[xOf(d), -0.04, LUNAR_Z]}>
          <sphereGeometry args={[0.014, 12, 12]} />
          <meshStandardMaterial color={"#1b2430"} />
        </mesh>
      ))}
      <mesh position={[0, -0.09, (SOLAR_Z + LUNAR_Z) / 2]}>
        <boxGeometry args={[SPAN + 0.05, 0.003, 0.003]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
      </mesh>
    </>
  );
});

export function AdhikMaasDiagram() {
  const { pick, digits, lang } = useLocale();
  const adhikLabel = labelFor(ADHIK, lang);
  const copy = {
    adhikNote: pick("↓ अधिक मास", "↓ Adhik month"),
    solarRow: pick("सौर मास · सङ्क्रान्ति (~३०.४ दिन)", "Solar months · sankranti (~30.4 days)"),
    lunarRow: pick("चान्द्र मास · औंसी (~२९.५ दिन)", "Lunar months · amavasya (~29.5 days)"),
  };

  return (
    <LearnDiagram3D
      title={pick("३D — अधिक मास कसरी बन्छ", "3D — how an adhik maas forms")}
      height={260}
      camera={{ yaw: 0.15, pitch: 0.6 }}
      frame={{ width: 1.7, height: 0.65 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: pick("सौर मास (सङ्क्रान्ति)", "Solar month (sankranti)") },
        { color: "#cbd5e1", label: pick("चान्द्र मास (औंसी)", "Lunar month (amavasya)") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: pick("सङ्क्रान्ति-रहित मास = अधिक", "Sankranti-less month = adhik") },
      ]}
      readouts={[
        { k: pick("सौर मास लम्बाइ", "Solar month length"), v: `~${digits(SOLAR.toFixed(1))} ${pick("दिन", "days")}` },
        { k: pick("चान्द्र मास लम्बाइ", "Lunar month length"), v: `~${digits(SYN.toFixed(2))} ${pick("दिन", "days")}` },
        { k: pick("यो चक्रको अधिक मास", "Adhik month here"), v: adhikLabel, tone: "warn" },
      ]}
      caption={pick(
        "सौर मास (सङ्क्रान्तिदेखि सङ्क्रान्तिसम्म) ~३०.४ दिनको हुन्छ, चान्द्र मास (औंसीदेखि औंसीसम्म) ~२९.५ दिनको — हरेक चक्रमा चान्द्र मास छोटो हुँदै जान्छ। समय बित्दै जाँदा कुनै एउटा चान्द्र महिनाभित्र कुनै सङ्क्रान्ति नै पर्दैन — त्यो महिनाको आफ्नै सौर महिना हुँदैन, त्यसैले त्यसले पछिको महिनाको नाम लिन्छ, अगाडि 'अधिक' जोडेर।",
        "A solar month (sankranti to sankranti) runs ~30.4 days; a lunar month (amavasya to amavasya) runs ~29.5 days — the lunar month keeps landing slightly earlier each cycle. Eventually one lunar month contains no sankranti at all — it has no solar month of its own, so it borrows the name of the one after it, with 'adhik' (extra) in front.",
      )}
    >
      {({ onLabels }) => <AdhikMaasScene onLabels={onLabels} lang={lang} copy={copy} />}
    </LearnDiagram3D>
  );
}
