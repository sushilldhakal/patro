import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoonPhaseIcon } from "./MoonPhaseIcon";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { getBSMonthLength } from "@/lib/bs-calendar";
import {
  bsMonthsForWheel,
  GRAHA_META,
  GREG_EN,
  GREG_NE,
  getWheelRashis,
  normDeg,
  PADA_AKSHAR,
  type WheelDetail,
  type WheelMarkers,
  type WheelTweaks,
} from "@/lib/wheel-data";
import { useLocale, bilingualText } from "@/i18n/locale";
import { KARANA_SEQ, WHEEL_TITHIS, WHEEL_YOGAS } from "@/lib/tithi-wheel-data";
import { wheelSvg, wheelSvgWrap } from "@/lib/wheel-classes";
import { cn } from "@/lib/utils";
import { NAKSHATRA_GLYPHS, RASHI_GLYPHS } from "@/lib/wheel-glyph-art";
import { WheelGlyph } from "@/lib/wheel-glyphs";
import {
  wDaytick,
  wHit,
  wKarLbl,
  wLabel,
  wLagnaCap,
  wLagnaLine,
  wMonthGreg,
  wMonthNe,
  wNakName,
  wOrbit,
  wPadaAkshar,
  wPlanetGlow,
  wPlanetName,
  wRashiName,
  wRashiRay,
  wRimCircle,
  wSegNak,
  wSegNow,
  wSegPada,
  wSegRashi,
  wTwName,
  wYogaLbl,
} from "@/lib/wheel-svg-classes";

const DEG = Math.PI / 180;
const CX = 500;
const CY = 500;

/** Scale factor applied to all planet orbit radii to leave room for the inner yoga/karana/tithi rings. */
const ORBIT_SCALE = 0.58;

/**
 * Every inner ring shares a boundary with its neighbour, so no dead band opens
 * up between them: Yoga → Rashi, Karana → Tithi → Rashi, Karana → pada inner.
 * The yoga ring's inner edge is pinned just clear of the outermost planet orbit
 * (216 × ORBIT_SCALE ≈ 125, plus the widest planet body) rather than to a ring.
 */
const R_YOGA_I = 140;
const R_YOGA_O = 178; // shared boundary with rashi inner / core
const R_KAR_I  = 303;
const R_KAR_O  = 327; // shared boundary with pada inner
const R_TIT_I  = 263; // shared boundary with rashi outer
const R_TIT_O  = 303; // shared boundary with karana inner

const R = {
  rimOuter: 497,
  tickIn: 481,
  gregOut: 481,
  gregMid: 467,
  gregIn: 453,
  bsOut: 453,
  bsMid: 438,
  bsIn: 424,
  nakOut: 423,
  nakIcon: 403,
  nakName: 372,
  nakIn: 345,
  padaOut: 345,
  padaNum: 336,
  padaIn: 327,
  rashiOut: 263,
  rashiGlyph: 246,
  rashiName: 222,
  rashiIn: 178,
  core: 178,
} as const;

/**
 * Glyph box sizes. Both are "contain" fits, so these are the longer side of the
 * artwork, not its apparent weight — the rashi band (178–263) has more radial
 * room to spare than the nakshatra band, whose glyph shares 345–423 with a name
 * that runs to two stacked rows in English.
 */
const RASHI_GLYPH_SIZE = 30;
const NAK_GLYPH_SIZE = 26;

function planetVisualRadius(index: number): number {
  const meta = GRAHA_META[index];
  if (!meta) return 8;
  if ("big" in meta && meta.big) return 15;
  if (index === 1) return 10;
  return 8;
}

function planetHitRadius(index: number): number {
  const r = planetVisualRadius(index);
  if (index === 0) return r + 26;
  if (index >= 6) return r + 32;
  return r + 24;
}

function planetSvgPosition(lon: number, orbit: number, spinDeg: number): [number, number] {
  const a = (lon + spinDeg) * DEG;
  return [CX - orbit * ORBIT_SCALE * Math.sin(a), CY - orbit * ORBIT_SCALE * Math.cos(a)];
}

export type WheelHover = { type: "nak"; i: number } | { type: "rashi"; i: number };

/** Split a ring label on whitespace so each word gets its own radial row. */
function labelRows(label: string): string[] {
  return label.trim().split(/\s+/).filter(Boolean);
}

interface RingLabelProps {
  L: number;
  r: number;
  cls: string;
  spin: number;
  size?: number;
  children?: React.ReactNode;
  /**
   * Stack the label radially instead of running it along the ring. Long
   * English names ("Uttara Bhadrapada") overrun their segment's arc on one
   * line, so they get split a word per row.
   */
  rows?: readonly string[];
}

function RingLabel({ L, r, cls, spin, size, children, rows }: RingLabelProps) {
  const a = normDeg(L + spin);
  const flip = a > 90 && a < 270;
  // Flipping rotates the stack too, so reverse the rows to keep reading order.
  const stack = rows && rows.length > 1 ? (flip ? [...rows].reverse() : rows) : null;
  return (
    <g transform={`rotate(${-(L + spin)} ${CX} ${CY})`}>
      <text
        x={CX}
        y={CY - r}
        textAnchor="middle"
        dominantBaseline="central"
        className={cls}
        style={size ? { fontSize: size } : undefined}
        transform={flip ? `rotate(180 ${CX} ${CY - r})` : undefined}
      >
        {stack
          ? stack.map((row, i) => (
              <tspan
                key={`${row}-${i}`}
                x={CX}
                dy={i === 0 ? `${(-0.55 * (stack.length - 1)).toFixed(2)}em` : "1.1em"}
              >
                {row}
              </tspan>
            ))
          : (children ?? rows?.[0])}
      </text>
    </g>
  );
}

interface WheelChartProps {
  det: WheelDetail;
  markers: WheelMarkers;
  spin: number;
  tw: WheelTweaks;
  bsYear: number;
  hover: WheelHover | null;
  onHover: (h: WheelHover) => void;
  onLeave: () => void;
  onSpin: (deg: number) => void;
  zoom: number;
  onZoom: (z: number) => void;
  pan: { x: number; y: number };
  onPan: (x: number, y: number) => void;
  lineTarget?: number;
  onLineTargetChange?: (index: number) => void;
}

function WheelChartImpl({
  det,
  markers,
  spin,
  tw,
  bsYear,
  hover,
  onHover,
  onLeave,
  onSpin,
  zoom,
  onZoom,
  pan,
  onPan,
  lineTarget: lineTargetProp,
  onLineTargetChange,
}: WheelChartProps) {
  const dragRef = useRef<
    | { mode: "r"; a: number; spin0: number; moved: boolean }
    | { mode: "p"; x0: number; y0: number; pan0x: number; pan0y: number; moved: boolean }
    | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  /** Active pointer positions for pinch-to-zoom. */
  const ptrRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom0: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  /**
   * Graha the alignment needle points at (0..8 in GRAHA order). Defaults to
   * the Moon; tapping a planet moves the needle to it so you can read which
   * rashi / nakshatra that planet falls in.
   */
  const [innerTarget, setInnerTarget] = useState(1);
  const lineTarget = lineTargetProp ?? innerTarget;
  const setLineTarget = (index: number) => {
    if (lineTargetProp === undefined) setInnerTarget(index);
    onLineTargetChange?.(index);
  };
  const { lang } = useLocale();
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const detRef = useRef(det);
  detRef.current = det;

  const pickPlanetAtClient = useCallback((clientX: number, clientY: number): number => {
    const wrap = wrapRef.current;
    if (!wrap) return -1;
    const r = wrap.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return -1;
    const svgX = 42 + ((clientX - r.left) / r.width) * 916;
    const svgY = 42 + ((clientY - r.top) / r.height) * 916;
    let best = -1;
    let bestD = Infinity;
    const lons = markersRef.current.planetLons;
    for (let i = 0; i < detRef.current.grahas.length; i++) {
      const meta = GRAHA_META[i]!;
      const [px, py] = planetSvgPosition(lons[i] ?? 0, meta.orbit, spinRef.current);
      const d = Math.hypot(svgX - px, svgY - py);
      const hitR = planetHitRadius(i);
      if (d <= hitR && d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }, []);

  const pol = useCallback(
    (L: number, r: number): [number, number] => {
      const a = (L + spin) * DEG;
      return [CX - r * Math.sin(a), CY - r * Math.cos(a)];
    },
    [spin]
  );

  const arcSeg = useCallback(
    (L0: number, L1: number, r0: number, r1: number): string => {
      const [x1, y1] = pol(L0, r1);
      const [x2, y2] = pol(L1, r1);
      const [x3, y3] = pol(L1, r0);
      const [x4, y4] = pol(L0, r0);
      const large = L1 - L0 > 180 ? 1 : 0;
      return `M${x1},${y1} A${r1},${r1} 0 ${large} 0 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 ${large} 1 ${x4},${y4} Z`;
    },
    [pol]
  );

  const { moonLon, planetLons, sunLon } = markers;

  // The static rings \u2014 nakshatra / rashi / pada arcs, day ticks, hit targets and
  // the Gregorian month labels \u2014 depend only on the wheel's geometry (spin),
  // hover/selection and the BS year, NOT on the panchanga data. Memoizing them
  // here means scrubbing the year slider (which only changes `det`/`markers`)
  // never rebuilds these ~600 nodes; only the data layers below re-render.
  const staticLayers = useMemo(() => {
    const rashis = getWheelRashis();
    const nakSegs: React.ReactNode[] = [];
    const nakDecor: React.ReactNode[] = [];
    for (let i = 0; i < 27; i++) {
      const L0 = i * (360 / 27);
      const L1 = (i + 1) * (360 / 27);
      const Lm = (L0 + L1) / 2;
      const ico = NAKSHATRA_ICONS[i]!;
      const isHot = hover?.type === "nak" && hover.i === i;
      nakSegs.push(
        <path
          key={`ns${i}`}
          d={arcSeg(L0, L1, R.nakIn, R.nakOut)}
          className={wSegNak({ alt: i % 2 === 1, hot: isHot })}
        />
      );
      // The name used to sit alone at the band's midpoint; it moves in to
      // R.nakName so the glyph can take R.nakIcon, the slot already reserved for
      // it out near the rim. Both stay — the icon reads at a glance, the name
      // is what you actually look up.
      const [nx, ny] = pol(Lm, R.nakIcon);
      nakDecor.push(
        <g key={`ni${i}`}>
          <WheelGlyph
            art={NAKSHATRA_GLYPHS[i]}
            size={NAK_GLYPH_SIZE}
            cx={nx}
            cy={ny}
            className={wNakName(isHot)}
            title={bilingualText(lang, ico.ne, ico.en)}
          />
          <RingLabel
            L={Lm}
            r={R.nakName}
            cls={wNakName(isHot)}
            spin={spin}
            rows={labelRows(bilingualText(lang, ico.ne, ico.en))}
          />
        </g>
      );
    }

    const rashiSegs: React.ReactNode[] = [];
    const rashiDecor: React.ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const L0 = i * 30;
      const L1 = (i + 1) * 30;
      const Lm = L0 + 15;
      const rs = rashis[i]!;
      const isHot = hover?.type === "rashi" && hover.i === i;
      rashiSegs.push(
        <path
          key={`rs${i}`}
          d={arcSeg(L0, L1, R.rashiIn, R.rashiOut)}
          className={wSegRashi({ alt: i % 2 === 1, hot: isHot })}
        />
      );
      const [gx, gy] = pol(Lm, R.rashiGlyph);
      rashiDecor.push(
        <g key={`rd${i}`}>
          {/* Left upright rather than rotated with the ring: a crab or a pair of
              scales is only recognisable the right way up, and the Unicode symbol
              this replaced sat upright too. */}
          {/* Same class as the name, so hovering a sign tints its glyph too. */}
          <WheelGlyph
            art={RASHI_GLYPHS[i]}
            size={RASHI_GLYPH_SIZE}
            cx={gx}
            cy={gy}
            className={wRashiName(isHot)}
            title={bilingualText(lang, rs.ne, rs.en)}
          />
          <RingLabel L={Lm} r={R.rashiName} cls={wRashiName(isHot)} spin={spin}>
            {bilingualText(lang, rs.ne, rs.en)}
          </RingLabel>
        </g>
      );
    }

    const padaCells: React.ReactNode[] = [];
    if (tw.show_pada) {
      for (let i = 0; i < 108; i++) {
        const L0 = i * (360 / 108);
        const L1 = (i + 1) * (360 / 108);
        const Lm = (L0 + L1) / 2;
        padaCells.push(
          <g key={`pc${i}`}>
            <path
              d={arcSeg(L0, L1, R.padaIn, R.padaOut)}
              className={wSegPada(Math.floor(i / 4) % 2 === 1)}
            />
            <RingLabel L={Lm} r={R.padaNum} cls={wPadaAkshar} spin={spin}>
              {PADA_AKSHAR[Math.floor(i / 4)]![i % 4]}
            </RingLabel>
          </g>
        );
      }
    }

    const dayTicks: React.ReactNode[] = [];
    if (tw.show_lunar) {
      for (let i = 0; i < 12; i++) {
        const days = getBSMonthLength(bsYear, i + 1);
        for (let d = 1; d < days; d++) {
          const L = i * 30 + (d / days) * 30;
          const major = d % 5 === 0;
          const [x1, y1] = pol(L, R.bsOut - 1);
          const [x2, y2] = pol(L, R.bsOut - (major ? 11 : 6));
          dayTicks.push(
            <line
              key={`dt${i}_${d}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={wDaytick(major)}
            />
          );
        }
      }
    }

    const hits: React.ReactNode[] = [];
    for (let i = 0; i < 27; i++) {
      const L0 = i * (360 / 27);
      const L1 = (i + 1) * (360 / 27);
      hits.push(
        <path
          key={`hn${i}`}
          d={arcSeg(L0, L1, R.nakIn, R.nakOut)}
          className={wHit}
          onMouseEnter={() => onHover({ type: "nak", i })}
          onMouseLeave={onLeave}
        />
      );
    }
    for (let i = 0; i < 12; i++) {
      const L0 = i * 30;
      const L1 = (i + 1) * 30;
      hits.push(
        <path
          key={`hr${i}`}
          d={arcSeg(L0, L1, R.rashiIn, R.rashiOut)}
          className={wHit}
          onMouseEnter={() => onHover({ type: "rashi", i })}
          onMouseLeave={onLeave}
        />
      );
    }

    const rashiRays: React.ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pol(i * 30, 12);
      const [x2, y2] = pol(i * 30, R.rimOuter - 2);
      rashiRays.push(
        <line key={`ray${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className={wRashiRay} />
      );
    }

    const gregLabels: React.ReactNode[] = tw.show_greg
      ? GREG_NE.map((m, i) => (
          <RingLabel key={`g${i}`} L={(i - 3) * 30 + 5} r={R.gregMid} cls={wMonthGreg} spin={spin}>
            {bilingualText(lang, m, GREG_EN[i]!)}
          </RingLabel>
        ))
      : [];

    return { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, hits, rashiRays, gregLabels };
  }, [spin, hover, bsYear, tw, pol, arcSeg, onHover, onLeave, lang]);

  // The data layers — current-time markers, the inner tithi/karana/yoga rings
  // and the planet core — are the only parts that depend on the panchanga data
  // (`markers`/`det`). Memoizing them keeps non-data re-renders (hover, zoom,
  // pan) from rebuilding them, and isolates the work done per day while scrubbing.
  const dataLayers = useMemo(() => {
    const sunRashiIdx = Math.floor(normDeg(sunLon) / 30);

    const markerNodes: React.ReactNode[] = [];
    if (tw.show_today) {
    const mL0 = sunRashiIdx * 30;
    const mL1 = mL0 + 30;
    markerNodes.push(
      <path
        key="nowwedge-month"
        d={arcSeg(mL0, mL1, R.bsIn, R.bsOut)}
        className={wSegNow}
        style={{ pointerEvents: "none" }}
      />
    );
    // Alignment needle — points at the selected graha (Moon by default) so its
    // rashi/nakshatra alignment is readable out at the rim. Falls back to the
    // Moon if the target longitude is missing.
    const targetLon = planetLons[lineTarget] ?? moonLon;
    const targetSym = det.grahas[lineTarget]?.sym ?? "";
    const [lx, ly] = pol(targetLon, R.bsOut - 2);
    markerNodes.push(<line key="target-line" x1={CX} y1={CY} x2={lx} y2={ly} className={wLagnaLine} />);
    markerNodes.push(
      <g key="target-cap" transform={`rotate(${-(targetLon + spin)} ${CX} ${CY})`}>
        <circle cx={CX} cy={CY - (R.bsOut - 2)} r="3.4" className={wLagnaCap} />
        <text
          x={CX}
          y={CY - (R.bsOut + 5)}
          textAnchor="middle"
          dominantBaseline="central"
          className={wLabel}
          style={{ fontSize: 14, fill: "#f9c800" }}
          transform={
            normDeg(targetLon + spin) > 90 && normDeg(targetLon + spin) < 270
              ? `rotate(180 ${CX} ${CY - (R.bsOut + 5)})`
              : undefined
          }
        >
          {targetSym}
        </text>
      </g>
    );
  }

  // ── Inner tithi + karana rings ────────────────────────────────────────────
  const innerRings: React.ReactNode[] = [];
  if (tw.show_today) {
    const sunL = markers.sunLon;
    const elongation = normDeg(markers.moonLon - sunL);
    const curTithiIdx = Math.floor(elongation / 12);
    const curKarIdx = Math.floor(elongation / 6);

    // Separator circles (karana/pada and tithi/rashi boundaries are drawn by the main rim-circle list below)
    innerRings.push(
      <circle key="ir-yoga-i" cx={CX} cy={CY} r={R_YOGA_I} className={wRimCircle} strokeWidth="0.8" opacity="0.5" />,
    );

    // Yoga ring — 27 segments × (360/27)° each. Anchored at −sun so the segment
    // the single moon needle points at is always the current yoga: yoga = sun +
    // moon, and with this framing the needle at moonLon = (−sun) + (sun + moon)
    // lands inside floor((sun+moon)/yogaDeg). Same sun-anchored trick the tithi
    // and karana rings use, so the yoga ring rotates with the moon needle too.
    const yogaDeg = 360 / 27;
    const yogaAnchor = -sunL;
    const yogaSum = normDeg(markers.sunLon + markers.moonLon);
    const curYogaIdx = Math.floor(yogaSum / yogaDeg);
    for (let y = 0; y < 27; y++) {
      const L0 = yogaAnchor + y * yogaDeg;
      const L1 = yogaAnchor + (y + 1) * yogaDeg;
      const Lm = yogaAnchor + y * yogaDeg + yogaDeg / 2;
      const isCur = y === curYogaIdx;
      const yName = WHEEL_YOGAS[y]!;
      innerRings.push(
        <path
          key={`yog${y}`}
          d={arcSeg(L0, L1, R_YOGA_I, R_YOGA_O)}
          fill={isCur ? "rgba(160,125,232,0.20)" : "transparent"}
          stroke={isCur ? "#c4a8f0" : "rgba(169,212,212,0.28)"}
          strokeWidth={isCur ? 1.6 : 0.4}
        />
      );
      innerRings.push(
        <RingLabel
          key={`yog-lbl-${y}`}
          L={Lm}
          r={(R_YOGA_I + R_YOGA_O) / 2}
          cls={wYogaLbl(isCur)}
          spin={spin}
          // One size for every segment, current included. A 13.3° segment holds
          // ~37 units of arc at this radius and the longest name (आयुष्मान्) runs
          // 32 of them at 8 — enlarging just the current label would overflow on
          // whichever days that yoga is the current one. The highlight reads from
          // the brighter fill, stroke and text colour instead.
          size={8}
        >
          {/* The band is 38 wide now, not 18, so the type grew with it — else the
              ring reads as a bigger empty gap. Full names, no truncation: slicing
              to 4 chars cut mid-conjunct and left a dangling virama ("अतिगण्"). */}
          {yName}
        </RingLabel>
      );
    }

    // Karana ring — 60 segments × 6° each, anchored at the sun's absolute
    // longitude so the highlighted segment always contains the moon's
    // actual position (where the yellow needle points)
    for (let k = 0; k < 60; k++) {
      const L0 = sunL + k * 6;
      const L1 = sunL + (k + 1) * 6;
      const Lm = sunL + k * 6 + 3;
      const kd = KARANA_SEQ[k]!;
      const isCur = k === curKarIdx;
      const kName = bilingualText(lang, kd.ne, kd.en);
      innerRings.push(
        <path
          key={`kar${k}`}
          d={arcSeg(L0, L1, R_KAR_I, R_KAR_O)}
          fill={isCur ? "rgba(198,40,40,0.16)" : "transparent"}
          stroke={isCur ? "var(--w-accent)" : "rgba(169,212,212,0.28)"}
          strokeWidth={isCur ? 1.7 : 0.4}
        />
      );
      innerRings.push(
        <RingLabel
          key={`kar-lbl-${k}`}
          L={Lm}
          r={(R_KAR_I + R_KAR_O) / 2}
          cls={wKarLbl(isCur)}
          spin={spin}
          size={isCur ? 9 : 7.5}
        >
          {kName.length > 4 ? kName.slice(0, 4) : kName}
        </RingLabel>
      );
    }

    // Tithi ring — 30 segments × 12° each, same sun-anchored absolute frame as karana
    for (let i = 0; i < 30; i++) {
      const L0 = sunL + i * 12;
      const L1 = sunL + (i + 1) * 12;
      const Lm = sunL + i * 12 + 6;
      const isCur = i === curTithiIdx;
      const shukla = i < 15;
      const tName = bilingualText(lang, WHEEL_TITHIS[i]!.ne, WHEEL_TITHIS[i]!.en);
      innerRings.push(
        <g key={`tit${i}`}>
          <path
            d={arcSeg(L0, L1, R_TIT_I, R_TIT_O)}
            fill={
              isCur
                ? "color-mix(in srgb, var(--w-accent) 28%, #0d2428)"
                : shukla
                ? "color-mix(in srgb, #2d8a86 26%, #0a1a1e)"
                : "color-mix(in srgb, #2d8a86 14%, #060e10)"
            }
            stroke={isCur ? "var(--w-accent)" : "rgba(143,191,193,.18)"}
            strokeWidth={isCur ? 1.7 : 0.5}
          />
          <RingLabel
            L={Lm}
            r={(R_TIT_I + R_TIT_O) / 2}
            cls={wTwName(isCur)}
            spin={spin}
            size={isCur ? 12 : 9.5}
          >
            {tName.length > 6 ? tName.slice(0, 6) : tName}
          </RingLabel>
        </g>
      );
    }
  }

  // ── Planet core ───────────────────────────────────────────────────────────
  const core: React.ReactNode[] = [];
  if (tw.show_planets) {
    // Radial gradients giving each planet a 3D sphere appearance
    core.push(
      <defs key="pdefs">
        {/* 0 Sun */}
        <radialGradient id="pg0" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fff9c0"/><stop offset="35%" stopColor="#f9c800"/>
          <stop offset="75%" stopColor="#e07000"/><stop offset="100%" stopColor="#8b3c00"/>
        </radialGradient>
        {/* 1 Moon */}
        <radialGradient id="pg1" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#f6f8fa"/><stop offset="55%" stopColor="#b8c0cc"/>
          <stop offset="100%" stopColor="#6a7480"/>
        </radialGradient>
        {/* 2 Mars */}
        <radialGradient id="pg2" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#ff9870"/><stop offset="55%" stopColor="#c84830"/>
          <stop offset="100%" stopColor="#6e1800"/>
        </radialGradient>
        {/* 3 Mercury */}
        <radialGradient id="pg3" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#d8d4cc"/><stop offset="55%" stopColor="#989090"/>
          <stop offset="100%" stopColor="#504848"/>
        </radialGradient>
        {/* 4 Jupiter */}
        <radialGradient id="pg4" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#f0d898"/><stop offset="50%" stopColor="#c89840"/>
          <stop offset="100%" stopColor="#7a5010"/>
        </radialGradient>
        {/* 5 Venus */}
        <radialGradient id="pg5" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fffae0"/><stop offset="50%" stopColor="#e8d870"/>
          <stop offset="100%" stopColor="#a09020"/>
        </radialGradient>
        {/* 6 Saturn */}
        <radialGradient id="pg6" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#f0e0b0"/><stop offset="50%" stopColor="#c4a060"/>
          <stop offset="100%" stopColor="#7a5c28"/>
        </radialGradient>
        {/* 7 Rahu */}
        <radialGradient id="pg7" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#7060c0"/><stop offset="55%" stopColor="#2a2060"/>
          <stop offset="100%" stopColor="#080420"/>
        </radialGradient>
        {/* 8 Ketu */}
        <radialGradient id="pg8" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#b06080"/><stop offset="55%" stopColor="#601828"/>
          <stop offset="100%" stopColor="#1c0408"/>
        </radialGradient>
        {/* Earth */}
        <radialGradient id="pg-earth" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#a8f0d0"/><stop offset="45%" stopColor="#1f8f6f"/>
          <stop offset="100%" stopColor="#0a3828"/>
        </radialGradient>
      </defs>
    );

    [44, 70, 96, 120, 150, 178, 204, 216].forEach((r, k) =>
      core.push(<circle key={`orb${k}`} cx={CX} cy={CY} r={r * ORBIT_SCALE} className={wOrbit} />)
    );

    det.grahas.forEach((g, i) => {
      const meta = GRAHA_META[i]!;
      const lon = planetLons[i] ?? 0;
      const [px, py] = pol(lon, meta.orbit * ORBIT_SCALE);
      const rad = "big" in meta && meta.big ? 15 : i === 1 ? 10 : 8;

      // Ambient glow
      core.push(
        <circle key={`pg${i}`} cx={px} cy={py} r={rad + 6} fill={meta.color}
          className={wPlanetGlow} style={{ pointerEvents: "none" }} />
      );

      // Sun: radiating spikes
      if (i === 0) {
        const rays: React.ReactNode[] = [];
        for (let r = 0; r < 12; r++) {
          const ang = (r * 30) * DEG;
          const r1 = rad + 3, r2 = rad + (r % 2 === 0 ? 11 : 7);
          rays.push(<line key={r}
            x1={px + r1 * Math.sin(ang)} y1={py - r1 * Math.cos(ang)}
            x2={px + r2 * Math.sin(ang)} y2={py - r2 * Math.cos(ang)}
            stroke="#f9c800" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />);
        }
        core.push(<g key="sun-rays" style={{ pointerEvents: "none" }}>{rays}</g>);
      }

      // Saturn ring (behind planet body)
      if ("ring" in meta && meta.ring) {
        core.push(
          <ellipse key={`ring${i}`} cx={px} cy={py} rx={rad + 8} ry={rad * 0.45}
            fill="none" stroke={meta.color} strokeWidth="2.4" opacity="0.88"
            transform={`rotate(-20 ${px} ${py})`} style={{ pointerEvents: "none" }} />
        );
      }

      // Planet sphere with gradient (moon uses phase disc instead)
      if (i !== 1) {
        core.push(
          <circle key={`pl${i}`} cx={px} cy={py} r={rad} fill={`url(#pg${i})`}
            style={{ pointerEvents: "none" }} />
        );
      } else {
        const elongation = normDeg(markers.moonLon - markers.sunLon);
        core.push(
          <g key="moon-phase" transform={`translate(${px},${py})`} style={{ pointerEvents: "none" }}>
            <MoonPhaseIcon elongation={elongation} r={rad} />
          </g>
        );
      }

      // Jupiter: horizontal dark bands (clipped to sphere)
      if (i === 4) {
        const clipId = `jclip${i}`;
        core.push(
          <g key={`jbands${i}`} style={{ pointerEvents: "none" }}>
            <defs>
              <clipPath id={clipId}><circle cx={px} cy={py} r={rad - 0.5} /></clipPath>
            </defs>
            {[-rad * 0.3, rad * 0.05, rad * 0.36].map((oy, bi) => (
              <rect key={bi} x={px - rad} y={py + oy - 1.8} width={rad * 2} height={3.2}
                fill="rgba(80,42,8,0.42)" clipPath={`url(#${clipId})`} />
            ))}
          </g>
        );
      }

      // Name label
      core.push(
        <text key={`pn${i}`} x={px} y={py + rad + 9} textAnchor="middle"
          className={wPlanetName} style={{ pointerEvents: "none" }}>
          {bilingualText(lang, g.ne, g.en)}
        </text>
      );

      // Transparent tap target — moves the alignment needle to this graha.
      // stopPropagation on pointer-down so tapping a planet never starts a spin.
      core.push(
        <circle
          key={`hit${i}`}
          cx={px}
          cy={py}
          r={planetHitRadius(i)}
          fill="transparent"
          style={{ cursor: "pointer", touchAction: "manipulation" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setLineTarget(i);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setLineTarget(i);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setLineTarget(i);
          }}
        >
          <title>{bilingualText(lang, g.ne, g.en)}</title>
        </circle>
      );
    });

    // Earth at center
    core.push(
      <g key="earth" style={{ pointerEvents: "none" }}>
        <circle cx={CX} cy={CY} r="13" fill="url(#pg-earth)" />
        <circle cx={CX} cy={CY} r="13" fill="none" stroke="#9fe0c8" strokeWidth="0.8" opacity="0.5" />
      </g>
    );
  }

    const bsLabels: React.ReactNode[] = tw.show_lunar
      ? bsMonthsForWheel().map((m, i) => (
          <RingLabel
            key={`b${i}`}
            L={i * 30 + 15}
            r={R.bsMid}
            cls={wMonthNe(tw.show_today && i === sunRashiIdx)}
            spin={spin}
          >
            {bilingualText(lang, m.ne, m.en)}
          </RingLabel>
        ))
      : [];

    return { markerNodes, innerRings, core, bsLabels };
  }, [markers, det, spin, tw, moonLon, sunLon, planetLons, lineTarget, pol, arcSeg, lang]);

  const angleAt = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return (
      Math.atan2(
        e.clientY - (r.top + r.height / 2),
        e.clientX - (r.left + r.width / 2)
      ) / DEG
    );
  };

  const pinchDist = () => {
    const pts = [...ptrRef.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
  };

  // Desktop mouse / trackpad: zoom only when the cursor is on the circular
  // disc. The stage box is a tall rectangle — capturing scroll there blocked
  // the page. Touch-only phones keep page scroll.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const finePointer = window.matchMedia("(pointer: fine)").matches;
      if (!finePointer && !e.ctrlKey) return;
      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const radius = Math.min(box.width, box.height) / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) > radius) return;
      e.preventDefault();
      e.stopPropagation();
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16;
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= 400;
      onZoomRef.current(zoomRef.current * Math.exp(-dy * 0.0016));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    ptrRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (ptrRef.current.size === 1) {
      setIsDragging(true);
      setDragMoved(false);
      if (zoom > 1) {
        dragRef.current = { mode: "p", x0: e.clientX, y0: e.clientY, pan0x: pan.x, pan0y: pan.y, moved: false };
      } else {
        dragRef.current = { mode: "r", a: angleAt(e), spin0: spin, moved: false };
      }
    } else {
      // Two fingers: cancel single-finger gesture, start pinch
      dragRef.current = null;
      pinchRef.current = { dist: pinchDist(), zoom0: zoom };
    }
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    ptrRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrRef.current.size >= 2) {
      if (pinchRef.current) {
        const d = pinchDist();
        if (d > 0) {
          const next = Math.max(0.55, Math.min(14, pinchRef.current.zoom0 * (d / pinchRef.current.dist)));
          onZoom(next);
        }
      }
      return;
    }
    if (!dragRef.current) return;
    if (dragRef.current.mode === "p") {
      const dx = e.clientX - dragRef.current.x0;
      const dy = e.clientY - dragRef.current.y0;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.moved = true;
        setDragMoved(true);
      }
      onPan(dragRef.current.pan0x + dx, dragRef.current.pan0y + dy);
    } else {
      const d = angleAt(e) - dragRef.current.a;
      if (Math.abs(d) > 1.2) {
        dragRef.current.moved = true;
        setDragMoved(true);
      }
      onSpin(dragRef.current.spin0 + d);
    }
  };
  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const moved = dragRef.current?.moved ?? dragMoved;
    e.currentTarget.releasePointerCapture(e.pointerId);
    ptrRef.current.delete(e.pointerId);
    dragRef.current = null;
    setIsDragging(false);
    if (ptrRef.current.size < 2) pinchRef.current = null;
    if (!moved && ptrRef.current.size === 0) {
      const idx = pickPlanetAtClient(e.clientX, e.clientY);
      if (idx >= 0) setLineTarget(idx);
    }
  };

  const { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, hits, rashiRays, gregLabels } =
    staticLayers;
  const { markerNodes, innerRings, core, bsLabels } = dataLayers;

  return (
    <div
      className={cn(wheelSvgWrap, "transition-[padding] duration-200 ease-out")}
      ref={wrapRef}
      style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center", transition: isDragging ? "none" : "transform 0.12s ease-out" }}
    >
      <svg
        ref={svgRef}
        viewBox="42 42 916 916"
        className={wheelSvg(dragMoved)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <circle cx={CX} cy={CY} r={R.bsOut} className={wRimCircle} strokeWidth="1.4" />
        {[R.bsIn, R.nakOut, R.nakIn, R.padaIn, R_KAR_I, R.rashiOut, R.rashiIn].map((r, k) => (
          <circle key={`rc${k}`} cx={CX} cy={CY} r={r} className={wRimCircle} strokeWidth="0.8" opacity="0.55" />
        ))}
        <circle cx={CX} cy={CY} r={R.core} className={wRimCircle} strokeWidth="1.1" opacity="0.7" />

        {rashiSegs}
        {nakSegs}
        {padaCells}
        {rashiRays}
        {nakDecor}
        {rashiDecor}

        {gregLabels}
        {bsLabels}
        {dayTicks}

        {innerRings}
        {core}
        {markerNodes}
        {hits}

      </svg>
    </div>
  );
}

export const WheelChart = memo(WheelChartImpl);
