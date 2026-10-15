import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GRAHA_PLANET_ICON_URL } from "@/lib/graha-planet-icons";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { getBSMonthLength } from "@vedic-patro/domain/bs-calendar";
import {
  bsMonthsForWheel,
  GRAHA_META,
  getWheelRashis,
  normDeg,
  PADA_AKSHAR,
  type WheelDetail,
  type WheelMarkers,
  type WheelTweaks,
} from "@vedic-patro/domain/wheel-data";
import {
  WHEEL_CHART_INNER_R,
  WHEEL_CHART_R,
  WHEEL_NAK_GLYPH_SIZE,
  WHEEL_RASHI_GLYPH_SIZE,
  useWheelChartLabels,
  wheelLabelRows,
  type WheelHover,
} from "@vedic-patro/features/panchanga-drawing";
import { KARANA_SEQ, WHEEL_TITHIS, WHEEL_YOGAS } from "@vedic-patro/domain/tithi-wheel-data";
import { wheelSvg, wheelSvgWrap } from "@/lib/wheel-classes";
import { cn } from "@vedic-patro/domain/utils";
import { NAKSHATRA_GLYPHS, RASHI_GLYPHS } from "@/lib/wheel-glyph-art";
import { WheelGlyph } from "@/lib/wheel-glyphs";
import {
  wDaytick,
  wKarLbl,
  wLabel,
  wLagnaCap,
  wLagnaLine,
  wMonthGreg,
  wMonthNe,
  wNakName,
  wOrbit,
  wPadaAkshar,
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
import { DEG, CX, CY, ORBIT_SCALE, planetIconSize } from "@vedic-patro/domain/wheel-chart-geometry";
import {
  earthTop,
  retroBorder,
  WHEEL_MERIDIAN,
  WHEEL_RETRO,
  wheelMoonShadow,
  type WheelPlace,
} from "@vedic-patro/domain/wheel-bodies";
import { moonSunFacingRotation } from "@vedic-patro/domain/moon-phase-svg";

import { brand, illustration, midnight, webTypeScale, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { wheelPalette } from "@vedic-patro/ui/kit/panchanga";
/**
 * Every inner ring shares a boundary with its neighbour, so no dead band opens
 * up between them: Yoga → Rashi, Karana → Tithi → Rashi, Karana → pada inner.
 * The yoga ring's inner edge is pinned just clear of the outermost planet orbit
 * (216 × ORBIT_SCALE ≈ 125, plus the widest planet body) rather than to a ring.
 */
const { yogaIn: R_YOGA_I, yogaOut: R_YOGA_O, karanaIn: R_KAR_I, karanaOut: R_KAR_O, tithiIn: R_TIT_I, tithiOut: R_TIT_O } = WHEEL_CHART_INNER_R;

const R = WHEEL_CHART_R;

/**
 * Glyph box sizes. Both are "contain" fits, so these are the longer side of the
 * artwork, not its apparent weight — the rashi band (178–263) has more radial
 * room to spare than the nakshatra band, whose glyph shares 345–423 with a name
 * that runs to two stacked rows in English.
 */
const RASHI_GLYPH_SIZE = WHEEL_RASHI_GLYPH_SIZE;
const NAK_GLYPH_SIZE = WHEEL_NAK_GLYPH_SIZE;

export type { WheelHover };

const labelRows = wheelLabelRows;

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
  /** Observer, so the Earth disc can turn their meridian to the front. */
  place?: WheelPlace | null;
}

function WheelChartImpl({
  det,
  markers,
  spin,
  tw,
  bsYear,
  hover,
  onSpin,
  zoom,
  onZoom,
  pan,
  onPan,
  lineTarget: lineTargetProp,
  place,
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
  const [unitPx, setUnitPx] = useState(0);
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const side = Math.min(el.clientWidth, el.clientHeight);
      if (side > 0) setUnitPx((side / 916) * zoom);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [zoom]);
  /** Active pointer positions for pinch-to-zoom. */
  const ptrRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom0: number } | null>(null);
  const zoomRef = useRef(zoom);
  useLayoutEffect(() => {
    zoomRef.current = zoom;
  });
  const onZoomRef = useRef(onZoom);
  useLayoutEffect(() => {
    onZoomRef.current = onZoom;
  });
  const lineTarget = lineTargetProp ?? 1;
  const { pick, gregMonths } = useWheelChartLabels();

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
            title={pick(ico.ne, ico.en)}
          />
          <RingLabel
            L={Lm}
            r={R.nakName}
            cls={wNakName(isHot)}
            spin={spin}
            rows={labelRows(pick(ico.ne, ico.en))}
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
            title={pick(rs.ne, rs.en)}
          />
          <RingLabel L={Lm} r={R.rashiName} cls={wRashiName(isHot)} spin={spin}>
            {pick(rs.ne, rs.en)}
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

    const rashiRays: React.ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pol(i * 30, 12);
      const [x2, y2] = pol(i * 30, R.rimOuter - 2);
      rashiRays.push(
        <line key={`ray${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className={wRashiRay} />
      );
    }

    const gregLabels: React.ReactNode[] = tw.show_greg
      ? gregMonths.map((label, i) => (
          <RingLabel key={`g${i}`} L={(i - 3) * 30 + 5} r={R.gregMid} cls={wMonthGreg} spin={spin}>
            {label}
          </RingLabel>
        ))
      : [];

    return { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, rashiRays, gregLabels };
  }, [spin, hover, bsYear, tw, pol, arcSeg, pick, gregMonths]);

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
          style={{ fontSize: webTypeScale.sm.size, fill: illustration.amber49 }}
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
          fill={isCur ? withAlpha(illustration.violet70, 0.20) : "transparent"}
          stroke={isCur ? illustration.violet80 : withAlpha(wheel.rim, 0.28)}
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
      const kName = pick(kd.ne, kd.en);
      innerRings.push(
        <path
          key={`kar${k}`}
          d={arcSeg(L0, L1, R_KAR_I, R_KAR_O)}
          fill={isCur ? withAlpha(brand.vermilion, 0.16) : "transparent"}
          stroke={isCur ? "var(--w-accent)" : withAlpha(wheel.rim, 0.28)}
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
      const tName = pick(WHEEL_TITHIS[i]!.ne, WHEEL_TITHIS[i]!.en);
      innerRings.push(
        <g key={`tit${i}`}>
          <path
            d={arcSeg(L0, L1, R_TIT_I, R_TIT_O)}
            fill={
              isCur
                ? `color-mix(in srgb, var(--w-accent) 28%, ${wheel.sky0})`
                : shukla
                ? `color-mix(in srgb, ${illustration.teal36} 26%, ${midnight.background})`
                : `color-mix(in srgb, ${illustration.teal36} 14%, ${midnight.popover})`
            }
            stroke={isCur ? "var(--w-accent)" : withAlpha(wheel.line, .18)}
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
    [44, 70, 96, 120, 150, 178, 204, 216].forEach((r, k) =>
      core.push(<circle key={`orb${k}`} cx={CX} cy={CY} r={r * ORBIT_SCALE} className={wOrbit} />)
    );

    const planetNames: React.ReactNode[] = [];
    const [sunX, sunY] = pol(sunLon, GRAHA_META[0]!.orbit * ORBIT_SCALE);
    det.grahas.forEach((g, i) => {
      const meta = GRAHA_META[i]!;
      const lon = planetLons[i] ?? 0;
      const [px, py] = pol(lon, meta.orbit * ORBIT_SCALE);
      const rad = "big" in meta && meta.big ? 15 : i === 1 ? 10 : 8;
      const sky = (["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const)[i];
      const collar = g.retrograde ? retroBorder(rad, unitPx) : null;
      const moonShadow = i === 1 ? wheelMoonShadow(normDeg(moonLon - sunLon), rad) : null;
      const moonTurn = i === 1 ? moonSunFacingRotation(px, py, sunX, sunY) : 0;
      if (sky) {
        core.push(
          <g key={`pl${i}`} style={{ pointerEvents: "none" }}>
            <defs>
              <clipPath id={`wheel-pl-${i}`}><circle cx={px} cy={py} r={rad} /></clipPath>
            </defs>
            {collar ? (
              <circle cx={px} cy={py} r={collar.r} fill="none" stroke={WHEEL_RETRO} strokeWidth={collar.width} opacity={0.9} />
            ) : null}
            {i === 6 ? (
              <circle cx={px} cy={py} r={rad * 1.42} fill="none" stroke={wheelPalette.saturnRing} strokeWidth={1.15} />
            ) : null}
            <image
              href={`${import.meta.env.BASE_URL}sky3d/top/${sky}.png`}
              x={px - rad}
              y={py - rad}
              width={rad * 2}
              height={rad * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#wheel-pl-${i})`}
            />
            {moonShadow ? (
              <path
                d={moonShadow}
                transform={`translate(${px} ${py}) rotate(${moonTurn})`}
                fill={wheelPalette.moonShadow}
                fillRule="evenodd"
                opacity={0.78}
              />
            ) : null}
          </g>
        );
      } else {
        const icon = planetIconSize(i, rad);
        const iconKey = i === 7 ? "rahu" : "ketu";
        core.push(
          <g key={`pl${i}`} style={{ pointerEvents: "none" }}>
            {collar ? (
              <circle cx={px} cy={py} r={collar.r} fill="none" stroke={WHEEL_RETRO} strokeWidth={collar.width} opacity={0.9} />
            ) : null}
            <image
              href={GRAHA_PLANET_ICON_URL[iconKey]}
              x={px - icon / 2}
              y={py - icon / 2}
              width={icon}
              height={icon}
            />
          </g>
        );
      }

      planetNames.push(
        <g key={`pn${i}`} transform={`translate(${px} ${py}) scale(${1 / zoom})`} style={{ pointerEvents: "none" }}>
          <text x={0} y={0} textAnchor="middle" dominantBaseline="central" className={wPlanetName}>
            {pick(g.ne, g.en)}
          </text>
        </g>
      );
    });

    const earthR = 13;
    const globe = place ? earthTop(place.lat, place.lon, place.at) : null;
    core.push(
      <g key="earth" style={{ pointerEvents: "none" }} transform={`translate(${CX} ${CY}) rotate(${globe?.spin ?? 0})`}>
        <defs>
          <clipPath id="wheel-earth"><circle cx={0} cy={0} r={earthR} /></clipPath>
        </defs>
        <image
          href={`${import.meta.env.BASE_URL}sky3d/top/earth.png`}
          x={-earthR}
          y={-earthR}
          width={earthR * 2}
          height={earthR * 2}
          preserveAspectRatio="xMidYMid meet"
          clipPath="url(#wheel-earth)"
        />
        {globe ? (
          <line
            x1={-globe.dx * earthR}
            y1={-globe.dy * earthR}
            x2={globe.dx * earthR}
            y2={globe.dy * earthR}
            stroke={WHEEL_MERIDIAN}
            strokeWidth={1.4}
          />
        ) : null}
        {globe ? (
          <g>
            <circle cx={globe.place.x * earthR} cy={globe.place.y * earthR} r={2.4} fill={WHEEL_MERIDIAN} opacity={0.35} />
            <circle cx={globe.place.x * earthR} cy={globe.place.y * earthR} r={1.3} fill={WHEEL_MERIDIAN} />
          </g>
        ) : null}
      </g>
    );
    core.push(...planetNames);
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
            {pick(m.ne, m.en)}
          </RingLabel>
        ))
      : [];

    return { markerNodes, innerRings, core, bsLabels };
  }, [markers, det, spin, tw, moonLon, sunLon, planetLons, lineTarget, pol, arcSeg, pick, zoom, place, unitPx]);

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
    e.currentTarget.releasePointerCapture(e.pointerId);
    ptrRef.current.delete(e.pointerId);
    dragRef.current = null;
    setIsDragging(false);
    if (ptrRef.current.size < 2) pinchRef.current = null;
  };

  const { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, rashiRays, gregLabels } =
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

      </svg>
    </div>
  );
}

export const WheelChart = memo(WheelChartImpl);
