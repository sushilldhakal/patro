/**
 * The diagrams an article drops in.
 *
 * Each one is a scene plus the numbers around it: what the slider scrubs, what
 * the chips read out, what the legend names. The frame, the camera and
 * fullscreen all come from {@link LearnDiagram3D}.
 */

import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock } from "@/components/learn/diagrams/diagram-clock";
import { AyanamshaScene } from "@/components/learn/diagrams/AyanamshaScene";
import { EclipseScene, type EclipseSample } from "@/components/learn/diagrams/EclipseScene";
import { SeasonsScene } from "@/components/learn/diagrams/SeasonsScene";
import { SunEarthMoonScene } from "@/components/learn/diagrams/SunEarthMoonScene";
import { TithiAngleScene } from "@/components/learn/diagrams/TithiAngleScene";
import { Text } from "@/components/ui/Text";
import { bsMonthLabel } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { DIAGRAM_COLOR } from "@/lib/learn/diagram-theme";
import {
  SYNODIC_MONTH,
  TROPICAL_YEAR,
  earthOrbitFromMeanAnomaly,
  elongationFromDay,
  lahiriAyanamsha,
  lunarMonthsCompleted,
  moonPhaseFraction,
  pakshaFromElongation,
  rashiIndexFromLon,
  sunSiderealLonFromEarthNu,
  tithiIndexFromElongation,
  yearAngleFromDay,
} from "@/lib/learn/sun-earth-moon-math";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { cn } from "@vedic-patro/domain/utils";

/* Framing offsets: the Sun sits off to one side in these two scenes, so the
   camera looks between the bodies rather than at the Earth alone. */
const TITHI_TARGET: [number, number, number] = [0.35, 0, 0];
const ECLIPSE_TARGET = {
  /* A solar eclipse happens on the Sun's side, a lunar one opposite it, so each
     mode leans the framing toward the half that matters. */
  solar: [-0.9, 0, 0] as [number, number, number],
  lunar: [-0.4, 0, 0] as [number, number, number],
};

/* ── Sun · Earth · Moon ───────────────────────────────────────────────── */

export function SunEarthMoonDiagram() {
  const { pick, digits, lang } = useLocale();
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 80,
    min: 0,
    max: TROPICAL_YEAR,
    speed: 26,
  });

  const nu = earthOrbitFromMeanAnomaly(yearAngleFromDay(day)).nuDeg;
  const sunLon = sunSiderealLonFromEarthNu(nu);
  const rashi = rashiIndexFromLon(sunLon);
  const elong = elongationFromDay(day);
  const monthsDone = lunarMonthsCompleted(day);

  const names = useMemo(
    () => ({
      sun: pick("सूर्य", "Sun"),
      earth: pick("पृथ्वी", "Earth"),
      moon: pick("चन्द्र", "Moon"),
    }),
    [pick],
  );

  return (
    <LearnDiagram3D
      title={pick("३D — सूर्य, पृथ्वी, चन्द्र", "3D — Sun, Earth, Moon")}
      height={280}
      camera={{ yaw: 0.6, pitch: 0.68 }}
      frame={{ width: 1.95, height: 0.85 }}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: pick("सूर्य", "Sun") },
        { color: DIAGRAM_COLOR.earth, label: pick("पृथ्वी", "Earth") },
        { color: DIAGRAM_COLOR.moon, label: pick("चन्द्र", "Moon") },
        { color: DIAGRAM_COLOR.orbit, label: pick("राशि पट्टी", "Rashi belt") },
      ]}
      readouts={[
        { k: pick("सौर महिना", "Solar month"), v: bsMonthLabel(rashi + 1, lang), tone: "accent" },
        { k: pick("सूर्य राशि", "Sun's rashi"), v: getRashiName(rashi + 1, lang) },
        { k: pick("सूर्य देशान्तर", "Sun longitude"), v: `${digits(Math.round(sunLon))}°` },
        {
          k: pick("वर्षको दिन", "Day of year"),
          v: `${digits(Math.round(day))} / ${digits(365)}`,
        },
        {
          k: pick("चन्द्र कोण", "Moon angle"),
          v: `${digits(Math.round(elong))}° · ${
            pakshaFromElongation(elong) === "shukla" ? pick("शुक्ल", "Shukla") : pick("कृष्ण", "Krishna")
          }`,
        },
        {
          k: pick("चान्द्र महिना सकिए", "Lunar months done"),
          v: `${digits(monthsDone)} / ~${digits(12)}`,
          tone: "warn",
        },
      ]}
      slider={{
        value: day,
        min: 0,
        max: TROPICAL_YEAR,
        label: pick(
          `वर्षको दिन ${digits(Math.round(day))}`,
          `Day of year ${digits(Math.round(day))}`,
        ),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("वर्षारम्भ", "Year start"), value: 0 },
        { label: pick("३ महिना", "+3 months"), value: TROPICAL_YEAR / 4 },
        { label: pick("६ महिना", "+6 months"), value: TROPICAL_YEAR / 2 },
        { label: pick("वर्षान्त", "Year end"), value: TROPICAL_YEAR - 2 },
      ]}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={4}
      caption={pick(
        "बाहिरी रङ्गीन पट्टी १२ निरयन राशि हो — पृथ्वीबाट सूर्य कुन राशिमा देखिन्छ, त्यही रेखाले देखाउँछ। सीमा नाघ्दा संक्रान्ति। पृथ्वीले एक फेरो लगाउँदा चन्द्रले ~१२.४ फेरो लगाउँछ, त्यही ~११ दिनको फरकले अधिक मास जन्माउँछ।",
        "The coloured belt is the 12 sidereal rashis; the ray from Earth shows which one the Sun stands in — crossing a boundary is sankranti. Earth makes one lap while the Moon makes ~12.4, and that ~11-day gap is what adhik maas corrects.",
      )}
    >
      {({ onLabels }) => (
        <SunEarthMoonScene
          clock={clock}
          onSample={onSample}
          onLabels={onLabels}
          lang={lang}
          names={names}
        />
      )}
    </LearnDiagram3D>
  );
}

/* ── tithi angle ──────────────────────────────────────────────────────── */

export function TithiAngleDiagram() {
  const { pick, digits } = useLocale();
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 8,
    min: 0,
    max: SYNODIC_MONTH,
    speed: 2.4,
  });

  const elong = elongationFromDay(day);
  const tithi = tithiIndexFromElongation(elong);
  const lit = Math.round(moonPhaseFraction(elong) * 100);

  const copy = useMemo(
    () => ({
      sun: pick("सूर्य", "Sun"),
      earth: pick("पृथ्वी", "Earth"),
      moon: pick("चन्द्र", "Moon"),
      tithi: pick("तिथि", "Tithi"),
      totalAngle: pick("कुल कोण", "Total angle"),
    }),
    [pick],
  );

  return (
    <LearnDiagram3D
      title={pick("३D — तिथि कोण (१२°)", "3D — tithi angle (12°)")}
      height={272}
      camera={{ yaw: 0, pitch: 0.95 }}
      frame={{ width: 1.6, height: 0.75 }}
      target={TITHI_TARGET}
      idleSpin={0.03}
      legend={[
        { color: DIAGRAM_COLOR.arc, label: pick("पूरा भएका तिथि (१२° each)", "Completed tithis (12° each)") },
        { color: DIAGRAM_COLOR.sun, label: pick("चालु तिथि", "Tithi in progress") },
        { color: DIAGRAM_COLOR.moon, label: pick("चन्द्र कक्ष", "Moon's orbit") },
      ]}
      readouts={[
        { k: pick("कुल कोण", "Total angle"), v: `${digits(Math.round(elong))}°`, tone: "accent" },
        {
          k: pick("पूरा भएका तिथि", "Tithis completed"),
          v: `${digits(Math.floor(elong / 12))} × ${digits(12)}°`,
        },
        { k: pick("चालु तिथि", "Tithi running"), v: digits(tithi), tone: "warn" },
        {
          k: pick("पक्ष", "Paksha"),
          v:
            pakshaFromElongation(elong) === "shukla"
              ? pick("शुक्ल", "Shukla")
              : pick("कृष्ण", "Krishna"),
        },
        { k: pick("उज्यालो भाग", "Lit disc"), v: `${digits(lit)}%` },
        {
          k: pick("चान्द्र दिन", "Lunar day"),
          v: `${digits(day.toFixed(1))} / ${digits(29.5)}`,
        },
      ]}
      slider={{
        value: day,
        min: 0,
        max: SYNODIC_MONTH,
        label: pick(
          `चान्द्र दिन ${digits(day.toFixed(1))} · तिथि ${digits(tithi)}`,
          `Lunar day ${digits(day.toFixed(1))} · tithi ${digits(tithi)}`,
        ),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("अमावस्या", "New moon"), value: 0 },
        { label: pick("अष्टमी", "First quarter"), value: SYNODIC_MONTH / 4 },
        { label: pick("पूर्णिमा", "Full moon"), value: SYNODIC_MONTH / 2 },
        { label: pick("कृष्ण अष्टमी", "Last quarter"), value: (SYNODIC_MONTH * 3) / 4 },
      ]}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={0.6}
      caption={pick(
        "पृथ्वीबाट हेर्दा सूर्य र चन्द्रबीचको कोण नै तिथिको आधार हो। एक तिथि = १२° — सिंगो कोण होइन। चापमा देखिने प्रत्येक हरियो टुक्रा एउटा पूरा भएको तिथि हो; पहेंलो टुक्रा अहिले चलिरहेको तिथि। जस्तै ९८° = ८ × १२° + २°, अर्थात् ८ तिथि सकिएर ९औँ चलिरहेको। ३० तिथिमा एक चान्द्र महिना पूरा हुन्छ।",
        "Tithi is the Sun–Moon angle seen from Earth, and one tithi is 12° of it — not the whole sweep. Each green block on the arc is one completed tithi; the amber block is the one running now. So 98° = 8 × 12° + 2°: eight tithis closed and the 9th in progress. Thirty of them close a lunar month.",
      )}
    >
      {({ onLabels }) => (
        <TithiAngleScene
          clock={clock}
          onSample={onSample}
          onLabels={onLabels}
          labels={copy}
          digits={digits}
        />
      )}
    </LearnDiagram3D>
  );
}

/* ── eclipses ─────────────────────────────────────────────────────────── */

type EclipseMode = "solar" | "lunar";

export function EclipseDiagram({ mode }: { mode: EclipseMode }) {
  const { pick, digits } = useLocale();
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: mode === "solar" ? 0 : SYNODIC_MONTH / 2,
    min: 0,
    max: SYNODIC_MONTH,
    speed: 2.2,
  });
  /* 0° puts the line of nodes on the Sun–Earth line — an eclipse season.
     90° turns it side-on, which is why most months pass with nothing. */
  const [nodeAngle, setNodeAngle] = useState(0);
  const [sample, setSample] = useState<EclipseSample | null>(null);

  const handleSample = useCallback(
    (next: EclipseSample) => {
      setSample(next);
      onSample(next.day);
    },
    [onSample],
  );

  const copy = useMemo(
    () => ({
      sun: pick("सूर्य", "Sun"),
      earth: pick("पृथ्वी", "Earth"),
      moon: pick("चन्द्र", "Moon"),
      node: pick("पात", "Node"),
      umbra: pick("छायाँ", "Umbra"),
    }),
    [pick],
  );

  const elong = sample?.elongDeg ?? elongationFromDay(day);
  const latDeg = sample?.latDeg ?? 0;

  const status =
    sample?.eclipse === "solar"
      ? pick("सूर्य ग्रहण", "Solar eclipse")
      : sample?.eclipse === "lunar"
        ? pick("चन्द्र ग्रहण", "Lunar eclipse")
        : pick("ग्रहण छैन", "No eclipse");

  return (
    <LearnDiagram3D
      title={
        mode === "solar"
          ? pick("३D — सूर्य ग्रहण कसरी", "3D — how a solar eclipse happens")
          : pick("३D — चन्द्र ग्रहण कसरी", "3D — how a lunar eclipse happens")
      }
      height={290}
      camera={{ yaw: mode === "solar" ? 0.35 : -0.35, pitch: 0.34 }}
      frame={{ width: mode === "solar" ? 2.05 : 2.4, height: 0.8 }}
      target={ECLIPSE_TARGET[mode]}
      idleSpin={0.035}
      legend={[
        { color: DIAGRAM_COLOR.moon, label: pick("चन्द्र कक्ष (५.१° झुकाव)", "Moon's orbit (5.1° tilt)") },
        { color: DIAGRAM_COLOR.orbitFaint, label: pick("क्रान्तिवृत्त", "Ecliptic") },
        { color: DIAGRAM_COLOR.node, label: pick("पात रेखा", "Line of nodes") },
      ]}
      readouts={[
        { k: pick("कोण", "Elongation"), v: `${digits(Math.round(elong))}°` },
        {
          k: pick("क्रान्ति अक्षांश", "Ecliptic latitude"),
          v: `${digits(latDeg.toFixed(2))}°`,
        },
        {
          k: pick("अवस्था", "Status"),
          v: status,
          tone: sample?.eclipse && sample.eclipse !== "none" ? "warn" : "accent",
        },
      ]}
      slider={{
        value: day,
        min: 0,
        max: SYNODIC_MONTH,
        label: pick(
          `चान्द्र दिन ${digits(day.toFixed(1))}`,
          `Lunar day ${digits(day.toFixed(1))}`,
        ),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: pick("अमावस्या", "New moon"), value: 0 },
        { label: pick("पूर्णिमा", "Full moon"), value: SYNODIC_MONTH / 2 },
      ]}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={0.6}
      extraControls={
        <ChipRow
          label={pick("पात रेखा", "Line of nodes")}
          options={[
            { label: pick("ग्रहण ऋतु (मिलेको)", "Eclipse season (aligned)"), value: 0 },
            { label: pick("आंशिक", "Halfway"), value: 45 },
            { label: pick("मिलेको छैन", "Off-season"), value: 90 },
          ]}
          value={nodeAngle}
          onChange={setNodeAngle}
        />
      }
      caption={
        mode === "solar"
          ? pick(
              "अमावस्यामा चन्द्र सूर्य र पृथ्वीको बीचमा पर्छ, तर उसको कक्ष ५.१° झुकेको हुनाले प्रायः छायाँ पृथ्वीभन्दा माथि वा तल जान्छ। पात रेखा सूर्यतिर फर्केको बेला मात्र छायाँ पृथ्वीमा पर्छ — त्यही सूर्य ग्रहण।",
              "At new moon the Moon passes between Sun and Earth, but its orbit is tilted 5.1°, so its shadow usually sails above or below us. Only when the line of nodes points at the Sun does the shadow land — that is a solar eclipse.",
            )
          : pick(
              "पूर्णिमामा पृथ्वीको छायाँ चन्द्रतिर जान्छ। झुकावका कारण चन्द्र प्रायः त्यो छायाँभन्दा माथि वा तलबाट गुज्रन्छ; पात नजिक परेको पूर्णिमामा मात्र चन्द्र छायाँभित्र पस्छ — चन्द्र ग्रहण।",
              "At full moon Earth's shadow stretches away from the Sun. The tilt usually carries the Moon clear of it; only at a full moon near a node does the Moon enter the shadow — a lunar eclipse.",
            )
      }
    >
      {({ onLabels }) => (
        <EclipseScene
          clock={clock}
          nodeAngleDeg={nodeAngle}
          onSample={handleSample}
          onLabels={onLabels}
          copy={copy}
        />
      )}
    </LearnDiagram3D>
  );
}

/* ── ayanamsha ────────────────────────────────────────────────────────── */

export function AyanamshaDiagram() {
  const { pick, digits, lang } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 2026,
    min: 1900,
    max: 2100,
    speed: 22,
  });

  const ayan = lahiriAyanamsha(year);
  const copy = useMemo(
    () => ({
      sidereal: pick("मेष ०° (निरयन)", "Aries 0° (sidereal)"),
      tropical: pick("विषुव (सायन)", "Equinox (tropical)"),
      ayanamsha: pick("अयनांश", "Ayanamsha"),
    }),
    [pick],
  );

  return (
    <LearnDiagram3D
      title={pick("३D — अयनांश (लाहिरी)", "3D — ayanamsha (Lahiri)")}
      height={276}
      camera={{ yaw: 0.5, pitch: 0.8 }}
      frame={{ width: 1.7, height: 0.8 }}
      legend={[
        { color: DIAGRAM_COLOR.sidereal, label: pick("निरयन शून्य", "Sidereal zero") },
        { color: DIAGRAM_COLOR.tropical, label: pick("सायन विषुव", "Tropical equinox") },
        { color: DIAGRAM_COLOR.axis, label: pick("अक्ष चलन शंकु", "Precession cone") },
      ]}
      readouts={[
        { k: pick("ई.सं.", "CE"), v: digits(Math.round(year)) },
        { k: pick("वि.सं.", "BS"), v: digits(Math.round(year) + 57) },
        { k: pick("अयनांश", "Ayanamsha"), v: `${digits(ayan.toFixed(2))}°`, tone: "accent" },
        {
          k: pick("विषुव राशि", "Equinox in rashi"),
          v: getRashiName(rashiIndexFromLon(360 - ayan) + 1, lang),
        },
      ]}
      slider={{
        value: year,
        min: 1900,
        max: 2100,
        step: 1,
        label: pick(
          `ई.सं. ${digits(Math.round(year))} · अयनांश ${digits(ayan.toFixed(2))}°`,
          `CE ${digits(Math.round(year))} · ayanamsha ${digits(ayan.toFixed(2))}°`,
        ),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: digits(1900), value: 1900 },
        { label: digits(2000), value: 2000 },
        { label: digits(2026), value: 2026 },
        { label: digits(2100), value: 2100 },
      ]}
      onPreset={scrubTo}
      presetValue={year}
      presetTolerance={1}
      caption={pick(
        "रङ्गीन पट्टी ताराहरूसँग बाँधिएको निरयन राशिचक्र हो। सायन विषुव त्यही पट्टीमा पछाडि सर्दै जान्छ — प्रति ७२ वर्ष लगभग १°। दुईबीचको कोण नै अयनांश, र पञ्चाङ्गले सायन गणनाबाट निरयन स्थान निकाल्न यही घटाउँछ।",
        "The coloured belt is the sidereal zodiac, pinned to the stars. The tropical equinox creeps backwards through it — roughly 1° every 72 years. The angle between the two is the ayanamsha, and it is exactly what a panchanga subtracts to turn tropical positions into sidereal ones.",
      )}
    >
      {({ onLabels }) => (
        <AyanamshaScene
          clock={clock}
          onSample={onSample}
          onLabels={onLabels}
          copy={copy}
          digits={digits}
        />
      )}
    </LearnDiagram3D>
  );
}

/* ── seasons / axial tilt ─────────────────────────────────────────────── */

export function SeasonsDiagram() {
  const { pick, digits } = useLocale();
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: 0,
    max: TROPICAL_YEAR,
    speed: 30,
  });

  const stations = useMemo(
    () =>
      [
        pick("वसन्त विषुव", "March equinox"),
        pick("ग्रीष्म अयनान्त", "June solstice"),
        pick("शरद् विषुव", "September equinox"),
        pick("शीत अयनान्त", "December solstice"),
      ] as [string, string, string, string],
    [pick],
  );

  const copy = useMemo(
    () => ({
      sun: pick("सूर्य", "Sun"),
      earth: pick("पृथ्वी", "Earth"),
      axis: pick("अक्ष २३.४४°", "Axis 23.44°"),
    }),
    [pick],
  );

  const quarter = Math.floor((day / TROPICAL_YEAR) * 4) % 4;

  return (
    <LearnDiagram3D
      title={pick("३D — अक्षीय झुकाव र ऋतु", "3D — axial tilt and the seasons")}
      height={274}
      camera={{ yaw: 0.7, pitch: 0.5 }}
      frame={{ width: 1.4, height: 0.7 }}
      legend={[
        { color: DIAGRAM_COLOR.axis, label: pick("पृथ्वीको अक्ष", "Earth's axis") },
        { color: DIAGRAM_COLOR.equator, label: pick("भूमध्य रेखा", "Equator") },
        { color: DIAGRAM_COLOR.sun, label: pick("विषुव/अयनान्त", "Equinox / solstice") },
      ]}
      readouts={[
        { k: pick("वर्षको दिन", "Day of year"), v: digits(Math.round(day)) },
        { k: pick("स्थिति", "Station"), v: stations[quarter] ?? stations[0], tone: "accent" },
        { k: pick("झुकाव", "Tilt"), v: `${digits(23.44)}°` },
      ]}
      slider={{
        value: day,
        min: 0,
        max: TROPICAL_YEAR,
        label: pick(
          `वर्षको दिन ${digits(Math.round(day))}`,
          `Day of year ${digits(Math.round(day))}`,
        ),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={stations.map((label, i) => ({ label, value: (TROPICAL_YEAR / 4) * i }))}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={4}
      caption={pick(
        "पृथ्वीको अक्ष वर्षभरि एउटै दिशामा तन्किएको रहन्छ — सूर्यतिर ढल्किने र फर्किने होइन। परिक्रमाका कारण कहिले उत्तरी ध्रुव सूर्यतिर पर्छ (लामो दिन), कहिले पर — यही फेरबदलले ऋतु बनाउँछ, र दुई विषुवमा दिन र रात बराबर हुन्छन्।",
        "Earth's axis keeps pointing the same way all year — it does not tip toward the Sun and back. As Earth travels, the north pole leans sunward for half the orbit and away for the other half; that is the seasons, and the two equinoxes are where day and night come out equal.",
      )}
    >
      {({ onLabels }) => (
        <SeasonsScene
          clock={clock}
          onSample={onSample}
          onLabels={onLabels}
          stations={stations}
          copy={copy}
        />
      )}
    </LearnDiagram3D>
  );
}

/* ── shared control ───────────────────────────────────────────────────── */

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View className="gap-1">
      <Text
        className="text-caption uppercase tracking-wide text-muted-foreground"
        style={[nepaliTextStyle(10), { fontSize: 15 }]}
      >
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.label}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              className={cn(
                "rounded-full border px-2.5 py-1",
                active ? "border-primary bg-primary/20" : "border-border bg-muted/20",
              )}
            >
              <Text
                className={cn(
                  "text-caption font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                style={[nepaliTextStyle(10), { fontSize: 15 }]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
