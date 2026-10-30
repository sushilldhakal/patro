/**
 * Perihelion (उपसौर) and aphelion (अपसौर) against the seasons, Sun-centred —
 * the app's drawing of the website's `ApsidesOrbit`.
 *
 * The Sun sits in the middle, Earth's orbit is the first ring (an oval, its
 * shape exaggerated, with the Sun at one focus) and the sidereal rashi
 * mandala is the outer ring. Four Earths mark the equinoxes and solstices —
 * places set by Earth's tilted axis, drifting backwards with precession — and
 * the orbit's oval turns the other way, carrying perihelion and aphelion, so
 * the two drift through each other once in ~21,000 years.
 */
import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { illustration } from "@vedic-patro/design-tokens";
import { bsMonthLabel } from "@vedic-patro/domain/calendar/bs-calendar";
import { getRashiName } from "@vedic-patro/domain/panchanga/rashi-i18n";
import {
  CLIMATIC_PRECESSION_YEARS,
  northernSummer,
  perihelionBsDate,
  perihelionNearestCardinal,
  perihelionSiderealLongitude,
  solsticeSunlight,
} from "@vedic-patro/domain/learn/apsidal-precession";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock, type DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { useLearnTextures } from "@/components/learn/diagrams/learn-textures";
import { Globe, OrbitPath, RashiRing, SunBody, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

const RATE = 50.2879 / 3600; // precession, degrees per year
const BS_AYAN_ZERO = 342;
const CE_TO_BS = 57;
const NOW_BS = 2083;
const Y_MIN = -50000;
const Y_MAX = 50000;
/** Beyond this many years from today the constant-rate model is only indicative. */
const RELIABLE_YEARS = 20000;
const TILT = 23.44;
const RAD = Math.PI / 180;

const RING_IN = 0.52;
const RING_OUT = 0.64;
/* Drawn orbit: exaggerated (Earth's real 0.017 looks round), far end inside the rashi ring. */
/* Clearly oval so the near end (perihelion) and far end (aphelion) read at a glance. */
const ORBIT_E = 0.35;
const ORBIT_A = 0.44 / (1 + ORBIT_E);
const PERI_R = ORBIT_A * (1 - ORBIT_E);
const APH_R = ORBIT_A * (1 + ORBIT_E);
/* ellipsePoints runs (cos, sin); this scene, like RashiRing, runs (cos, −sin). */
const ORBIT_POINTS = ellipsePoints(ORBIT_A, ORBIT_E, 120, 0).map(([x, y, z]) => [x, y, -z] as [number, number, number]);
const APHELION_COLOR = illustration.violet65;

const norm360 = (a: number) => ((a % 360) + 360) % 360;
/** A point in the ecliptic plane at a longitude, the same way round as RashiRing's segments. */
const at = (lonDeg: number, r: number, y = 0): [number, number, number] => [
  r * Math.cos(lonDeg * RAD),
  y,
  -r * Math.sin(lonDeg * RAD),
];
const orbitR = (lon: number, periLon: number) =>
  (ORBIT_A * (1 - ORBIT_E * ORBIT_E)) / (1 + ORBIT_E * Math.cos((lon - periLon) * RAD));

/** Everything the scene needs for one year, from the shared apsidal model. */
/* The rashi mandala is the stars and never moves; the season Earths and the orbit move against it. */
function layout(year: number) {
  const ayan = (year - BS_AYAN_ZERO) * RATE;
  const eqSid = norm360(-ayan); // the Sun's sidereal longitude at the March equinox
  const earthAt = (sunLon: number) => sunLon + 180;
  return {
    ayan,
    eqSid,
    periLon: earthAt(perihelionSiderealLongitude(year - CE_TO_BS, ayan)),
    seasonLons: [0, 1, 2, 3].map((k) => earthAt(eqSid + k * 90)),
    /** North end of the axis leans toward where the Sun is at the June solstice. */
    axisLon: eqSid + 90,
  };
}

/** Where perihelion sits today — the faint reference orbit. */
const TODAY_PERI_LON = layout(NOW_BS).periLon;

type Copy = { sun: string; seasons: string[]; perihelion: string; aphelion: string; rashis: string[] };

const ApsidesOrbitScene = memo(function ApsidesOrbitScene({
  clock,
  onSample,
  onLabels,
  copy,
}: {
  clock: DiagramClockRef;
  onSample?: (year: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: Copy;
}) {
  const textures = useLearnTextures();
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const orbitRef = useRef<THREE.Group>(null);
  const todayRef = useRef<THREE.Group>(null);
  const earthRefs = useRef<(THREE.Group | null)[]>([]);
  const tiltRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const year = readClock(0.016);
    const l = layout(year);
    if (orbitRef.current) orbitRef.current.rotation.y = l.periLon * RAD;
    /* Today's orbit stays as a faint reference once the slider leaves today. */
    if (todayRef.current) todayRef.current.visible = Math.abs(year - NOW_BS) > 200;
    l.seasonLons.forEach((lon, k) => {
      earthRefs.current[k]?.position.set(...at(lon, orbitR(lon, l.periLon)));
      /* Globe leans its pole toward +x; turn it to face the June-solstice Sun direction. */
      if (tiltRefs.current[k]) tiltRefs.current[k]!.rotation.y = l.axisLon * RAD;
    });

    if (projector.begin()) {
      projector.push({ id: "sun", text: copy.sun, color: DIAGRAM_LABEL_COLOR.sun, size: 10 }, [0, 0.12, 0]);
      l.seasonLons.forEach((lon, k) => {
        projector.push(
          { id: `season-${k}`, text: copy.seasons[k] ?? "", color: DIAGRAM_LABEL_COLOR.warn, size: 9 },
          /* Just outside each Earth — inside would crowd the Sun on this oval orbit. */
          at(lon, orbitR(lon, l.periLon) + 0.07, 0.03),
        );
      });
      projector.push(
        { id: "peri", text: copy.perihelion, color: DIAGRAM_COLOR.tropical, size: 10 },
        at(l.periLon, PERI_R + 0.12, 0.05),
      );
      projector.push(
        { id: "aph", text: copy.aphelion, color: APHELION_COLOR, size: 10 },
        /* The far end sits near the rashi ring; label it just inside the orbit. */
        at(l.periLon + 180, APH_R - 0.08, 0.05),
      );
      copy.rashis.forEach((name, i) => {
        projector.push(
          { id: `rashi-${i}`, text: name, color: DIAGRAM_LABEL_COLOR.dim, size: 8 },
          at(i * 30 + 15, (RING_IN + RING_OUT) / 2, 0.02),
        );
      });
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.28} />
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={0} decay={0} />
      <SunBody radius={0.06} map={textures.sun} />
      {/* The rashi mandala — the stars — stays put. */}
      <RashiRing inner={RING_IN} outer={RING_OUT} opacity={0.5} />
      {/* Turned by the orbit: the oval, its long axis and its two ends. */}
      <group ref={todayRef} rotation={[0, TODAY_PERI_LON * RAD, 0]}>
        <OrbitPath points={ORBIT_POINTS} color={DIAGRAM_COLOR.orbitFaint} opacity={0.45} radius={0.002} />
      </group>
      <group ref={orbitRef}>
        <OrbitPath points={ORBIT_POINTS} color={DIAGRAM_COLOR.orbit} opacity={0.8} radius={0.0035} />
        <mesh rotation={[0, 0, Math.PI / 2]} position={[(PERI_R - APH_R) / 2, 0, 0]}>
          <cylinderGeometry args={[0.0022, 0.0022, PERI_R + APH_R, 6]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.tropical} transparent opacity={0.5} />
        </mesh>
        <mesh position={[PERI_R, 0, 0]}>
          <sphereGeometry args={[0.022, 16, 16]} />
          <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
        </mesh>
        <mesh position={[-APH_R, 0, 0]}>
          <sphereGeometry args={[0.016, 16, 16]} />
          <meshBasicMaterial color={APHELION_COLOR} />
        </mesh>
      </group>
      {/* Set by the axis: Earth at the two equinoxes and two solstices. */}
      {[0, 1, 2, 3].map((k) => (
        <group key={k} ref={(g) => { earthRefs.current[k] = g; }}>
          <group ref={(g) => { tiltRefs.current[k] = g; }}>
            <Globe radius={0.034} map={textures.earth} tiltDeg={TILT} axis />
          </group>
        </group>
      ))}
    </>
  );
});

export function ApsidesOrbitDiagram() {
  const { t, digits, lang } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: NOW_BS,
    min: Y_MIN,
    max: Y_MAX,
    speed: 2500,
  });

  const copy = useMemo<Copy>(
    () => ({
      sun: t("kundali.report.meta_sun"),
      seasons: [
        t("learn.study.spring_equinox"),
        t("learn.study.summer_solstice"),
        t("learn.study.autumn_equinox"),
        t("learn.study.equinox.hemanta_solstice"),
      ],
      perihelion: t("learn.apsides.perihelion"),
      aphelion: t("learn.apsides.aphelion"),
      rashis: Array.from({ length: 12 }, (_, i) => getRashiName(i + 1, lang)),
    }),
    [t, lang],
  );

  const yearCe = year - CE_TO_BS;
  const { ayan } = layout(year);
  const periBs = perihelionBsDate(yearCe, ayan);
  const season = perihelionNearestCardinal(yearCe);
  /* perihelionNearestCardinal counts from the December solstice; copy.seasons from the March equinox. */
  const pointName = copy.seasons[[3, 0, 1, 2][season.point]!] ?? "";
  const seasonText =
    season.days === 0
      ? t("learn.apsides.on_point", { point: pointName })
      : t(season.days > 0 ? "learn.apsides.days_after" : "learn.apsides.days_before", {
          point: pointName,
          days: digits(Math.abs(season.days)),
        });
  const summerSun = solsticeSunlight(yearCe).june;
  const summer = northernSummer(yearCe);

  return (
    <LearnDiagram3D
      title={t("learn.apsides.title")}
      height={320}
      camera={{ yaw: 0.25, pitch: 1.2 }}
      /* No idle camera spin: a turning view would make the fixed rashi mandala look as if it moves. */
      idleSpin={0}
      frame={{ width: RING_OUT * 1.45, height: RING_OUT * 0.75 }}
      legend={[
        { color: DIAGRAM_COLOR.orbit, label: t("learn.apsides.legend_orbit") },
        { color: DIAGRAM_COLOR.earth, label: t("learn.apsides.legend_earths") },
        { color: DIAGRAM_COLOR.tropical, label: t("learn.apsides.perihelion") },
        { color: APHELION_COLOR, label: t("learn.apsides.aphelion") },
        { color: DIAGRAM_COLOR.orbitFaint, label: t("learn.apsides.legend_today") },
      ]}
      readouts={[
        { k: t("holidays.bs_year"), v: digits(Math.round(year)) },
        {
          k: t("learn.apsides.perihelion_bs"),
          v: t("learn.apsides.bs_date", { month: bsMonthLabel(periBs.month, lang), day: digits(periBs.day) }),
          tone: "accent",
        },
        { k: t("learn.apsides.vs_season"), v: seasonText },
        { k: t("learn.apsides.summer_sun"), v: `${summerSun >= 0 ? "+" : "−"}${digits(Math.abs(summerSun).toFixed(1))}%` },
        { k: t("learn.apsides.north_summer"), v: t(`learn.apsides.${summer}`), tone: summer === "intense" ? "warn" : undefined },
      ]}
      slider={{
        value: year,
        min: Y_MIN,
        max: Y_MAX,
        step: 25,
        label: t("ui.learn.bs_year_2", { year: digits(Math.round(year)) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("learn.apsides.preset_prev_cycle"), value: Math.round(NOW_BS - CLIMATIC_PRECESSION_YEARS) },
        { label: t("learn.apsides.preset_ice"), value: -9000 + CE_TO_BS },
        { label: t("learn.apsides.preset_aligned"), value: 1250 + CE_TO_BS },
        { label: t("learn.apsides.preset_today"), value: NOW_BS },
        { label: t("learn.apsides.preset_future"), value: 11750 + CE_TO_BS },
        { label: t("learn.apsides.preset_next_cycle"), value: Math.round(NOW_BS + CLIMATIC_PRECESSION_YEARS) },
      ]}
      onPreset={scrubTo}
      presetValue={year}
      presetTolerance={150}
      caption={
        Math.abs(yearCe - 2026) > RELIABLE_YEARS
          ? `${t("learn.apsides.far_note")} ${t("learn.apsides.caption")}`
          : t("learn.apsides.caption")
      }
    >
      {({ onLabels }) => (
        <ApsidesOrbitScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />
      )}
    </LearnDiagram3D>
  );
}
