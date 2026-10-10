import { useMemo, useRef } from "react";
import { edArc, edArcCap, edArcVal, edAxis, edBodyLabel, edCurband, edDeglabel, edDegtick, edEarthOrbitArrow, edEarthOrbitLabel, edEarthSolarOrbit, edEndEn, edEndNe, edLens, edOrbit, edOrbitDir, edOrbitDirArrow, edOrbitDirLabel, edPakshaOn, edRay, edRing, edRmline, edTiltCap, edTiltEq, edTiltLabel, edTiltPole, edTiltRim, edTnumCur, hoEarthGroup } from "@/lib/diagram-classes";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { edSvg } from "@/lib/learn-classes";
import { moonSunFacingRotation } from "@/lib/moon-phase-svg";
import { EarthGlobeImage, EARTH_AXIAL_TILT } from "@/components/learn/EarthGlobeImage";
import { SYNODIC_MONTH, TROPICAL_YEAR } from "@/components/learn/sun-earth-moon-math";
import {
  tithiIndexFromElongation,
  tithiNum,
} from "@/lib/tithi-wheel-data";
import { MoonPhaseDisc } from "./MoonPhaseDisc";

const RAD = Math.PI / 180;

const ED = {
  W: 1280,
  H: 1080,
  /** Extra viewBox padding so Earth’s monthly arc and moon orbit never clip. */
  padT: 160,
  padL: 24,
  padR: 24,
  padB: 48,
  sunX: 110,
  sunY: 520,
  sunR: 66,
  /** Earth at औंसी (E = 0) — baseline for the lunar-month arc. */
  earthX0: 710,
  earthY0: 520,
  earthR: 60,
  R: 276,
  ringIn: 250,
  ringOut: 302,
  degR: 332,
  moonR: 22,
} as const;

const ED_VB = `${-ED.padL} ${-ED.padT} ${ED.W + ED.padL + ED.padR} ${ED.H + ED.padT + ED.padB}`;

const SUN_EARTH_D = ED.earthX0 - ED.sunX;
const MAX_SWEEP_PTS = 40;
const MAX_EARTH_TRAVEL_PTS = 32;
const ARC_R = ED.ringOut + 36;
/** Earth travels this many degrees around the Sun during one synodic month (~29.5 d). */
export const EARTH_ARC_SYNODIC = (360 * SYNODIC_MONTH) / TROPICAL_YEAR;

export function earthOrbitDegFromElongation(E: number): number {
  return (E / 360) * EARTH_ARC_SYNODIC;
}

/** Earth’s heliocentric arc (°) after `day` elapsed synodic days (may span multiple months). */
export function earthOrbitDegFromLunarDay(day: number): number {
  return (day / SYNODIC_MONTH) * EARTH_ARC_SYNODIC;
}

export function earthPosFromElongation(E: number): [number, number] {
  const a = earthOrbitDegFromElongation(E) * RAD;
  return [ED.sunX + SUN_EARTH_D * Math.cos(a), ED.sunY - SUN_EARTH_D * Math.sin(a)];
}

export function earthPosFromLunarDay(day: number): [number, number] {
  const a = earthOrbitDegFromLunarDay(day) * RAD;
  return [ED.sunX + SUN_EARTH_D * Math.cos(a), ED.sunY - SUN_EARTH_D * Math.sin(a)];
}

function sunDirFromEarth(ex: number, ey: number): number {
  return (((Math.atan2(-(ED.sunY - ey), ED.sunX - ex) / RAD) % 360) + 360) % 360;
}

function moonAngle(E: number, ex: number, ey: number): number {
  return sunDirFromEarth(ex, ey) + E;
}

const edPos = (E: number, r: number, ex: number, ey: number): [number, number] => {
  const a = moonAngle(E, ex, ey) * RAD;
  return [ex + r * Math.cos(a), ey - r * Math.sin(a)];
};

function buildMoonSweepPath(d0: number, d1: number, arcR: number): string {
  if (d1 <= d0) return "";
  const pts: string[] = [];
  const steps = MAX_SWEEP_PTS;
  for (let i = 0; i <= steps; i++) {
    const d = d0 + (i / steps) * (d1 - d0);
    const e = ((d % SYNODIC_MONTH) / SYNODIC_MONTH) * 360;
    const [ex, ey] = earthPosFromLunarDay(d);
    const [x, y] = edPos(e, arcR, ex, ey);
    pts.push((i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1));
  }
  return pts.join(" ");
}


function computeSweepSegments(elapsedDay: number, arcR: number): { d: string; opacity: number }[] {
  const completeMonths = Math.floor(elapsedDay / SYNODIC_MONTH);
  const segments: { d: string; opacity: number }[] = [];
  for (let m = 0; m < completeMonths; m++) {
    const path = buildMoonSweepPath(m * SYNODIC_MONTH, (m + 1) * SYNODIC_MONTH, arcR);
    if (path) segments.push({ d: path, opacity: 0.5 });
  }
  const partialStart = completeMonths * SYNODIC_MONTH;
  if (elapsedDay > partialStart + 0.02) {
    const path = buildMoonSweepPath(partialStart, elapsedDay, arcR);
    if (path) segments.push({ d: path, opacity: 1 });
  }
  return segments;
}

function buildEarthTraveledPath(elapsedDay: number): string {
  if (elapsedDay <= 0) return "";
  const pts: string[] = [];
  const steps = MAX_EARTH_TRAVEL_PTS;
  for (let i = 0; i <= steps; i++) {
    const day = (i / steps) * elapsedDay;
    const a = earthOrbitDegFromLunarDay(day) * RAD;
    const x = ED.sunX + SUN_EARTH_D * Math.cos(a);
    const y = ED.sunY - SUN_EARTH_D * Math.sin(a);
    pts.push((i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1));
  }
  return pts.join(" ");
}

const SUN_RAYS = Array.from({ length: 16 }, (_, k) => {
  const a = (k / 16) * Math.PI * 2;
  const r0 = ED.sunR + 3;
  const r1 = ED.sunR + (k % 2 ? 12 : 20);
  return { a, r0, r1 };
});

interface Props {
  E?: number;
  /** Elapsed synodic days (unwrapped) — keeps Earth moving across multiple lunar months. */
  lunarDay?: number;
  /** How many lunar months of Earth arc to draw (default 1). */
  earthPathMonths?: number;
  onE?: (v: number) => void;
  compact?: boolean;
  month?: string;
}

export function ElongationDiagram({
  E: EProp = 87,
  lunarDay,
  earthPathMonths = 1,
  onE,
  compact,
  month = "असार",
}: Props) {
  const fmt = (n: number) => toNepaliDigits(n);
  const elapsedDay = lunarDay ?? (EProp / 360) * SYNODIC_MONTH;
  const E = lunarDay != null ? ((elapsedDay % SYNODIC_MONTH) / SYNODIC_MONTH) * 360 : EProp;
  const curPaksha = (((E % 360) + 360) % 360) < 180 ? "शुक्ल" : "कृष्ण";
  const idx = tithiIndexFromElongation(E);
  const [earthX, earthY] = earthPosFromLunarDay(elapsedDay);
  const earthArc = earthOrbitDegFromLunarDay(elapsedDay);
  const [mx, my] = edPos(E, ED.R, earthX, earthY);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef(false);

  const earthArcSpan = EARTH_ARC_SYNODIC * earthPathMonths;
  const earthSolarPath = useMemo(() => {
    const pts: string[] = [];
    const steps = Math.max(28, Math.round(28 * earthPathMonths));
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * earthArcSpan * RAD;
      const x = ED.sunX + SUN_EARTH_D * Math.cos(a);
      const y = ED.sunY - SUN_EARTH_D * Math.sin(a);
      pts.push((i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1));
    }
    return pts.join(" ");
  }, [earthArcSpan, earthPathMonths]);

  const eFromEvt = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return E;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * (ED.W + ED.padL + ED.padR) - ED.padL;
    const py = ((e.clientY - r.top) / r.height) * (ED.H + ED.padT + ED.padB) - ED.padT;
    let guess = E;
    for (let i = 0; i < 4; i++) {
      const [ex, ey] = earthPosFromLunarDay(elapsedDay);
      const moonAng = Math.atan2(-(py - ey), px - ex) / RAD;
      guess = ((moonAng - sunDirFromEarth(ex, ey)) % 360 + 360) % 360;
    }
    return guess;
  };

  const degTicks: React.ReactNode[] = [];
  if (!compact) {
    for (let d = 0; d <= 360; d += 12) {
      const isMajor = d % 24 === 0;
      const [tx, ty] = edPos(d, ED.degR, earthX, earthY);
      const [i0x, i0y] = edPos(d, ED.ringOut, earthX, earthY);
      const [i1x, i1y] = edPos(d, ED.ringOut + (isMajor ? 13 : 7), earthX, earthY);
      degTicks.push(
        <line
          key={`dt${d}`}
          x1={i0x}
          y1={i0y}
          x2={i1x}
          y2={i1y}
          className={edDegtick}
          strokeWidth={isMajor ? 1.3 : 0.8}
          opacity={isMajor ? 0.9 : 0.5}
        />
      );
      if (isMajor && d < 360) {
        const shown = d <= 180 ? d : 360 - d;
        degTicks.push(
          <text
            key={`dl${d}`}
            x={tx}
            y={ty}
            className={edDeglabel}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {fmt(shown)}°
          </text>
        );
      }
    }
  }

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < 30; i++) {
    const E0 = i * 12;
    const Emid = i * 12 + 6;
    const isCur = i === idx;
    const ang0 = moonAngle(E0, earthX, earthY);
    const [lx, ly] = edPos(E0, ED.R, earthX, earthY);
    cells.push(
      <g key={`lens${i}`} transform={`translate(${lx},${ly}) rotate(${-ang0 + 90})`}>
        <ellipse cx={0} cy={0} rx={4.6} ry={13} className={edLens} />
      </g>
    );
    const [nx, ny] = edPos(Emid, ED.ringIn - 22, earthX, earthY);
    cells.push(
      <text
        key={`tn${i}`}
        x={nx}
        y={ny}
        className={edTnumCur(isCur)}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {fmt(tithiNum(i))}
      </text>
    );
    if (isCur) {
      const [hx, hy] = edPos(Emid, ED.R, earthX, earthY);
      cells.push(<circle key={`cur${i}`} cx={hx} cy={hy} r={21} className={edCurband} />);
    }
  }

  const arcR = ARC_R;
  const sweepSegments = useMemo(
    () => computeSweepSegments(elapsedDay, arcR),
    [elapsedDay, arcR],
  );
  const [capx, capy] = edPos(E, arcR, earthX, earthY);

  const earthTraveledPath = buildEarthTraveledPath(elapsedDay);

  const [shuklaX, shuklaY] = edPos(90, ED.degR + 20, earthX, earthY);
  const [krishnaX, krishnaY] = edPos(270, ED.degR + 20, earthX, earthY);
  const [amX, amY] = edPos(0, ED.R, earthX, earthY);
  const [puX, puY] = edPos(180, ED.R, earthX, earthY);
  const [arcLabelX, arcLabelY] = edPos(E / 2, arcR - 30, earthX, earthY);

  const orbitDirPath = (() => {
    const [x0, y0] = edPos(24, ED.R, earthX, earthY);
    const [x1, y1] = edPos(66, ED.R, earthX, earthY);
    const [xm, ym] = edPos(45, ED.R + 28, earthX, earthY);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${xm.toFixed(1)} ${ym.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  })();

  const moonRot = moonSunFacingRotation(mx, my, ED.sunX, ED.sunY);

  const TILT_RAD = (EARTH_AXIAL_TILT * Math.PI) / 180;
  const axUx = Math.sin(TILT_RAD);
  const axUy = -Math.cos(TILT_RAD);
  const eqUx = -axUy;
  const eqUy = axUx;
  const eqHalf = ED.earthR * 0.92;

  const [earthArcLabelX, earthArcLabelY] = [
    ED.sunX + (SUN_EARTH_D * 0.52) * Math.cos(earthArc * 0.5 * RAD),
    ED.sunY - (SUN_EARTH_D * 0.52) * Math.sin(earthArc * 0.5 * RAD),
  ];

  return (
    <svg
      ref={svgRef}
      viewBox={ED_VB}
      className={edSvg("tithi", !!onE)}
      onPointerDown={(e) => {
        if (!onE) return;
        drag.current = true;
        onE(eFromEvt(e));
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current && onE) onE(eFromEvt(e));
      }}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
    >
      <defs>
        <marker
          id="ed-orbit-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" className={edOrbitDirArrow} />
        </marker>
        <marker
          id="ed-earth-orbit-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0,0 L7,3.5 L0,7 Z" className={edEarthOrbitArrow} />
        </marker>
        <radialGradient id="ed-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="38%" stopColor="#ffd24a" />
          <stop offset="78%" stopColor="#f08a1d" />
          <stop offset="100%" stopColor="#d65b12" />
        </radialGradient>
        <radialGradient id="ed-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcf57" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#ffcf57" stopOpacity={0} />
        </radialGradient>
      </defs>

      <path d={earthSolarPath} className={edEarthSolarOrbit} fill="none" markerEnd="url(#ed-earth-orbit-arrow)" />
      {earthTraveledPath && (
        <path
          d={earthTraveledPath}
          className={edEarthSolarOrbit}
          fill="none"
          opacity={0.95}
          strokeWidth={2.4}
        />
      )}
      {!compact && (
        <text
          x={earthArcLabelX}
          y={earthArcLabelY - 10}
          className={edEarthOrbitLabel}
          textAnchor="middle"
        >
          पृथ्वी ~{fmt(Math.round(earthArcSpan))}° / {fmt(earthPathMonths)} चान्द्र मास
        </text>
      )}

      <line x1={ED.sunX} y1={ED.sunY} x2={earthX} y2={earthY} className={edAxis} />
      <circle cx={earthX} cy={earthY} r={ED.R} className={edOrbit} />
      <circle cx={earthX} cy={earthY} r={ED.ringIn} className={edRing} />
      <circle cx={earthX} cy={earthY} r={ED.ringOut} className={edRing} />

      <path d={orbitDirPath} className={edOrbitDir} fill="none" markerEnd="url(#ed-orbit-arrow)" />
      <text x={earthX} y={earthY - ED.R - 18} className={edOrbitDirLabel} textAnchor="middle">
        ↺ वामावर्त · चन्द्र
      </text>

      {!compact && degTicks}
      {cells}

      {!compact && (
        <text
          x={shuklaX}
          y={shuklaY}
          className={edPakshaOn(curPaksha === "शुक्ल")}
          textAnchor="middle"
        >
          {month} शुक्ल पक्ष
        </text>
      )}
      {!compact && (
        <text
          x={krishnaX}
          y={krishnaY}
          className={edPakshaOn(curPaksha === "कृष्ण")}
          textAnchor="middle"
        >
          {month} कृष्ण पक्ष
        </text>
      )}

      {sweepSegments.map((seg, i) => (
        <path key={`sweep${i}`} d={seg.d} className={edArc} fill="none" opacity={seg.opacity} />
      ))}
      <circle cx={capx} cy={capy} r={4} className={edArcCap} />
      <text
        x={arcLabelX}
        y={arcLabelY}
        className={edArcVal}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {fmt(Math.round(E))}°
      </text>

      <line x1={earthX} y1={earthY} x2={mx} y2={my} className={edRmline} />

      <circle cx={ED.sunX} cy={ED.sunY} r={ED.sunR + 34} fill="url(#ed-sunglow)" />
      {SUN_RAYS.map((ray, k) => (
        <line
          key={`ray${k}`}
          x1={ED.sunX + ray.r0 * Math.cos(ray.a)}
          y1={ED.sunY + ray.r0 * Math.sin(ray.a)}
          x2={ED.sunX + ray.r1 * Math.cos(ray.a)}
          y2={ED.sunY + ray.r1 * Math.sin(ray.a)}
          className={edRay}
        />
      ))}
      <circle cx={ED.sunX} cy={ED.sunY} r={ED.sunR} fill="url(#ed-sun)" />
      <text x={ED.sunX} y={ED.sunY + ED.sunR + 30} className={edBodyLabel} textAnchor="middle">
        सूर्य
      </text>

      <g className={hoEarthGroup} transform={`translate(${earthX - ED.earthX0} ${earthY - ED.earthY0})`}>
        <EarthGlobeImage cx={ED.earthX0} cy={ED.earthY0} r={ED.earthR} />
        <circle cx={ED.earthX0} cy={ED.earthY0} r={ED.earthR} fill="none" className={edTiltRim} strokeWidth={1} />
        <line
          x1={ED.earthX0 - eqUx * eqHalf}
          y1={ED.earthY0 - eqUy * eqHalf}
          x2={ED.earthX0 + eqUx * eqHalf}
          y2={ED.earthY0 + eqUy * eqHalf}
          className={edTiltEq}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <line
          x1={ED.earthX0 - axUx * ED.earthR * 1.05}
          y1={ED.earthY0 - axUy * ED.earthR * 1.05}
          x2={ED.earthX0 + axUx * ED.earthR * 1.5}
          y2={ED.earthY0 + axUy * ED.earthR * 1.5}
          className={edTiltPole}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <circle cx={ED.earthX0 + axUx * ED.earthR} cy={ED.earthY0 + axUy * ED.earthR} r={4} className={edTiltCap} />
        <text x={ED.earthX0 + axUx * ED.earthR * 1.5 + 8} y={ED.earthY0 + axUy * ED.earthR * 1.5 - 2} textAnchor="start" className={edTiltLabel}>
          अक्ष {fmt(EARTH_AXIAL_TILT)}°
        </text>
        <text x={ED.earthX0} y={ED.earthY0 + ED.earthR + 22} className={edBodyLabel} textAnchor="middle">
          पृथ्वी
        </text>
      </g>

      <g transform={`translate(${mx},${my}) rotate(${moonRot})`}>
        <MoonPhaseDisc elongation={E} r={ED.moonR} uid="ed-moon" />
      </g>

      <text x={amX - 14} y={amY - 30} className={edEndNe()} textAnchor="middle">
        औंसी
      </text>
      <text x={amX - 14} y={amY - 12} className={edEndEn()} textAnchor="middle">
        ०°
      </text>
      <text x={puX + 16} y={puY - 30} className={edEndNe()} textAnchor="middle">
        पूर्णिमा
      </text>
      <text x={puX + 16} y={puY - 12} className={edEndEn()} textAnchor="middle">
        १८०°
      </text>
    </svg>
  );
}
