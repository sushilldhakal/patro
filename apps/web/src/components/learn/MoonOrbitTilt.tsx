import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { edBodyLabel, edScrub, hoEarthGroup, motBaseDot, motEarthGlow, motEarthLabel, motEclipseBannerType, motEclipseGlowType, motHeightPost, motLegendLabel, motMoon, motMoonEclipsing, motMoonHaloDir, motMoonLabel, motMoonSubmerged, motNode, motNodeDot, motNodeLabel, motNodeLine, motNodeTrack, motOrbit, motPlaneFace, motPlaneLabel, motPlaneRim, motSeasonBanner, motShadowDot, motShadowLabel, motSunBeamAligned, motSunLabel, motSunLineAligned, motSunOutlineAligned, motTiltArc, motTiltLabel, motTiltRef } from "@/lib/diagram-classes";
import { motSliderLabel, motSliderRow, tmCardCap, tmCardPadLg, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap, edSvg } from "@/lib/learn-classes";
import { Pause, Play } from "lucide-react";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { EarthGlobeImage } from "./EarthGlobeImage";

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
        <line
          key={`o${u}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          className={motOrbit(isAbove ? (node ? "cross" : "above") : "below")}
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
    <g>
      <line x1={moon.x} y1={moon.y} x2={moonBase.x} y2={moonBase.y} className={motHeightPost} />
      <circle cx={moonBase.x} cy={moonBase.y} r={3} className={motBaseDot} />
      <g
        transform={`translate(${moon.x} ${moon.y})`}
      className={cn(eclipsing && motMoonEclipsing, !moonAbove && motMoonSubmerged)}
      >
        {eclipsing && (
          <circle
            cx={0}
            cy={0}
            r={MOON_R + 7}
            className={motEclipseGlowType(status === "lunar" ? "lunar" : "solar")}
          />
        )}
        <circle
          cx={0}
          cy={0}
          r={MOON_R + 3}
          className={motMoonHaloDir(moonAbove ? "up" : "down")}
        />
        <circle
          cx={0}
          cy={0}
          r={MOON_R}
          fill={status === "lunar" ? "#c0392b" : status === "solar" ? "#33373d" : "url(#mot-moon)"}
          className={motMoon}
        />
        <text y={-MOON_R - 9} className={motMoonLabel} textAnchor="middle">
          चन्द्र
        </text>
      </g>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${VB.W} ${VB.H}`} className={edSvg("mot")} role="img">
      <defs>
        <radialGradient id="mot-panel" cx="50%" cy="38%" r="78%">
          <stop offset="0%" stopColor="#15315c" />
          <stop offset="58%" stopColor="#0c1d3a" />
          <stop offset="100%" stopColor="#060d1e" />
        </radialGradient>
        <linearGradient id="mot-plane-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a5cc0" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#3070d6" stopOpacity={0.34} />
        </linearGradient>
        <linearGradient id="mot-plane-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6bd0" stopOpacity={0.30} />
          <stop offset="100%" stopColor="#4a90ee" stopOpacity={0.55} />
        </linearGradient>
        <radialGradient id="mot-moon" cx="36%" cy="32%" r="74%">
          <stop offset="0%" stopColor="#eef1f4" />
          <stop offset="55%" stopColor="#aab2bb" />
          <stop offset="100%" stopColor="#5f6770" />
        </radialGradient>
        <radialGradient id="mot-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="44%" stopColor="#ffd24a" />
          <stop offset="100%" stopColor="#ef8a1d" />
        </radialGradient>
        <radialGradient id="mot-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcf57" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#ffcf57" stopOpacity={0} />
        </radialGradient>
        <clipPath id="mot-clip">
          <rect x={2} y={2} width={VB.W - 4} height={VB.H - 4} rx={20} />
        </clipPath>
      </defs>

      <g clipPath="url(#mot-clip)">
        {/* space backdrop */}
        <rect x={0} y={0} width={VB.W} height={VB.H} fill="url(#mot-panel)" />
        {STARS.map((s, i) => (
          <circle key={`s${i}`} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
        ))}

        {/* legend */}
        <g>
          <line x1={34} y1={32} x2={70} y2={32} className={cn(motOrbit, "above")} />
          <text x={78} y={37} className={motLegendLabel}>कक्ष — समतलभन्दा माथि (उज्यालो)</text>
          <line x1={34} y1={58} x2={70} y2={58} className={cn(motOrbit, "below")} />
          <text x={78} y={63} className={motLegendLabel}>समतलभन्दा तल (छायाँमा)</text>
          <circle cx={52} cy={84} r={8} className={motNode} />
          <text x={78} y={89} className={motLegendLabel}>राहु / केतु — पात बिन्दु</text>
        </g>

        {/* ── ecliptic plane: FAR half (behind Earth) ───────────────── */}
        <path d={DISC.far} fill="url(#mot-plane-far)" className={motPlaneFace} />

        {/* node-drift track on the plane */}
        <ellipse cx={CX} cy={CY} rx={RM} ry={RM * SE} className={motNodeTrack} fill="none" />

        {/* orbit half BELOW the plane — painted first, then submerged by the
            translucent plane so it reads as shaded/underwater */}
        {segs.below}

        {/* line of nodes (sits in the plane, behind Earth) */}
        <line x1={ascEdge.x} y1={ascEdge.y} x2={descEdge.x} y2={descEdge.y} className={motNodeLine} />

        {/* Moon while it is below the plane (gets tinted by the near plane) */}
        {!moonAbove && moonGroup}

        {/* Earth — sits across the plane; its lower half is tinted by the near plane */}
        <g className={hoEarthGroup} transform={`translate(${CX} ${CY})`}>
          <EarthGlobeImage cx={0} cy={0} r={EARTH_R} glow glowClassName={motEarthGlow} glowPad={10} />
        </g>

        {/* ── ecliptic plane: NEAR half (in front of Earth + below-orbit) ── */}
        <path d={DISC.near} fill="url(#mot-plane-near)" className={motPlaneFace} />
        <ellipse cx={CX} cy={CY} rx={RD} ry={RD * SE} className={motPlaneRim} fill="none" />
        <text x={CX} y={CY + RD * SE + 34} className={motPlaneLabel} textAnchor="middle">
          क्रान्तिवृत्त तल — सूर्यपथको समतल
        </text>
        <text x={CX} y={CY + EARTH_R + 28} className={cn(edBodyLabel, motEarthLabel)} textAnchor="middle">
          पृथ्वी
        </text>

        {/* orbit half ABOVE the plane — bright, on top of the plane */}
        {segs.above}

        {/* tilt wedge */}
        <path d={tiltWedge.arc} className={motTiltArc} fill="none" />
        <line x1={tiltWedge.p0.x} y1={tiltWedge.p0.y} x2={tiltWedge.pPlane.x} y2={tiltWedge.pPlane.y} className={motTiltRef()} />
        <line x1={tiltWedge.p0.x} y1={tiltWedge.p0.y} x2={tiltWedge.pOrbit.x} y2={tiltWedge.pOrbit.y} className={motTiltRef(true)} />
        <text x={tiltWedge.p0.x + 12} y={tiltWedge.p0.y - 42} className={motTiltLabel} textAnchor="start">
          ~{fmt(5)}° झुकाव
        </text>

        {/* nodes — the two points where the tilted orbit pierces the plane */}
        {[
          { p: asc, ne: "राहु", dy: -20 },
          { p: desc, ne: "केतु", dy: 32 },
        ].map((n) => (
          <g key={n.ne}>
            <circle cx={n.p.x} cy={n.p.y} r={11} className={motNode} />
            <circle cx={n.p.x} cy={n.p.y} r={4} className={motNodeDot} />
            <text x={n.p.x} y={n.p.y + n.dy} className={motNodeLabel} textAnchor="middle">
              {n.ne}
            </text>
          </g>
        ))}

        {/* Moon while it is above the plane (drawn on top, bright) */}
        {moonAbove && moonGroup}

        {/* Sun */}
        <circle cx={sun.x} cy={sun.y} r={40} fill="url(#mot-sunglow)" />
        <circle cx={sun.x} cy={sun.y} r={24} fill="url(#mot-sun)" />
        <text x={sun.x} y={sun.y + 42} className={motSunLabel} textAnchor="middle">
          सूर्य
        </text>

        {/* Sun–Earth–shadow axis — crimson, drawn last so nothing occludes it */}
        <g>
          <line x1={sun.x} y1={sun.y} x2={shadow.x} y2={shadow.y} className={motSunBeamAligned(!!season)} />
          <line x1={sun.x} y1={sun.y} x2={shadow.x} y2={shadow.y} className={motSunOutlineAligned(!!season)} />
          <line x1={sun.x} y1={sun.y} x2={shadow.x} y2={shadow.y} className={motSunLineAligned(!!season)} />
          <circle cx={shadow.x} cy={shadow.y} r={11} className={motShadowDot} />
          <text x={shadow.x} y={shadow.y - 18} className={motShadowLabel} textAnchor="middle">
            छायाँ
          </text>
        </g>

        {/* eclipse banner */}
        {eclipsing && (
          <text
            x={CX}
            y={48}
            className={motEclipseBannerType(status === "lunar" ? "lunar" : "solar")}
            textAnchor="middle"
          >
            {status === "lunar" ? "● चन्द्रग्रहण — चन्द्र पृथ्वीको छायाँमा" : "● सूर्यग्रहण — चन्द्र सूर्य–पृथ्वी बीचमा"}
          </text>
        )}
        {!eclipsing && season && (
          <text x={CX} y={48} className={motSeasonBanner} textAnchor="middle">
            ग्रहण ऋतु — पात रेखा सूर्यसँग मिल्यो (पूर्णिमा/औंसी कुर्नुहोस्)
          </text>
        )}
      </g>
    </svg>
  );
}

export function MoonOrbitTiltStudy() {
  const [dayT, setDayT] = useState(0); // annual clock (Sun + Moon)
  const [precT, setPrecT] = useState(0); // nodal precession (years)
  const [playing, setPlaying] = useState(true);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDayT((p) => (p + dt * PLAYBACK_DAYS_PER_SEC) % YEAR_RANGE);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

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
      angDiff(E, 180) < 12 ? "पूर्णिमा" : angDiff(E, 0) < 12 ? "औंसी" : E < 180 ? "शुक्ल पक्ष" : "कृष्ण पक्ष";
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
      ? "चन्द्रग्रहण"
      : model.status === "solar"
        ? "सूर्यग्रहण"
        : model.season
          ? "ग्रहण ऋतु"
          : "ग्रहण छैन";

  return (
    <div className={tmCardPadLg}>
      <MoonOrbitDiagram
        omega={model.omega}
        moonU={model.u}
        sunLon={model.sunLon}
        status={model.status}
        season={model.season}
      />
      <div className={edControls}>
        <div className={edReadout}>
          <div className={edRo}>
            <span className={edRoK}>कक्ष झुकाव</span>
            <span className={edRoV({ mono: true })}>~{fmt(REAL_TILT.toFixed(1))}°</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>चन्द्र चरण</span>
            <span className={edRoV()}>{model.phase}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>पात-चक्र</span>
            <span className={edRoV({ mono: true })}>{fmt(precT.toFixed(1))} / {fmt(NODAL_YEARS)} वर्ष</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>अवस्था</span>
            <span className={edRoV({ amber: model.status !== "none" })}>{statusText}</span>
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>वर्ष — सूर्य रेखा घुम्छ</span>
          <div className={edScrubWrap}>
            <button
              type="button"
              className={edPlayBtn}
              onClick={() => setPlaying((p) => !p)}
              title={playing ? "रोक्नुहोस्" : "चलाउनुहोस्"}
              aria-label={playing ? "रोक्नुहोस्" : "चलाउनुहोस्"}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              className={edScrub}
              type="range"
              min={0}
              max={YEAR_RANGE}
              step={0.5}
              value={dayT}
              style={{ "--fill": `${(dayT / YEAR_RANGE) * 100}%` } as React.CSSProperties}
              onChange={(e) => {
                setPlaying(false);
                setDayT(+e.target.value);
              }}
            />
          </div>
        </div>

        <div className={motSliderRow}>
          <span className={motSliderLabel}>पात-चक्र — {fmt(NODAL_YEARS)} वर्षे precession</span>
          <input
            className={edScrub}
            type="range"
            min={0}
            max={NODAL_YEARS}
            step={0.05}
            value={precT}
            style={{ "--fill": `${(precT / NODAL_YEARS) * 100}%` } as React.CSSProperties}
            onChange={(e) => setPrecT(+e.target.value)}
          />
        </div>

        <div className={edPresets}>
          <button type="button" className={edPreset()} onClick={jumpNextEclipse}>
            अर्को ग्रहण →
          </button>
          <button
            type="button"
            className={edPreset()}
            onClick={() => setPrecT((p) => (p + NODAL_YEARS / 4) % NODAL_YEARS)}
          >
            पात रेखा घुमाउनुहोस्
          </button>
        </div>
      </div>
      <p className={tmCardCap}>
        पृथ्वीको बीचबाट गएको <span className={cn("hl-amber")}>सूर्य–पृथ्वी (ग्रहण) रेखा</span> सूर्यसँगै वर्षमा
        एक फेरो घुम्छ। चन्द्रको कक्ष <b>~{fmt(5)}°</b> झुकेकाले धेरैजसो पूर्णिमामा चन्द्र यो रेखाभन्दा
        माथि/तल हुन्छ — ग्रहण <b>हुँदैन</b>। ग्रहण त्यतिबेला मात्र हुन्छ जब यो रेखा{" "}
        <span className={cn("hl")}>राहु वा केतु</span> मा पुग्छ र त्यहीँ चन्द्र (पूर्णिमा/औंसी) पर्छ।
        तल्लो स्लाइडरले पात रेखालाई <b>{fmt(NODAL_YEARS)} वर्षे</b> चक्रमा घुमाउँछ — त्यसैले ग्रहण ऋतु
        हरेक वर्ष सर्दै जान्छ।
      </p>
    </div>
  );
}
