import { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { useSvgClass } from "@/components/learn/study/study-ink";
import { StudyB, StudyCaption, StudyCard, StudyControls, StudyHl, StudyPlayButton, StudyPresetButton, StudyPresetRow, StudyRange, StudyReadoutGrid, StudyRo, StudyRoK, StudyRoV, StudyScrubRow, StudySliderLabel, StudySliderRow, StudySvg } from "@/components/learn/study/StudyCard";
import { useStudyLive } from "@/components/learn/study/use-study-clock";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { edBodyLabel, hoEarthGroup, motBaseDot, motEarthGlow, motEarthLabel, motEclipseBannerType, motEclipseGlowType, motHeightPost, motLegendLabel, motMoon, motMoonEclipsing, motMoonHaloDir, motMoonLabel, motMoonSubmerged, motNode, motNodeDot, motNodeLabel, motNodeLine, motNodeTrack, motOrbit, motPlaneFace, motPlaneLabel, motPlaneRim, motSeasonBanner, motShadowDot, motShadowLabel, motSunBeamAligned, motSunLabel, motSunLineAligned, motSunOutlineAligned, motTiltArc, motTiltLabel, motTiltRef } from "@vedic-patro/design-tokens/classes/diagram-classes";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";
import { EarthGlobeImage } from "@/components/learn/studies/EarthGlobeImageFigure";

import { brand, illustration, midnight, neutral } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
/**
 * 3-D perspective of the Moon's tilted orbit (~5°, drawn larger) over the flat
 * ecliptic plane. A Sun–Earth–shadow line runs through Earth's centre; the Sun
 * sweeps round once a year so the line rotates. An eclipse happens only when the
 * Moon sits ON that line AND at a node (राहु/केतु) — i.e. when the line of nodes
 * points at the Sun. A second control drifts the node line through its 18.6-year
 * precession, showing how the eclipse seasons shift around the year.
 */

const RAD = Math.PI / 180;
const VB = { W: 1240, H: 860 };
const CX = 620;
const CY = 446;
const EL = 26 * RAD; // viewing elevation (keeps the tilted ring off edge-on)
const SE = Math.sin(EL);
const CE = Math.cos(EL);
const RD = 498; // ecliptic disc radius
const RM = 270; // Moon-orbit radius
const RSUN = 430; // Sun distance (well outside the Moon's orbit)
const REAL_TILT = 5.14;
const INC = 22 * RAD; // drawn tilt (exaggerated from ~5°)
const CI = Math.cos(INC);
const SI = Math.sin(INC);
const EARTH_R = 58;
const MOON_R = 18;

const SIDEREAL_MONTH = 27.32166;
const YEAR_DAYS = 365.2422;
const NODAL_YEARS = 18.6;
const YEAR_RANGE = 400; // scrub span for the annual Sun motion (days)
const NODE0 = 120;
/** Simulated days advanced per real second when ▶ play is on. */
const PLAYBACK_DAYS_PER_SEC = 26 / 3;

const fmt = (n: string | number) => toNepaliDigits(n);
const norm360 = (a: number) => ((a % 360) + 360) % 360;
const angDiff = (a: number, b: number) => Math.abs(((a - b + 180) % 360) - 180);

type Status = "lunar" | "solar" | "none";

interface Pt {
  x: number;
  y: number;
  depth: number;
  Z: number;
}

function proj(X: number, Y: number, Z: number): Pt {
  return { x: CX + X, y: CY - (Y * SE + Z * CE), depth: Y, Z };
}

/** Moon-orbit point at argument-of-latitude u (deg from ascending node), node Ω (deg). */
function orbitPt(u: number, omega: number): Pt {
  const ur = u * RAD;
  const O = omega * RAD;
  const cu = Math.cos(ur);
  const su = Math.sin(ur);
  const X = RM * (Math.cos(O) * cu - Math.sin(O) * su * CI);
  const Y = RM * (Math.sin(O) * cu + Math.cos(O) * su * CI);
  const Z = RM * su * SI;
  return proj(X, Y, Z);
}

/** In-ecliptic-plane point (Z = 0) at planar angle a (deg), radius r. */
function planePt(a: number, r: number): Pt {
  const ar = a * RAD;
  return proj(r * Math.cos(ar), r * Math.sin(ar), 0);
}

/** Deterministic starfield for the space backdrop (stable across renders). */
const STARS = (() => {
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: 110 }, () => ({
    x: +(rnd() * VB.W).toFixed(1),
    y: +(rnd() * VB.H).toFixed(1),
    r: +(0.5 + rnd() * 1.7).toFixed(2),
    o: +(0.2 + rnd() * 0.6).toFixed(2),
  }));
})();

/** Half-disc outlines of the ecliptic plane (far = behind Earth, near = in front). */
const DISC = (() => {
  const sample = (a0: number, a1: number) => {
    const pts: string[] = [];
    for (let a = a0; a <= a1; a += 6) {
      const p = planePt(a, RD);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return `M${pts.join(" L")} Z`;
  };
  return { far: sample(0, 180), near: sample(180, 360) };
})();

interface DiagramProps {
  omega: number;
  moonU: number;
  sunLon: number;
  status: Status;
  season: boolean;
}

function MoonOrbitDiagram({ omega, moonU, sunLon, status, season }: DiagramProps) {
  const sc = useSvgClass();
  // Orbit ring as small segments, split by whether they sit ABOVE or BELOW the
  // ecliptic plane. The below-plane half is drawn first (then the translucent
  // blue plane is painted over it, so it reads as "submerged"); the above-plane
  // half is drawn last, bright and clear.
  const segs = useMemo(() => {
    const below: React.ReactNode[] = [];
    const above: React.ReactNode[] = [];
    const STEP = 4;
    for (let u = 0; u < 360; u += STEP) {
      const a = orbitPt(u, omega);
      const b = orbitPt(u + STEP, omega);
      const isAbove = a.Z + b.Z >= 0;
      const node = Math.abs((u + STEP / 2) % 180) < STEP;
      const seg = (
        <Line
          key={`o${u}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          {...sc(motOrbit(isAbove ? (node ? "cross" : "above") : "below"))}
        />
      );
      (isAbove ? above : below).push(seg);
    }
    return { below, above };
  }, [omega]);

  const asc = orbitPt(0, omega);
  const desc = orbitPt(180, omega);
  const ascEdge = planePt(omega, RD);
  const descEdge = planePt(omega + 180, RD);

  // Dihedral tilt wedge at the ascending node.
  const tiltWedge = useMemo(() => {
    const O = omega * RAD;
    const na: [number, number, number] = [RM * Math.cos(O), RM * Math.sin(O), 0];
    const dPlane: [number, number, number] = [-Math.sin(O), Math.cos(O), 0];
    const up: [number, number, number] = [0, 0, 1];
    const ray = (d: [number, number, number], L: number) =>
      proj(na[0] + d[0] * L, na[1] + d[1] * L, na[2] + d[2] * L);
    const dOrbit: [number, number, number] = [
      dPlane[0] * CI + up[0] * SI,
      dPlane[1] * CI + up[1] * SI,
      dPlane[2] * CI + up[2] * SI,
    ];
    const arc: string[] = [];
    const R = 60;
    const STEPS = 16;
    for (let k = 0; k <= STEPS; k++) {
      const t = (k / STEPS) * INC;
      const dx = dPlane[0] * Math.cos(t) + up[0] * Math.sin(t);
      const dy = dPlane[1] * Math.cos(t) + up[1] * Math.sin(t);
      const dz = dPlane[2] * Math.cos(t) + up[2] * Math.sin(t);
      const p = proj(na[0] + dx * R, na[1] + dy * R, na[2] + dz * R);
      arc.push(`${k === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return { p0: proj(na[0], na[1], na[2]), pPlane: ray(dPlane, 100), pOrbit: ray(dOrbit, 100), arc: arc.join(" ") };
  }, [omega]);

  const moon = orbitPt(moonU, omega);
  const O = omega * RAD;
  const ur = moonU * RAD;
  const baseX = RM * (Math.cos(O) * Math.cos(ur) - Math.sin(O) * Math.sin(ur) * CI);
  const baseY = RM * (Math.sin(O) * Math.cos(ur) + Math.cos(O) * Math.sin(ur) * CI);
  const moonBase = proj(baseX, baseY, 0);
  const moonAbove = moon.Z >= 0;

  const sun = planePt(sunLon, RSUN);
  const shadow = planePt(sunLon + 180, RSUN);
  const eclipsing = status !== "none";

  // Moon + drop-post to its shadow on the plane. Rendered into either the
  // "submerged" slot (under the translucent plane) or the "emerged" slot (on
  // top) depending on whether it is currently below or above the ecliptic.
  const moonGroup = (
    <G>
      <Line x1={moon.x} y1={moon.y} x2={moonBase.x} y2={moonBase.y} {...sc(motHeightPost)} />
      <Circle cx={moonBase.x} cy={moonBase.y} r={3} {...sc(motBaseDot)} />
      <G
        transform={`translate(${moon.x} ${moon.y})`}
      {...sc(cn(eclipsing && motMoonEclipsing, !moonAbove && motMoonSubmerged))}
      >
        {eclipsing && (
          <Circle
            cx={0}
            cy={0}
            r={MOON_R + 7}
            {...sc(motEclipseGlowType(status === "lunar" ? "lunar" : "solar"))}
          />
        )}
        <Circle
          cx={0}
          cy={0}
          r={MOON_R + 3}
          {...sc(motMoonHaloDir(moonAbove ? "up" : "down"))}
        />
        <Circle
          cx={0}
          cy={0}
          r={MOON_R}
          fill={status === "lunar" ? illustration.red46 : status === "solar" ? illustration.gray22 : "url(#mot-moon)"}
          {...sc(motMoon)}
        />
        <SvgText y={-MOON_R - 9} {...sc(motMoonLabel)} textAnchor="middle">
          {tFor(undefined, "kundali.graha_name_moon")}
        </SvgText>
      </G>
    </G>
  );

  return (
    <StudySvg w={VB.W} h={VB.H} label={""}>
      <Defs>
        <RadialGradient id="mot-panel" cx="50%" cy="38%" r="78%">
          <Stop offset="0%" stopColor={illustration.sky22} />
          <Stop offset="58%" stopColor={illustration.sky14} />
          <Stop offset="100%" stopColor={midnight.background} />
        </RadialGradient>
        <LinearGradient id="mot-plane-far" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={illustration.sky46} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={illustration.sky50} stopOpacity={0.34} />
        </LinearGradient>
        <LinearGradient id="mot-plane-near" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={illustration.sky50} stopOpacity={0.30} />
          <Stop offset="100%" stopColor={illustration.sky61b} stopOpacity={0.55} />
        </LinearGradient>
        <RadialGradient id="mot-moon" cx="36%" cy="32%" r="74%">
          <Stop offset="0%" stopColor={brand.offWhite} />
          <Stop offset="55%" stopColor={midnight.mutedForeground} />
          <Stop offset="100%" stopColor={illustration.teal41} />
        </RadialGradient>
        <RadialGradient id="mot-sun" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={illustration.amber92} />
          <Stop offset="44%" stopColor={illustration.amber67} />
          <Stop offset="100%" stopColor={illustration.orange53} />
        </RadialGradient>
        <RadialGradient id="mot-sunglow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={illustration.amber67} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={illustration.amber67} stopOpacity={0} />
        </RadialGradient>
        <ClipPath id="mot-clip">
          <Rect x={2} y={2} width={VB.W - 4} height={VB.H - 4} rx={20} />
        </ClipPath>
      </Defs>

      <G clipPath="url(#mot-clip)">
        {/* space backdrop */}
        <Rect x={0} y={0} width={VB.W} height={VB.H} fill="url(#mot-panel)" />
        {STARS.map((s, i) => (
          <Circle key={`s${i}`} cx={s.x} cy={s.y} r={s.r} fill={neutral.white} opacity={s.o} />
        ))}

        {/* legend */}
        <G>
          <Line x1={34} y1={32} x2={70} y2={32} {...sc(cn(motOrbit, "above"))} />
          <SvgText x={78} y={37} {...sc(motLegendLabel)}>{tFor(undefined, "ui.learn.x_c9de59a6")}</SvgText>
          <Line x1={34} y1={58} x2={70} y2={58} {...sc(cn(motOrbit, "below"))} />
          <SvgText x={78} y={63} {...sc(motLegendLabel)}>{tFor(undefined, "ui.learn.x_e1130c48")}</SvgText>
          <Circle cx={52} cy={84} r={8} {...sc(motNode)} />
          <SvgText x={78} y={89} {...sc(motLegendLabel)}>{tFor(undefined, "ui.learn.rahu_ketu_the_nodes")}</SvgText>
        </G>

        {/* ── ecliptic plane: FAR half (behind Earth) ───────────────── */}
        <Path d={DISC.far} fill="url(#mot-plane-far)" {...sc(motPlaneFace)} />

        {/* node-drift track on the plane */}
        <Ellipse cx={CX} cy={CY} rx={RM} ry={RM * SE} {...sc(motNodeTrack)} fill="none" />

        {/* orbit half BELOW the plane — painted first, then submerged by the
            translucent plane so it reads as shaded/underwater */}
        {segs.below}

        {/* line of nodes (sits in the plane, behind Earth) */}
        <Line x1={ascEdge.x} y1={ascEdge.y} x2={descEdge.x} y2={descEdge.y} {...sc(motNodeLine)} />

        {/* Moon while it is below the plane (gets tinted by the near plane) */}
        {!moonAbove && moonGroup}

        {/* Earth — sits across the plane; its lower half is tinted by the near plane */}
        <G {...sc(hoEarthGroup)} transform={`translate(${CX} ${CY})`}>
          <EarthGlobeImage cx={0} cy={0} r={EARTH_R} glow glowClassName={motEarthGlow} glowPad={10} />
        </G>

        {/* ── ecliptic plane: NEAR half (in front of Earth + below-orbit) ── */}
        <Path d={DISC.near} fill="url(#mot-plane-near)" {...sc(motPlaneFace)} />
        <Ellipse cx={CX} cy={CY} rx={RD} ry={RD * SE} {...sc(motPlaneRim)} fill="none" />
        <SvgText x={CX} y={CY + RD * SE + 34} {...sc(motPlaneLabel)} textAnchor="middle">
          {tFor(undefined, "ui.learn.x_db15df7a")}
        </SvgText>
        <SvgText x={CX} y={CY + EARTH_R + 28} {...sc(cn(edBodyLabel, motEarthLabel))} textAnchor="middle">
          {tFor(undefined, "vastu.element.earth")}
        </SvgText>

        {/* orbit half ABOVE the plane — bright, on top of the plane */}
        {segs.above}

        {/* tilt wedge */}
        <Path d={tiltWedge.arc} {...sc(motTiltArc)} fill="none" />
        <Line x1={tiltWedge.p0.x} y1={tiltWedge.p0.y} x2={tiltWedge.pPlane.x} y2={tiltWedge.pPlane.y} {...sc(motTiltRef())} />
        <Line x1={tiltWedge.p0.x} y1={tiltWedge.p0.y} x2={tiltWedge.pOrbit.x} y2={tiltWedge.pOrbit.y} {...sc(motTiltRef(true))} />
        <SvgText x={tiltWedge.p0.x + 12} y={tiltWedge.p0.y - 42} {...sc(motTiltLabel)} textAnchor="start">
          ~{fmt(5)}{tFor(undefined, "ui.learn.x_05e90463")}
        </SvgText>

        {/* nodes — the two points where the tilted orbit pierces the plane */}
        {[
          { p: asc, ne: tFor("ne", "grahas.rahu"), dy: -20 },
          { p: desc, ne: tFor("ne", "grahas.ketu"), dy: 32 },
        ].map((n) => (
          <G key={n.ne}>
            <Circle cx={n.p.x} cy={n.p.y} r={11} {...sc(motNode)} />
            <Circle cx={n.p.x} cy={n.p.y} r={4} {...sc(motNodeDot)} />
            <SvgText x={n.p.x} y={n.p.y + n.dy} {...sc(motNodeLabel)} textAnchor="middle">
              {n.ne}
            </SvgText>
          </G>
        ))}

        {/* Moon while it is above the plane (drawn on top, bright) */}
        {moonAbove && moonGroup}

        {/* Sun */}
        <Circle cx={sun.x} cy={sun.y} r={40} fill="url(#mot-sunglow)" />
        <Circle cx={sun.x} cy={sun.y} r={24} fill="url(#mot-sun)" />
        <SvgText x={sun.x} y={sun.y + 42} {...sc(motSunLabel)} textAnchor="middle">
          {tFor(undefined, "kundali.report.meta_sun")}
        </SvgText>

        {/* Sun–Earth–shadow axis — crimson, drawn last so nothing occludes it */}
        <G>
          <Line x1={sun.x} y1={sun.y} x2={shadow.x} y2={shadow.y} {...sc(motSunBeamAligned(!!season))} />
          <Line x1={sun.x} y1={sun.y} x2={shadow.x} y2={shadow.y} {...sc(motSunOutlineAligned(!!season))} />
          <Line x1={sun.x} y1={sun.y} x2={shadow.x} y2={shadow.y} {...sc(motSunLineAligned(!!season))} />
          <Circle cx={shadow.x} cy={shadow.y} r={11} {...sc(motShadowDot)} />
          <SvgText x={shadow.x} y={shadow.y - 18} {...sc(motShadowLabel)} textAnchor="middle">
            {tFor(undefined, "ui.learn.umbra")}
          </SvgText>
        </G>

        {/* eclipse banner */}
        {eclipsing && (
          <SvgText
            x={CX}
            y={48}
            {...sc(motEclipseBannerType(status === "lunar" ? "lunar" : "solar"))}
            textAnchor="middle"
          >
            {status === "lunar" ? tFor(undefined, "ui.learn.x_54a0d2df") : tFor(undefined, "ui.learn.x_b02336b2")}
          </SvgText>
        )}
        {!eclipsing && season && (
          <SvgText x={CX} y={48} {...sc(motSeasonBanner)} textAnchor="middle">
            {tFor(undefined, "ui.learn.x_cd04e8e6")}
          </SvgText>
        )}
      </G>
    </StudySvg>
  );
}

export function MoonOrbitTiltStudy() {
  const { view: studyView, live } = useStudyLive();
  const [dayT, setDayT] = useState(0); // annual clock (Sun + Moon)
  const [precT, setPrecT] = useState(0); // nodal precession (years)
  const [playing, setPlaying] = useState(true);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing || !live) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDayT((p) => (p + dt * PLAYBACK_DAYS_PER_SEC) % YEAR_RANGE);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, live]);

  const model = useMemo(() => {
    const sunLon = norm360((360 * dayT) / YEAR_DAYS);
    const moonLon = norm360((360 * dayT) / SIDEREAL_MONTH);
    const omega = norm360(NODE0 - (360 * precT) / NODAL_YEARS);
    const u = norm360(moonLon - omega);
    const E = norm360(moonLon - sunLon); // elongation: 0 new, 180 full
    const nodeProx = Math.abs(Math.sin(u * RAD)); // 0 at a node
    const atNode = nodeProx < Math.sin(11 * RAD);
    let status: Status = "none";
    if (atNode && angDiff(E, 180) < 15) status = "lunar";
    else if (atNode && angDiff(E, 0) < 15) status = "solar";
    const season = angDiff(omega, sunLon) < 13 || angDiff(omega, sunLon + 180) < 13;
    const phase =
      angDiff(E, 180) < 12 ? tFor(undefined, "learn.purnima") : angDiff(E, 0) < 12 ? tFor(undefined, "learn.aunsi") : E < 180 ? tFor(undefined, "learn.diagrams.paksha_shukla") : tFor(undefined, "learn.diagrams.paksha_krishna");
    return { sunLon, omega, u, status, season, phase };
  }, [dayT, precT]);

  const jumpNextEclipse = () => {
    const omega = norm360(NODE0 - (360 * precT) / NODAL_YEARS);
    for (let d = dayT + 1; d < dayT + YEAR_RANGE; d += 0.4) {
      const t = d % YEAR_RANGE;
      const sunLon = norm360((360 * t) / YEAR_DAYS);
      const moonLon = norm360((360 * t) / SIDEREAL_MONTH);
      const u = norm360(moonLon - omega);
      const E = norm360(moonLon - sunLon);
      const atNode = Math.abs(Math.sin(u * RAD)) < Math.sin(11 * RAD);
      if (atNode && (angDiff(E, 180) < 12 || angDiff(E, 0) < 12)) {
        setPlaying(false);
        setDayT(t);
        return;
      }
    }
  };

  const statusText =
    model.status === "lunar"
      ? tFor(undefined, "learn.diagrams.eclipse_event_lunar")
      : model.status === "solar"
        ? tFor(undefined, "learn.diagrams.eclipse_event_solar")
        : model.season
          ? tFor(undefined, "ui.learn.eclipse_season")
          : tFor(undefined, "learn.study.eclipse.status_none");

  return (
    <StudyCard view={studyView}>
      <MoonOrbitDiagram
        omega={model.omega}
        moonU={model.u}
        sunLon={model.sunLon}
        status={model.status}
        season={model.season}
      />
      <StudyControls>
        <StudyReadoutGrid>
          <StudyRo>
            <StudyRoK>{tFor(undefined, "ui.learn.orbital_tilt")}</StudyRoK>
            <StudyRoV mono={true}>~{fmt(REAL_TILT.toFixed(1))}°</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{tFor(undefined, "learn.study.eclipse.moon_phase")}</StudyRoK>
            <StudyRoV>{model.phase}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{tFor(undefined, "learn.study.eclipse.node_cycle")}</StudyRoK>
            <StudyRoV mono={true}>{fmt(precT.toFixed(1))} / {fmt(NODAL_YEARS)}{tFor(undefined, "ui.learn.x_66430b7c")}</StudyRoV>
          </StudyRo>
          <StudyRo>
            <StudyRoK>{tFor(undefined, "learn.study.eclipse.state")}</StudyRoK>
            <StudyRoV amber={model.status !== "none"}>{statusText}</StudyRoV>
          </StudyRo>
        </StudyReadoutGrid>

        <StudySliderRow>
          <StudySliderLabel>{tFor(undefined, "ui.learn.x_74bf8cc5")}</StudySliderLabel>
          <StudyScrubRow>
            <StudyPlayButton playing={playing} onPress={() => setPlaying((p) => !p)} />
            <StudyRange min={0} max={YEAR_RANGE} step={0.5} value={dayT} onChange={(v: number) => {
                setPlaying(false);
                setDayT(v);
              }} />
          </StudyScrubRow>
        </StudySliderRow>

        <StudySliderRow>
          <StudySliderLabel>{tFor(undefined, "ui.learn.x_844b4d3b")}{fmt(NODAL_YEARS)}{tFor(undefined, "ui.learn.x_f90332cc")}</StudySliderLabel>
          <StudyRange min={0} max={NODAL_YEARS} step={0.05} value={precT} onChange={(v: number) => setPrecT(v)} />
        </StudySliderRow>

        <StudyPresetRow>
          <StudyPresetButton onPress={jumpNextEclipse}>
            {tFor(undefined, "ui.learn.x_937693d0")}
          </StudyPresetButton>
          <StudyPresetButton onPress={() => setPrecT((p) => (p + NODAL_YEARS / 4) % NODAL_YEARS)}>
            {tFor(undefined, "ui.learn.x_fa553da9")}
          </StudyPresetButton>
        </StudyPresetRow>
      </StudyControls>
      <StudyCaption>
        {tFor(undefined, "ui.learn.x_a88a1493")}<StudyHl amber>{tFor(undefined, "ui.learn.x_60e8fbbd")}</StudyHl>{tFor(undefined, "ui.learn.x_91630415")}<StudyB>~{fmt(5)}°</StudyB>{tFor(undefined, "ui.learn.x_b67a0a51")}<StudyB>{tFor(undefined, "ui.learn.x_09b86982")}</StudyB>{tFor(undefined, "ui.learn.x_3fe90601")}{" "}
        <StudyHl>{tFor(undefined, "ui.learn.x_ab1d2347")}</StudyHl>{tFor(undefined, "ui.learn.x_53350eeb")}<StudyB>{fmt(NODAL_YEARS)}{tFor(undefined, "ui.learn.x_fc380af1")}</StudyB>{tFor(undefined, "ui.learn.x_12331c28")}
      </StudyCaption>
    </StudyCard>
  );
}
