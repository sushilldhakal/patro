/**
 * How the tropical spring-equinox point slowly regresses through the fixed
 * sidereal zodiac — the real mechanism behind ṛtu drift and the growing
 * ayanamsha. Native 3D reimagining of web's `EquinoxPrecession`
 * (pseudo-3D-in-SVG); Tier 2.
 *
 * The apsides variant also draws the whole equinox–solstice cross and
 * perihelion (उपसौर) / aphelion (अपसौर). The cross is moved by the axis
 * (~50.3″/yr backwards), the apsides by the turning orbit (~11.6″/yr forwards),
 * so the angle between them goes round in ~21,000 years (apsidal-precession.ts).
 */
import { memo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { ChipRow } from "@/components/learn/diagrams/LearnDiagramWidgets";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { OrbitPath, RashiRing, ellipsePoints } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";
import { getRashiName } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { bsMonthLabel } from "@vedic-patro/domain/calendar/bs-calendar";
import { illustration } from "@vedic-patro/design-tokens";
import {
  CLIMATIC_PRECESSION_YEARS,
  northernSummer,
  perihelionBsDate,
  perihelionNearestCardinal,
  perihelionSiderealLongitude,
  solsticeSunlight,
} from "@vedic-patro/domain/learn/apsidal-precession";

const RATE = 50.2879 / 3600; // deg / BS year
const BS_AYAN_ZERO = 342;
const CYCLE = Math.round(360 / RATE); // ~25,772 years
const R = 0.5;
/* The orbit's oval in the apsides variant: exaggerated (Earth's real 0.017
   would look round), Earth at one focus, far end just inside the ecliptic. */
const ORBIT_E = 0.3;
const ORBIT_A = (R * 0.76) / (1 + ORBIT_E);
const PERI_R = ORBIT_A * (1 - ORBIT_E);
const APH_R = ORBIT_A * (1 + ORBIT_E);
const ORBIT_POINTS = ellipsePoints(ORBIT_A, ORBIT_E, 96, 0.025);
const CE_TO_BS = 57;
/* Apsides variant: from the last ice age to beyond the next perihelion-in-June. */
const AP_MIN = -50000;
const AP_MAX = 50000;
/** Beyond this many years from today the constant-rate model is only indicative. */
const AP_RELIABLE_YEARS = 20000;
/** Aphelion's colour — violet, so it never reads as part of a blue ring. */
const APHELION_COLOR = illustration.violet65;
const SEASON_POINT_KEYS = [
  "learn.study.equinox.hemanta_solstice",
  "learn.study.spring_equinox",
  "learn.study.summer_solstice",
  "learn.study.autumn_equinox",
] as const;

const eqSidOf = (year: number) => ((((BS_AYAN_ZERO - year) * RATE) % 360) + 360) % 360;
const ayanamshaOf = (year: number) => (year - BS_AYAN_ZERO) * RATE;
const ringPoint = (lonDeg: number, r: number, y = 0.02): [number, number, number] => {
  const a = (lonDeg * Math.PI) / 180;
  return [r * Math.cos(a), y, r * Math.sin(a)];
};

type SceneCopy = {
  equinox: string;
  ring: string;
  /** Spring equinox, June solstice, autumn equinox, December solstice — anticlockwise from the equinox. */
  cardinals?: [string, string, string, string];
  perihelion?: string;
  aphelion?: string;
};
type SceneProps = {
  clock: DiagramClockRef;
  onSample?: (year: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: SceneCopy;
  apsides?: boolean;
  /** Turn the whole sky so the equinox stays put: the orbit's oval then swings round the seasons. */
  seasonFrame?: boolean;
};

/** Where the equinox sits among the stars today — the "seasons fixed" view holds it here. */
const EQ_SID_TODAY = eqSidOf(2083);

const EquinoxPrecessionScene = memo(function EquinoxPrecessionScene({ clock, onSample, onLabels, copy, apsides, seasonFrame }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const markerRef = useRef<THREE.Mesh>(null);
  const crossRef = useRef<THREE.Group>(null);
  const apsisRef = useRef<THREE.Group>(null);
  const frameRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const year = readClock(0.016);
    const eqSid = eqSidOf(year);
    const a = (eqSid * Math.PI) / 180;
    markerRef.current?.position.set(R * Math.cos(a), 0.02, R * Math.sin(a));
    /* Groups are built along +x; turning about y by −angle lands +x on (cos, sin) of the ring. */
    if (crossRef.current) crossRef.current.rotation.y = -a;
    const periSid = perihelionSiderealLongitude(year - CE_TO_BS, ayanamshaOf(year));
    if (apsisRef.current) apsisRef.current.rotation.y = (-periSid * Math.PI) / 180;
    const rot = apsides && seasonFrame ? EQ_SID_TODAY - eqSid : 0;
    if (frameRef.current) frameRef.current.rotation.y = (-rot * Math.PI) / 180;

    if (projector.begin()) {
      if (apsides && copy.cardinals) {
        copy.cardinals.forEach((text, k) => {
          projector.push({ id: `card-${k}`, text, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, ringPoint(eqSid + k * 90 + rot, R * 1.22, 0.08));
        });
        projector.push({ id: "peri", text: copy.perihelion ?? "", color: DIAGRAM_COLOR.tropical, size: 10 }, ringPoint(periSid + rot, PERI_R + 0.07, 0.08));
        projector.push({ id: "aph", text: copy.aphelion ?? "", color: APHELION_COLOR, size: 10 }, ringPoint(periSid + 180 + rot, APH_R - 0.08, 0.08));
      } else {
        projector.push({ id: "equinox", text: copy.equinox, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, ringPoint(eqSid, R * 1.2, 0.1));
      }
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 1.2, 0.4]} intensity={1.3} />
      <group ref={frameRef}>
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

      {apsides ? (
        <>
          {/* Moved by the axis: the equinox–solstice cross. */}
          <group ref={crossRef}>
            {[0, Math.PI / 2].map((rot) => (
              <mesh key={rot} rotation={[0, rot, Math.PI / 2]} position={[0, 0.012, 0]}>
                <cylinderGeometry args={[0.0035, 0.0035, R * 2.1, 6]} />
                <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} transparent opacity={0.7} />
              </mesh>
            ))}
            {[0, 1, 2, 3].map((k) => (
              <mesh key={k} position={ringPoint(k * 90, R * 1.05)}>
                <sphereGeometry args={[0.018, 12, 12]} />
                <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} />
              </mesh>
            ))}
          </group>
          {/* Moved by the orbit: the whole oval turns, carrying perihelion (near end) and aphelion (far end). */}
          <group ref={apsisRef}>
            <OrbitPath points={ORBIT_POINTS} color={DIAGRAM_COLOR.tropical} opacity={0.85} radius={0.004} />
            <mesh rotation={[0, 0, Math.PI / 2]} position={[(PERI_R - APH_R) / 2, 0.02, 0]}>
              <cylinderGeometry args={[0.0025, 0.0025, PERI_R + APH_R, 6]} />
              <meshBasicMaterial color={DIAGRAM_COLOR.tropical} transparent opacity={0.5} />
            </mesh>
            {/* Perihelion drawn larger than aphelion — the Sun is closer there. */}
            <mesh position={ringPoint(0, PERI_R, 0.03)}>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
            </mesh>
            <mesh position={ringPoint(180, APH_R, 0.03)}>
              <sphereGeometry args={[0.026, 16, 16]} />
              <meshBasicMaterial color={APHELION_COLOR} />
            </mesh>
          </group>
        </>
      ) : null}
      </group>
    </>
  );
});

function useEquinoxCopy(apsides: boolean): SceneCopy {
  const { t } = useLocale();
  return {
    equinox: t("ui.learn.spring_equinox_point"),
    ring: t("ui.learn.sidereal_rashi_fixed"),
    ...(apsides
      ? {
          cardinals: [
            t("learn.study.spring_equinox"),
            t("learn.study.summer_solstice"),
            t("learn.study.autumn_equinox"),
            t("learn.study.equinox.hemanta_solstice"),
          ] as [string, string, string, string],
          perihelion: t("learn.apsides.perihelion"),
          aphelion: t("learn.apsides.aphelion"),
        }
      : {}),
  };
}

export function EquinoxPrecessionDiagram() {
  const { t, digits, lang } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 2082,
    min: 0,
    max: CYCLE,
    speed: 320,
  });

  const eqSid = eqSidOf(year);
  const rashiIdx = Math.floor(eqSid / 30);
  const ayanamsha = ayanamshaOf(year);
  const copy = useEquinoxCopy(false);

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_precession_of_the_equinox")}
      height={280}
      camera={{ yaw: 0.3, pitch: 0.9 }}
      frame={{ width: 1.4, height: 0.75 }}
      legend={[
        { color: DIAGRAM_COLOR.sidereal, label: copy.ring },
        { color: DIAGRAM_LABEL_COLOR.warn, label: copy.equinox },
      ]}
      readouts={[
        { k: t("holidays.bs_year"), v: digits(Math.round(year)), tone: "accent" },
        { k: t("ui.learn.equinox_now_in"), v: getRashiName(rashiIdx + 1, lang), tone: "warn" },
        { k: t("ui.learn.ayanamsha_from_mesha"), v: `${digits(ayanamsha < 0 ? (-ayanamsha).toFixed(1) : ayanamsha.toFixed(1))}°` },
      ]}
      slider={{
        value: year,
        min: 0,
        max: CYCLE,
        label: t("ui.learn.bs_year_2", { year: digits(Math.round(year)) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("ui.learn.bs_0"), value: 0 },
        { label: t("panchanga.day_cycle.now"), value: 2082 },
      ]}
      onPreset={scrubTo}
      presetValue={year}
      presetTolerance={200}
      caption={t("ui.learn.the_sidereal_zodiac_outer_ring_is")}
    >
      {({ onLabels }) => <EquinoxPrecessionScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}

/** The same study with the full cross and perihelion / aphelion (sayana/nirayana guide, chapter 07). */
export function EquinoxPrecessionApsidesDiagram() {
  const { t, digits, lang } = useLocale();
  const { clock, value: year, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 2083,
    min: AP_MIN,
    max: AP_MAX,
    speed: 2500,
  });
  const copy = useEquinoxCopy(true);
  const [seasonFrame, setSeasonFrame] = useState(1);

  const yearCe = year - CE_TO_BS;
  const periBs = perihelionBsDate(yearCe, ayanamshaOf(year));
  const season = perihelionNearestCardinal(yearCe);
  const pointName = t(SEASON_POINT_KEYS[season.point]);
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
      height={300}
      camera={{ yaw: 0.3, pitch: 0.95 }}
      frame={{ width: 1.5, height: 0.85 }}
      legend={[
        { color: DIAGRAM_COLOR.sidereal, label: copy.ring },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("learn.apsides.legend_cross") },
        { color: DIAGRAM_COLOR.tropical, label: t("learn.apsides.perihelion") },
        { color: APHELION_COLOR, label: t("learn.apsides.aphelion") },
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
        min: AP_MIN,
        max: AP_MAX,
        step: 25,
        label: t("ui.learn.bs_year_2", { year: digits(Math.round(year)) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("learn.apsides.preset_prev_cycle"), value: Math.round(2083 - CLIMATIC_PRECESSION_YEARS) },
        { label: t("learn.apsides.preset_ice"), value: -9000 + CE_TO_BS },
        { label: t("learn.apsides.preset_aligned"), value: 1250 + CE_TO_BS },
        { label: t("learn.apsides.preset_today"), value: 2083 },
        { label: t("learn.apsides.preset_future"), value: 11750 + CE_TO_BS },
        { label: t("learn.apsides.preset_next_cycle"), value: Math.round(2083 + CLIMATIC_PRECESSION_YEARS) },
      ]}
      onPreset={scrubTo}
      presetValue={year}
      presetTolerance={150}
      extraControls={
        <ChipRow
          label={t("learn.apsides.view")}
          options={[
            { label: t("learn.apsides.frame_seasons"), value: 1 },
            { label: t("learn.apsides.frame_stars"), value: 0 },
          ]}
          value={seasonFrame}
          onChange={setSeasonFrame}
        />
      }
      caption={
        Math.abs(yearCe - 2026) > AP_RELIABLE_YEARS
          ? `${t("learn.apsides.far_note")} ${t("learn.apsides.caption")}`
          : t("learn.apsides.caption")
      }
    >
      {({ onLabels }) => (
        <EquinoxPrecessionScene clock={clock} onSample={onSample} onLabels={onLabels} copy={copy} apsides seasonFrame={seasonFrame === 1} />
      )}
    </LearnDiagram3D>
  );
}
