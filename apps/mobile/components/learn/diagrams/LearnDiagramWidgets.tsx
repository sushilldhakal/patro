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
import { ApsidesScene } from "@/components/learn/diagrams/ApsidesScene";
import { northernSummer, perihelionDate, solsticeSunlight } from "@vedic-patro/domain/learn/apsidal-precession";
import { EclipseScene, type EclipseSample } from "@/components/learn/diagrams/EclipseScene";
import { SeasonsScene } from "@/components/learn/diagrams/SeasonsScene";
import { SunEarthMoonScene } from "@/components/learn/diagrams/SunEarthMoonScene";
import { TithiAngleScene } from "@/components/learn/diagrams/TithiAngleScene";
import { Text } from "@/components/ui/Text";
import { bsMonthLabel } from "@vedic-patro/domain/calendar/bs-calendar";
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
import { getRashiName } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { cn } from "@vedic-patro/design-tokens/cn";

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
  const { t, pick, digits, lang } = useLocale();
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
      sun: t("kundali.report.meta_sun"),
      earth: t("vastu.element.earth"),
      moon: t("kundali.graha_name_moon"),
    }),
    [pick],
  );

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_sun_earth_moon")}
      height={280}
      camera={{ yaw: 0.6, pitch: 0.68 }}
      frame={{ width: 1.95, height: 0.85 }}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: t("kundali.report.meta_sun") },
        { color: DIAGRAM_COLOR.earth, label: t("vastu.element.earth") },
        { color: DIAGRAM_COLOR.moon, label: t("kundali.graha_name_moon") },
        { color: DIAGRAM_COLOR.orbit, label: t("ui.learn.rashi_belt") },
      ]}
      readouts={[
        { k: t("learn.solar_month"), v: bsMonthLabel(rashi + 1, lang), tone: "accent" },
        { k: t("ui.learn.sun_s_rashi"), v: getRashiName(rashi + 1, lang) },
        { k: t("learn.sun_longitude"), v: `${digits(Math.round(sunLon))}°` },
        {
          k: t("learn.day_of_year"),
          v: `${digits(Math.round(day))} / ${digits(365)}`,
        },
        {
          k: t("ui.learn.moon_angle"),
          v: `${digits(Math.round(elong))}° · ${
            pakshaFromElongation(elong) === "shukla" ? t("common.paksha_shukla") : t("common.paksha_krishna")
          }`,
        },
        {
          k: t("ui.learn.lunar_months_done"),
          v: `${digits(monthsDone)} / ~${digits(12)}`,
          tone: "warn",
        },
      ]}
      slider={{
        value: day,
        min: 0,
        max: TROPICAL_YEAR,
        label: t("ui.learn.day_of_year_day", { day: digits(Math.round(day)) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("learn.study.sem.preset_year_start"), value: 0 },
        { label: t("ui.learn.n3_months"), value: TROPICAL_YEAR / 4 },
        { label: t("ui.learn.n6_months"), value: TROPICAL_YEAR / 2 },
        { label: t("ui.learn.year_end"), value: TROPICAL_YEAR - 2 },
      ]}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={4}
      caption={t("ui.learn.the_coloured_belt_is_the_12")}
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
  const { t, pick, digits } = useLocale();
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
      sun: t("kundali.report.meta_sun"),
      earth: t("vastu.element.earth"),
      moon: t("kundali.graha_name_moon"),
      tithi: t("tithi"),
      totalAngle: t("ui.learn.total_angle"),
    }),
    [pick],
  );

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_tithi_angle_12")}
      height={272}
      camera={{ yaw: 0, pitch: 0.95 }}
      frame={{ width: 1.6, height: 0.75 }}
      target={TITHI_TARGET}
      idleSpin={0.03}
      legend={[
        { color: DIAGRAM_COLOR.arc, label: t("ui.learn.completed_tithis_12_each") },
        { color: DIAGRAM_COLOR.sun, label: t("ui.learn.tithi_in_progress") },
        { color: DIAGRAM_COLOR.moon, label: t("ui.learn.moon_s_orbit") },
      ]}
      readouts={[
        { k: t("ui.learn.total_angle"), v: `${digits(Math.round(elong))}°`, tone: "accent" },
        {
          k: t("ui.learn.tithis_completed"),
          v: `${digits(Math.floor(elong / 12))} × ${digits(12)}°`,
        },
        { k: t("ui.learn.tithi_running"), v: digits(tithi), tone: "warn" },
        {
          k: t("sections.paksha"),
          v:
            pakshaFromElongation(elong) === "shukla"
              ? t("common.paksha_shukla")
              : t("common.paksha_krishna"),
        },
        { k: t("ui.learn.lit_disc"), v: `${digits(lit)}%` },
        {
          k: t("ui.learn.lunar_day"),
          v: `${digits(day.toFixed(1))} / ${digits(29.5)}`,
        },
      ]}
      slider={{
        value: day,
        min: 0,
        max: SYNODIC_MONTH,
        label: t("ui.learn.lunar_day_value_tithi_tithi", { value: digits(day.toFixed(1)), tithi: digits(tithi) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("ui.learn.new_moon_2"), value: 0 },
        { label: t("ui.learn.first_quarter"), value: SYNODIC_MONTH / 4 },
        { label: t("ui.learn.full_moon"), value: SYNODIC_MONTH / 2 },
        { label: t("ui.learn.last_quarter"), value: (SYNODIC_MONTH * 3) / 4 },
      ]}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={0.6}
      caption={t("ui.learn.tithi_is_the_sun_moon_angle")}
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
  const { t, pick, digits } = useLocale();
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
      sun: t("kundali.report.meta_sun"),
      earth: t("vastu.element.earth"),
      moon: t("kundali.graha_name_moon"),
      node: t("ui.learn.node"),
      umbra: t("ui.learn.umbra"),
    }),
    [pick],
  );

  const elong = sample?.elongDeg ?? elongationFromDay(day);
  const latDeg = sample?.latDeg ?? 0;

  const status =
    sample?.eclipse === "solar"
      ? t("graha_pages.eclipse_solar.title")
      : sample?.eclipse === "lunar"
        ? t("graha_pages.eclipse_lunar.title")
        : t("learn.study.eclipse.status_none");

  return (
    <LearnDiagram3D
      title={
        mode === "solar"
          ? t("ui.learn.n3d_how_a_solar_eclipse_happens")
          : t("ui.learn.n3d_how_a_lunar_eclipse_happens")
      }
      height={290}
      camera={{ yaw: mode === "solar" ? 0.35 : -0.35, pitch: 0.34 }}
      frame={{ width: mode === "solar" ? 2.05 : 2.4, height: 0.8 }}
      target={ECLIPSE_TARGET[mode]}
      idleSpin={0.035}
      legend={[
        { color: DIAGRAM_COLOR.moon, label: t("ui.learn.moon_s_orbit_5_1_tilt") },
        { color: DIAGRAM_COLOR.orbitFaint, label: t("ui.learn.ecliptic") },
        { color: DIAGRAM_COLOR.node, label: t("ui.learn.line_of_nodes") },
      ]}
      readouts={[
        { k: t("ui.learn.elongation"), v: `${digits(Math.round(elong))}°` },
        {
          k: t("ui.learn.ecliptic_latitude"),
          v: `${digits(latDeg.toFixed(2))}°`,
        },
        {
          k: t("ui.learn.status"),
          v: status,
          tone: sample?.eclipse && sample.eclipse !== "none" ? "warn" : "accent",
        },
      ]}
      slider={{
        value: day,
        min: 0,
        max: SYNODIC_MONTH,
        label: t("ui.learn.lunar_day_value", { value: digits(day.toFixed(1)) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("ui.learn.new_moon_2"), value: 0 },
        { label: t("ui.learn.full_moon"), value: SYNODIC_MONTH / 2 },
      ]}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={0.6}
      extraControls={
        <ChipRow
          label={t("ui.learn.line_of_nodes")}
          options={[
            { label: t("ui.learn.eclipse_season_aligned"), value: 0 },
            { label: t("ui.learn.halfway"), value: 45 },
            { label: t("ui.learn.off_season"), value: 90 },
          ]}
          value={nodeAngle}
          onChange={setNodeAngle}
        />
      }
      caption={
        mode === "solar"
          ? t("ui.learn.at_new_moon_the_moon_passes")
          : t("ui.learn.at_full_moon_earth_s_shadow")
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
  const { t, pick, digits, lang } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 2026,
    min: 1900,
    max: 2100,
    speed: 22,
  });

  const ayan = lahiriAyanamsha(year);
  const copy = useMemo(
    () => ({
      sidereal: t("ui.learn.aries_0_sidereal"),
      tropical: t("ui.learn.equinox_tropical"),
      ayanamsha: t("kundali.ayanamsha"),
    }),
    [pick],
  );

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_ayanamsha_lahiri")}
      height={276}
      camera={{ yaw: 0.5, pitch: 0.8 }}
      frame={{ width: 1.7, height: 0.8 }}
      legend={[
        { color: DIAGRAM_COLOR.sidereal, label: t("ui.learn.sidereal_zero") },
        { color: DIAGRAM_COLOR.tropical, label: t("ui.learn.tropical_equinox") },
        { color: DIAGRAM_COLOR.axis, label: t("ui.learn.precession_cone") },
      ]}
      readouts={[
        { k: t("ui.learn.ce"), v: digits(Math.round(year)) },
        { k: t("patro_date.era_bs"), v: digits(Math.round(year) + 57) },
        { k: t("kundali.ayanamsha"), v: `${digits(ayan.toFixed(2))}°`, tone: "accent" },
        {
          k: t("ui.learn.equinox_in_rashi"),
          v: getRashiName(rashiIndexFromLon(360 - ayan) + 1, lang),
        },
      ]}
      slider={{
        value: year,
        min: 1900,
        max: 2100,
        step: 1,
        label: t("ui.learn.ce_year_ayanamsha_value", { year: digits(Math.round(year)), value: digits(ayan.toFixed(2)) }),
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
      caption={t("ui.learn.the_coloured_belt_is_the_sidereal")}
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

/* ── perihelion / aphelion against the seasons ─────────────────────────── */

const APSIDES_MONTH_KEYS = [
  "kundali.x.month_january", "kundali.x.month_february", "kundali.x.month_march", "kundali.x.month_april",
  "kundali.x.month_may", "kundali.x.month_june", "kundali.x.month_july", "kundali.x.month_august",
  "kundali.x.month_september", "kundali.x.month_october", "kundali.x.month_november", "kundali.x.month_december",
] as const;
const APSIDES_MIN = -10000;
const APSIDES_MAX = 14000;

export function ApsidesDiagram() {
  const { t, pick, digits } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 2026,
    min: APSIDES_MIN,
    max: APSIDES_MAX,
    speed: 1400,
  });

  const copy = useMemo(
    () => ({
      sun: t("kundali.report.meta_sun"),
      perihelion: t("learn.apsides.perihelion"),
      aphelion: t("learn.apsides.aphelion"),
      stations: [
        t("ui.learn.december_solstice"),
        t("ui.learn.march_equinox"),
        t("ui.learn.june_solstice"),
        t("ui.learn.september_equinox"),
      ] as [string, string, string, string],
    }),
    [pick],
  );

  const y = Math.round(year);
  const yearText = y < 1 ? t("learn.apsides.bce", { year: digits(1 - y) }) : t("learn.apsides.ce", { year: digits(y) });
  const peri = perihelionDate(year);
  const dateText = `${digits(peri.day)} ${t(APSIDES_MONTH_KEYS[peri.month]!)}`;
  const june = solsticeSunlight(year).june;
  const summer = northernSummer(year);

  return (
    <LearnDiagram3D
      title={t("learn.apsides.title")}
      height={290}
      camera={{ yaw: 0.35, pitch: 0.95 }}
      frame={{ width: 3.4, height: 1.6 }}
      legend={[
        { color: DIAGRAM_COLOR.sun, label: t("learn.apsides.solstice_line") },
        { color: DIAGRAM_COLOR.tropical, label: t("learn.apsides.apsis_line") },
        { color: DIAGRAM_COLOR.orbit, label: t("learn.apsides.orbit") },
      ]}
      readouts={[
        { k: t("learn.apsides.year"), v: yearText },
        { k: t("learn.apsides.perihelion_date"), v: dateText, tone: "accent" },
        { k: t("learn.apsides.june_sun"), v: `${june >= 0 ? "+" : "−"}${digits(Math.abs(june).toFixed(1))}%` },
        { k: t("learn.apsides.north_summer"), v: t(`learn.apsides.${summer}`), tone: summer === "intense" ? "warn" : undefined },
      ]}
      slider={{
        value: year,
        min: APSIDES_MIN,
        max: APSIDES_MAX,
        step: 50,
        label: t("learn.apsides.slider", { year: yearText, date: dateText }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("learn.apsides.preset_ice"), value: -9000 },
        { label: t("learn.apsides.preset_aligned"), value: 1250 },
        { label: t("learn.apsides.preset_today"), value: 2026 },
        { label: t("learn.apsides.preset_future"), value: 11750 },
      ]}
      onPreset={scrubTo}
      presetValue={year}
      presetTolerance={200}
      caption={t("learn.apsides.caption")}
    >
      {({ onLabels }) => <ApsidesScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}

/* ── seasons / axial tilt ─────────────────────────────────────────────── */

export function SeasonsDiagram() {
  const { t, pick, digits } = useLocale();
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: 0,
    max: TROPICAL_YEAR,
    speed: 30,
  });

  const stations = useMemo(
    () =>
      [
        t("ui.learn.march_equinox"),
        t("ui.learn.june_solstice"),
        t("ui.learn.september_equinox"),
        t("ui.learn.december_solstice"),
      ] as [string, string, string, string],
    [pick],
  );

  const copy = useMemo(
    () => ({
      sun: t("kundali.report.meta_sun"),
      earth: t("vastu.element.earth"),
      axis: t("ui.learn.axis_23_44"),
    }),
    [pick],
  );

  const quarter = Math.floor((day / TROPICAL_YEAR) * 4) % 4;

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_axial_tilt_and_the_seasons")}
      height={274}
      camera={{ yaw: 0.7, pitch: 0.5 }}
      frame={{ width: 1.4, height: 0.7 }}
      legend={[
        { color: DIAGRAM_COLOR.axis, label: t("ui.common.earth_s_axis") },
        { color: DIAGRAM_COLOR.equator, label: t("ui.learn.equator") },
        { color: DIAGRAM_COLOR.sun, label: t("ui.learn.equinox_solstice") },
      ]}
      readouts={[
        { k: t("learn.day_of_year"), v: digits(Math.round(day)) },
        { k: t("ui.learn.station"), v: stations[quarter] ?? stations[0], tone: "accent" },
        { k: t("ui.learn.tilt"), v: `${digits(23.44)}°` },
      ]}
      slider={{
        value: day,
        min: 0,
        max: TROPICAL_YEAR,
        label: t("ui.learn.day_of_year_day", { day: digits(Math.round(day)) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={stations.map((label, i) => ({ label, value: (TROPICAL_YEAR / 4) * i }))}
      onPreset={scrubTo}
      presetValue={day}
      presetTolerance={4}
      caption={t("ui.learn.earth_s_axis_keeps_pointing_the")}
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
        style={nepaliTextStyle(10)}
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
                style={nepaliTextStyle(10)}
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
