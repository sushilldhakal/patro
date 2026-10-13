/**
 * Why most full moons and new moons pass without an eclipse. The Moon's
 * orbit is tilted ~5.14° from the ecliptic (drawn larger here for clarity);
 * the Sun–Earth–shadow line sweeps around once a year. An eclipse needs the
 * Moon to sit ON that line AND at a node (rahu/ketu) at the same time — the
 * line of nodes itself drifts through an 18.6-year precession, which is why
 * eclipse seasons shift around the year. Native 3D reimagining of web's
 * `MoonOrbitTilt` (oblique-projected SVG); Tier 3.
 */
import { memo, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LearnDiagram3D } from "@/components/learn/diagrams/LearnDiagram3D";
import { useDiagramClock, useSceneClock } from "@/components/learn/diagrams/diagram-clock";
import type { DiagramClockRef } from "@/components/learn/diagrams/diagram-clock";
import { useLabelProjector, type DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { EclipticPlane, OrbitPath, Ray, orientRay } from "@/components/learn/diagrams/scene-parts";
import { DIAGRAM_COLOR, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { useLocale } from "@/lib/i18n";

import { illustration, neutral } from "@vedic-patro/design-tokens";
const D2R = Math.PI / 180;
const SIDEREAL_MONTH = 27.32166;
const YEAR_DAYS = 365.2422;
const NODAL_YEARS = 18.6;
const YEAR_RANGE = 400;
const NODE0 = 120;
const REAL_TILT = 5.14;
const INC = 20 * D2R;
const CI = Math.cos(INC);
const SI = Math.sin(INC);
const R_DISK = 0.55;
const RM = 0.36;
const R_SUN = 0.85;

const norm360 = (a: number) => ((a % 360) + 360) % 360;
const angDiff = (a: number, b: number) => Math.abs(((a - b + 180) % 360) - 180);

function orbitPoint(uDeg: number, omegaDeg: number): [number, number, number] {
  const u = uDeg * D2R;
  const O = omegaDeg * D2R;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const X = RM * (Math.cos(O) * cu - Math.sin(O) * su * CI);
  const Z = RM * (Math.sin(O) * cu + Math.cos(O) * su * CI);
  const Y = RM * su * SI;
  return [X, Y, Z];
}

function moonOrbitPoints(omegaDeg: number, steps = 96): [number, number, number][] {
  return Array.from({ length: steps }, (_, i) => orbitPoint((i / steps) * 360, omegaDeg));
}

type Status = "lunar" | "solar" | "none";

type SceneProps = {
  clock: DiagramClockRef;
  precT: number;
  onSample?: (day: number) => void;
  onLabels?: (labels: DiagramLabel[]) => void;
  copy: { sun: string; moon: string; asc: string; desc: string; eclipse: string };
};

const MoonOrbitTiltScene = memo(function MoonOrbitTiltScene({ clock, precT, onSample, onLabels, copy }: SceneProps) {
  const readClock = useSceneClock(clock, onSample);
  const projector = useLabelProjector(onLabels);
  const moonRef = useRef<THREE.Mesh>(null);
  const dropRef = useRef<THREE.Mesh>(null);
  const baseRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Mesh>(null);
  const shadowRayRef = useRef<THREE.Mesh>(null);

  const omega = norm360(NODE0 - (360 * precT) / NODAL_YEARS);
  const orbitPts = useMemo(() => moonOrbitPoints(omega), [omega]);
  const N: [number, number, number] = [Math.cos(omega * D2R), 0, Math.sin(omega * D2R)];
  const ascPt: [number, number, number] = [RM * N[0], 0, RM * N[2]];
  const descPt: [number, number, number] = [-RM * N[0], 0, -RM * N[2]];

  useFrame(() => {
    const day = readClock(0.016);
    const sunLon = norm360((360 * day) / YEAR_DAYS);
    const moonLon = norm360((360 * day) / SIDEREAL_MONTH);
    const u = norm360(moonLon - omega);
    const E = norm360(moonLon - sunLon);
    const nodeProx = Math.abs(Math.sin(u * D2R));
    const atNode = nodeProx < Math.sin(11 * D2R);
    let status: Status = "none";
    if (atNode && angDiff(E, 180) < 15) status = "lunar";
    else if (atNode && angDiff(E, 0) < 15) status = "solar";

    const moonPos = orbitPoint(u, omega);
    moonRef.current?.position.set(...moonPos);
    const base: [number, number, number] = [moonPos[0], 0, moonPos[2]];
    orientRay(dropRef.current, moonPos, base, 1);
    baseRef.current?.position.set(...base);

    const sunPos: [number, number, number] = [R_SUN * Math.cos(sunLon * D2R), 0, R_SUN * Math.sin(sunLon * D2R)];
    const shadowPos: [number, number, number] = [-sunPos[0], 0, -sunPos[2]];
    sunRef.current?.position.set(...sunPos);
    orientRay(shadowRayRef.current, sunPos, shadowPos, 1);

    if (moonRef.current) {
      const mat = moonRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(status === "lunar" ? DIAGRAM_LABEL_COLOR.warn : status === "solar" ? illustration.gray22 : illustration.sky84);
      mat.emissive?.set(status === "lunar" ? DIAGRAM_LABEL_COLOR.warn : neutral.black);
      mat.emissiveIntensity = status === "lunar" ? 0.5 : 0;
    }

    if (projector.begin()) {
      projector.push({ id: "sun", text: copy.sun, color: DIAGRAM_COLOR.sun, size: 9 }, [sunPos[0], 0.08, sunPos[2]]);
      projector.push({ id: "moon", text: copy.moon, color: DIAGRAM_LABEL_COLOR.body, size: 8 }, [moonPos[0], moonPos[1] + 0.06, moonPos[2]]);
      if (status !== "none") {
        projector.push({ id: "ecl", text: copy.eclipse, color: DIAGRAM_LABEL_COLOR.warn, size: 9 }, [moonPos[0], moonPos[1] + 0.11, moonPos[2]]);
      }
      projector.end();
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 1.2, 0.5]} intensity={1.1} />
      <EclipticPlane radius={R_DISK} opacity={0.06} />
      <OrbitPath points={orbitPts} color={DIAGRAM_COLOR.tropical} opacity={0.55} radius={0.0035} />
      <Ray from={[-R_DISK * N[0], 0, -R_DISK * N[2]]} to={[R_DISK * N[0], 0, R_DISK * N[2]]} color={DIAGRAM_LABEL_COLOR.dim} opacity={0.35} radius={0.0025} />
      <mesh position={ascPt}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
      </mesh>
      <mesh position={descPt}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.tropical} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 20, 20]} />
        <meshStandardMaterial color={DIAGRAM_COLOR.earth} />
      </mesh>
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={DIAGRAM_COLOR.sun} />
      </mesh>
      <mesh ref={shadowRayRef}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.warn} transparent opacity={0.5} />
      </mesh>
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.026, 16, 16]} />
        <meshStandardMaterial color={illustration.sky84} roughness={0.9} />
      </mesh>
      <mesh ref={dropRef}>
        <cylinderGeometry args={[0.0018, 0.0018, 1, 6]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} transparent opacity={0.4} />
      </mesh>
      <mesh ref={baseRef}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color={DIAGRAM_LABEL_COLOR.dim} />
      </mesh>
    </>
  );
});

export function MoonOrbitTiltDiagram() {
  const { t, digits } = useLocale();
  const [precT, setPrecT] = useState(0);
  const { clock, value: day, playing, setPlaying, scrubTo, onSample } = useDiagramClock({
    initial: 0,
    min: 0,
    max: YEAR_RANGE,
    speed: 40,
  });

  const sunLon = norm360((360 * day) / YEAR_DAYS);
  const moonLon = norm360((360 * day) / SIDEREAL_MONTH);
  const omega = norm360(NODE0 - (360 * precT) / NODAL_YEARS);
  const u = norm360(moonLon - omega);
  const E = norm360(moonLon - sunLon);
  const atNode = Math.abs(Math.sin(u * D2R)) < Math.sin(11 * D2R);
  const status: Status = atNode && angDiff(E, 180) < 15 ? "lunar" : atNode && angDiff(E, 0) < 15 ? "solar" : "none";
  const season = angDiff(omega, sunLon) < 13 || angDiff(omega, sunLon + 180) < 13;
  const phase = angDiff(E, 180) < 12 ? t("learn.purnima") : angDiff(E, 0) < 12 ? t("learn.aunsi") : E < 180 ? t("learn.diagrams.paksha_shukla") : t("learn.diagrams.paksha_krishna");
  const statusText =
    status === "lunar"
      ? t("ui.learn.lunar_eclipse")
      : status === "solar"
        ? t("learn.study.eclipse.status_solar")
        : season
          ? t("ui.learn.eclipse_season")
          : t("learn.study.eclipse.status_none");

  const copy = {
    sun: t("kundali.report.meta_sun"),
    moon: t("kundali.graha_name_moon"),
    asc: t("grahas.rahu"),
    desc: t("grahas.ketu"),
    eclipse: statusText,
  };

  return (
    <LearnDiagram3D
      title={t("ui.learn.n3d_the_moon_s_tilted_orbit")}
      height={300}
      camera={{ yaw: 0.35, pitch: 0.8 }}
      frame={{ width: 1.4, height: 0.9 }}
      idleSpin={0}
      legend={[
        { color: DIAGRAM_COLOR.tropical, label: t("ui.learn.moon_s_orbit_tilted") },
        { color: DIAGRAM_LABEL_COLOR.warn, label: t("ui.learn.sun_earth_shadow_line") },
        { color: DIAGRAM_COLOR.tropical, label: t("ui.learn.rahu_ketu_the_nodes") },
      ]}
      readouts={[
        { k: t("ui.learn.orbital_tilt"), v: `~${digits(REAL_TILT.toFixed(1))}°` },
        { k: t("learn.study.eclipse.moon_phase"), v: phase },
        { k: t("ui.learn.nodal_cycle"), v: `${digits(precT.toFixed(1))} / ${digits(NODAL_YEARS)} ${t("ui.learn.yr")}` },
        { k: t("ui.learn.status"), v: statusText, tone: status !== "none" ? "warn" : undefined },
      ]}
      slider={{
        value: day,
        min: 0,
        max: YEAR_RANGE,
        label: t("ui.learn.day_day_the_sun_line_turns", { day: digits(Math.round(day)) }),
        onChange: scrubTo,
      }}
      playing={playing}
      onPlayToggle={() => setPlaying(!playing)}
      presets={[
        { label: t("ui.learn.nodes_0"), value: 0 },
        { label: t("ui.learn.nodes_25"), value: NODAL_YEARS * 0.25 },
        { label: t("ui.learn.nodes_50"), value: NODAL_YEARS * 0.5 },
        { label: t("ui.learn.nodes_75"), value: NODAL_YEARS * 0.75 },
      ]}
      onPreset={setPrecT}
      presetValue={precT}
      presetTolerance={0.3}
      caption={t("ui.learn.the_sun_earth_eclipse_line_through")}
    >
      {({ onLabels }) => <MoonOrbitTiltScene clock={clock} precT={precT} onSample={onSample} onLabels={onLabels} copy={copy} />}
    </LearnDiagram3D>
  );
}
