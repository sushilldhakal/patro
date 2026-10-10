import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from "react-native-svg";
import { MoonPhaseIcon } from "./MoonPhaseIcon";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import {
  NAKSHATRA_GLYPHS,
  RASHI_GLYPHS,
  WheelGlyph,
} from "@/components/panchanga/WheelGlyph";
import { useLocale } from "@/lib/i18n";
import { getBSMonthLength } from "@vedic-patro/domain/bs-calendar";
import {
  bsMonthsForWheel,
  GRAHA_META,
  GREG_NE,
  normDeg,
  PADA_AKSHAR,
  type WheelDetail,
  type WheelMarkers,
  type WheelTweaks,
  WHEEL_RASHIS,
} from "@/lib/wheel-data";
import { KARANA_SEQ, WHEEL_TITHIS, WHEEL_YOGAS } from "@/lib/tithi-wheel-data";
import { nepaliSvgTextCenter } from "@/lib/nepali-text";
import { NOTO_DEVANAGARI_CHART } from "@/lib/fonts";

const DEG = Math.PI / 180;
const CX = 500;
const CY = 500;

const ORBIT_SCALE = 0.58;

const R_YOGA_I = 140;
const R_YOGA_O = 178; // shared boundary with rashi inner / core
const R_KAR_I = 303;
const R_KAR_O = 327;
const R_TIT_I = 263;
const R_TIT_O = 303;

// Resolved `.pn-wheel` custom properties from the web stylesheet. react-native-svg
// cannot read CSS vars, so the exact computed values are inlined here — keep them
// in step with the `.pn-wheel` block in global.css / the web's index.css.
/** var(--w-rim) — color-mix(#a9d4d4 50%, transparent) */
const W_RIM = "rgba(169,212,212,0.5)";
/** var(--w-sep) — color-mix(#8fbfc1 42%, transparent) */
const W_SEP = "rgba(143,191,193,0.42)";
/** var(--w-sep-soft) — color-mix(#8fbfc1 16%, transparent) */
const W_SEP_SOFT = "rgba(143,191,193,0.16)";
/** var(--w-accent) — var(--brand-vermilion) */
const W_ACCENT = "#c62828";
/** var(--w-ink) */
const W_INK = "#eaf3f1";
/** var(--w-ink-dim) */
const W_INK_DIM = "#a7c4c3";
/** var(--w-ink-faint) */
const W_INK_FAINT = "#84a3a2";
/** var(--w-band) — color-mix(brand-green 30%, #0a1618) */
const W_BAND = "#153520";
/** var(--w-band-alt) — color-mix(brand-green 44%, #0b181a) */
const W_BAND_ALT = "#1a4425";
/** var(--w-rashi) — color-mix(brand-green 22%, #091315) */
const W_RASHI = "#112a1b";
/** var(--w-rashi-alt) — color-mix(brand-green 34%, #0a1518) */
const W_RASHI_ALT = "#163821";
/** var(--w-pada) */
const W_PADA = "#0d2024";
/** var(--w-pada-alt) */
const W_PADA_ALT = "#112a2f";

const FONT = NOTO_DEVANAGARI_CHART;

/**
 * Glyph box sizes. Both are "contain" fits, so these are the longer side of the
 * artwork, not its apparent weight — the rashi band (178–263) has more radial
 * room to spare than the nakshatra band, whose glyph shares 345–423 with a name
 * that runs to two stacked rows in English.
 */
const RASHI_GLYPH_SIZE = 30;
const NAK_GLYPH_SIZE = 26;

/** color-mix(in srgb, var(--w-accent) 26%, var(--w-band-alt)) */
const SEG_HOT = "#473d26";
/** color-mix(in srgb, var(--w-accent) 40%, var(--w-band-alt)) */
const SEG_SEL = "#5f3926";
/** color-mix(in srgb, var(--w-accent) 18%, transparent) */
const SEG_NOW_FILL = "rgba(198,40,40,0.18)";
/** color-mix(in srgb, #8fbfc1 14%, transparent) */
const ORBIT_STROKE = "rgba(143,191,193,0.14)";
/** Current yoga — faint tint only; solid fills drowned the labels on native. */
const YOGA_CUR = "rgba(160,125,232,0.20)";
/** Current karana — same idea: highlight without covering the name. */
const KARANA_CUR = "rgba(198,40,40,0.16)";
/** color-mix(in srgb, var(--w-accent) 28%, #0d2428) */
const TITHI_CUR = "#412528";
/** color-mix(in srgb, #2d8a86 26%, #0a1a1e) */
const TITHI_SHUKLA = "#133739";
/** color-mix(in srgb, #2d8a86 14%, #060e10) */
const TITHI_KRISHNA = "#0b1f21";

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

export type WheelHover = { type: "nak"; i: number } | { type: "rashi"; i: number };
export type WheelPick = WheelHover;

/** ViewBox is 42 42 916 916; RN-SVG fits it with xMidYMid meet, so a tall
 *  fullscreen stage letterboxes. Stretching locationX/W would miss every graha. */
function svgCoords(
  locationX: number,
  locationY: number,
  layoutW: number,
  layoutH: number,
): { x: number; y: number; dist: number; L: number } {
  if (layoutW <= 0 || layoutH <= 0) {
    return { x: CX, y: CY, dist: 0, L: 0 };
  }
  const vb = 916;
  const scale = Math.min(layoutW / vb, layoutH / vb);
  const offsetX = (layoutW - vb * scale) / 2;
  const offsetY = (layoutH - vb * scale) / 2;
  const x = 42 + (locationX - offsetX) / scale;
  const y = 42 + (locationY - offsetY) / scale;
  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.hypot(dx, dy);
  const L = normDeg(Math.atan2(-dx, -dy) / DEG);
  return { x, y, dist, L };
}

function svgToView(
  svgX: number,
  svgY: number,
  layoutW: number,
  layoutH: number,
): { x: number; y: number; scale: number } {
  const vb = 916;
  const scale = Math.min(layoutW / vb, layoutH / vb) || 1;
  return {
    x: (layoutW - vb * scale) / 2 + (svgX - 42) * scale,
    y: (layoutH - vb * scale) / 2 + (svgY - 42) * scale,
    scale,
  };
}

function wheelLFromTouch(L: number, spin: number): number {
  return normDeg(L - spin);
}

function untransformTouch(
  x: number,
  y: number,
  w: number,
  h: number,
  pan: { x: number; y: number },
  zoom: number,
): { x: number; y: number } {
  if (zoom === 1 && pan.x === 0 && pan.y === 0) return { x, y };
  const cx = w / 2;
  const cy = h / 2;
  const tx = x - pan.x;
  const ty = y - pan.y;
  return {
    x: cx + (tx - cx) / zoom,
    y: cy + (ty - cy) / zoom,
  };
}

function clampZoom(z: number): number {
  return Math.max(0.55, Math.min(14, z));
}

type LayoutMetrics = { w: number; h: number; pageX: number; pageY: number };

function touchInView(
  pageX: number,
  pageY: number,
  layout: LayoutMetrics,
): { x: number; y: number } {
  return { x: pageX - layout.pageX, y: pageY - layout.pageY };
}

type PinchGesture = {
  dist0: number;
  zoom0: number;
  pan0x: number;
  pan0y: number;
  focalX: number;
  focalY: number;
  centroid0x: number;
  centroid0y: number;
};

function touchCentroidInView(
  touches: readonly { pageX: number; pageY: number }[],
  pageX: number,
  pageY: number,
): { x: number; y: number } | null {
  if (touches.length < 2) return null;
  const t0 = touches[0]!;
  const t1 = touches[1]!;
  return {
    x: (t0.pageX + t1.pageX) / 2 - pageX,
    y: (t0.pageY + t1.pageY) / 2 - pageY,
  };
}

/** Keep the point under `focal` fixed while zoom changes (scale is around view center). */
function panForFocalZoom(
  pan0x: number,
  pan0y: number,
  zoom0: number,
  zoom1: number,
  focalX: number,
  focalY: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const cx = w / 2;
  const cy = h / 2;
  const ratio = zoom1 / zoom0;
  return {
    x: pan0x + (focalX - pan0x - cx) * (1 - ratio),
    y: pan0y + (focalY - pan0y - cy) * (1 - ratio),
  };
}

function applyPinchTransform(
  pinch: PinchGesture,
  dist: number,
  centroid: { x: number; y: number },
  w: number,
  h: number,
): { zoom: number; pan: { x: number; y: number } } {
  const zoom = clampZoom(pinch.zoom0 * (dist / pinch.dist0));
  const p = panForFocalZoom(
    pinch.pan0x,
    pinch.pan0y,
    pinch.zoom0,
    zoom,
    pinch.focalX,
    pinch.focalY,
    w,
    h,
  );
  return {
    zoom,
    pan: {
      x: p.x + (centroid.x - pinch.centroid0x),
      y: p.y + (centroid.y - pinch.centroid0y),
    },
  };
}

function touchPageDistance(touches: readonly { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) return 0;
  const t0 = touches[0]!;
  const t1 = touches[1]!;
  return Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
}

function planetSvgPosition(lon: number, orbit: number, spinDeg: number): [number, number] {
  const a = (lon + spinDeg) * DEG;
  return [CX - orbit * ORBIT_SCALE * Math.sin(a), CY - orbit * ORBIT_SCALE * Math.cos(a)];
}

function planetVisualRadius(index: number): number {
  const meta = GRAHA_META[index];
  if (!meta) return 8;
  if ("big" in meta && meta.big) return 15;
  if (index === 1) return 10;
  return 8;
}

/** Svg-space hit radius per graha (glow, label, and finger slop). */
function planetHitRadius(index: number): number {
  const r = planetVisualRadius(index);
  if (index === 0) return r + 26;
  // Saturn, Rahu, Ketu share the outer rim and often sit near each other.
  if (index >= 6) return r + 32;
  return r + 24;
}

const WHEEL_TAP_SLOP_PX = 14;
/** Taps inside the rashi inner edge belong to grahas, never the rashi sheet. */
const PLANET_CORE_R = R.rashiIn + 12;
/** View-px radius that still counts as "on" a graha, even in a conjunction. */
const PLANET_TAP_PX = 44;
/** View-px: other grahas this close to the nearest hit are the same cluster. */
const PLANET_CLUSTER_PX = 52;

type PlanetHit = { i: number; d: number; vx: number; vy: number };

function planetHitsAtLocal(
  localX: number,
  localY: number,
  w: number,
  h: number,
  spinDeg: number,
  lons: readonly number[],
  grahaCount: number,
): PlanetHit[] {
  const hits: PlanetHit[] = [];
  for (let i = 0; i < grahaCount; i++) {
    const meta = GRAHA_META[i]!;
    const [sx, sy] = planetSvgPosition(lons[i] ?? 0, meta.orbit, spinDeg);
    const { x, y } = svgToView(sx, sy, w, h);
    hits.push({ i, d: Math.hypot(localX - x, localY - y), vx: x, vy: y });
  }
  return hits.sort((a, b) => a.d - b.d);
}

function clusterAtTap(hits: PlanetHit[], w: number, h: number, grahaCount: number): PlanetHit[] {
  if (hits.length === 0) return [];
  const nearest = hits[0]!;
  const { scale } = svgToView(CX, CY, w, h);
  const reach = Math.max(PLANET_TAP_PX, planetHitRadius(nearest.i) * scale + 16);
  if (nearest.d > reach && nearest.d > PLANET_CLUSTER_PX) return [];
  const cluster = hits.filter((h) => h.d <= Math.max(PLANET_CLUSTER_PX, reach + 8));
  /* Also pull in grahas sitting on the same stack as the nearest, even if
     the finger landed slightly off the group. */
  const stacked = hits.filter((h) => Math.hypot(h.vx - nearest.vx, h.vy - nearest.vy) <= PLANET_CLUSTER_PX);
  const byIdx = new Map<number, PlanetHit>();
  for (const h of [...cluster, ...stacked]) byIdx.set(h.i, h);
  return [...byIdx.values()].sort((a, b) => (a.d !== b.d ? a.d - b.d : a.i - b.i)).slice(0, grahaCount);
}

function pickFromCluster(cluster: PlanetHit[], current: number): number {
  if (cluster.length === 0) return -1;
  if (cluster.length === 1) return cluster[0]!.i;
  const at = cluster.findIndex((h) => h.i === current);
  if (at >= 0) return cluster[(at + 1) % cluster.length]!.i;
  return cluster[0]!.i;
}

function segNakFill(opts: { alt?: boolean; hot?: boolean; sel?: boolean }): string {
  if (opts.sel) return SEG_SEL;
  if (opts.hot) return SEG_HOT;
  return opts.alt ? W_BAND_ALT : W_BAND;
}

function segRashiFill(opts: { alt?: boolean; hot?: boolean; sel?: boolean }): string {
  if (opts.sel) return SEG_SEL;
  if (opts.hot) return SEG_HOT;
  return opts.alt ? W_RASHI_ALT : W_RASHI;
}

/** Split a ring label on whitespace so each word gets its own radial row. */
function labelRows(label: string): string[] {
  return label.trim().split(/\s+/).filter(Boolean);
}

interface RingLabelProps {
  L: number;
  r: number;
  spin: number;
  size?: number;
  fill?: string;
  children?: ReactNode;
  /** Halo behind the glyph — mirrors the web classes' `paint-order: stroke fill`. */
  stroke?: string;
  strokeWidth?: number;
  /**
   * Stack the label radially instead of running it along the ring. Long English
   * names ("Uttara Bhadrapada") overrun their segment's arc on one line, so they
   * get split a word per row.
   */
  rows?: readonly string[];
}

function RingLabel({
  L,
  r,
  spin,
  size,
  fill = W_INK,
  children,
  rows,
  stroke,
  strokeWidth,
}: RingLabelProps) {
  const a = normDeg(L + spin);
  const flip = a > 90 && a < 270;
  // Flipping rotates the stack too, so reverse the rows to keep reading order.
  const stack = rows && rows.length > 1 ? (flip ? [...rows].reverse() : rows) : null;
  const fontSize = size ?? 11;

  return (
    <G transform={`rotate(${-(L + spin)} ${CX} ${CY})`}>
      <SvgText
        x={CX}
        y={CY - r}
        textAnchor="middle"
        fill={fill}
        fontSize={fontSize}
        fontFamily={FONT}
        {...(stroke ? { stroke, strokeWidth: strokeWidth ?? 0.4, paintOrder: "stroke" } : {})}
        {...nepaliSvgTextCenter}
        {...(flip ? { transform: `rotate(180 ${CX} ${CY - r})` } : {})}
      >
        {stack
          ? stack.map((row, i) => (
              <TSpan
                key={`${row}-${i}`}
                x={CX}
                dy={i === 0 ? -0.55 * (stack.length - 1) * fontSize : 15 * fontSize}
              >
                {row}
              </TSpan>
            ))
          : (children ?? rows?.[0])}
      </SvgText>
    </G>
  );
}

interface WheelChartProps {
  det: WheelDetail;
  markers: WheelMarkers;
  spin: number;
  tw: WheelTweaks;
  bsYear: number;
  sel: WheelPick | null;
  hover: WheelHover | null;
  onHover: (h: WheelHover) => void;
  onLeave: () => void;
  onPick: (p: WheelPick) => void;
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
  sel,
  hover,
  onHover: _onHover,
  onLeave: _onLeave,
  onPick,
  onSpin,
  zoom,
  onZoom,
  pan,
  onPan,
  lineTarget: lineTargetProp,
  onLineTargetChange,
}: WheelChartProps) {
  const { pick } = useLocale();
  const [innerTarget, setInnerTarget] = useState(1);
  const lineTarget = lineTargetProp ?? innerTarget;
  const setLineTarget = useCallback(
    (index: number) => {
      if (lineTargetProp === undefined) setInnerTarget(index);
      onLineTargetChange?.(index);
    },
    [lineTargetProp, onLineTargetChange],
  );
  const lineTargetRef = useRef(lineTarget);
  lineTargetRef.current = lineTarget;
  const viewRef = useRef<View>(null);
  const layoutRef = useRef<LayoutMetrics>({ w: 0, h: 0, pageX: 0, pageY: 0 });
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchRef = useRef<PinchGesture | null>(null);
  const pinchingRef = useRef(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /* Live drag rotation, degrees, applied as a transform on the drawing — the
     wheel is ~900 SVG nodes, so re-rendering it per finger-move (what setting
     `spin` state did) starved the JS thread and made the wheel lag and drop
     gestures. The real `spin` is committed once, on release. */
  const dragRot = useRef(new Animated.Value(0)).current;
  const dragRotate = useMemo(
    () => dragRot.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] }),
    [dragRot],
  );
  /* New spin committed → the geometry already carries the rotation; drop the
     transform in the same frame so there is no double-rotated flash. */
  useLayoutEffect(() => {
    dragRot.setValue(0);
  }, [spin, dragRot]);
  const dragRef = useRef<
    | { mode: "r"; spin0: number; angle0: number; moved: boolean; latest: number }
    | { mode: "p"; pan0x: number; pan0y: number; moved: boolean }
    | null
  >(null);

  const syncLayout = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, mw, mh) => {
      const cur = layoutRef.current;
      layoutRef.current = {
        w: cur.w > 0 ? cur.w : mw,
        h: cur.h > 0 ? cur.h : mh,
        pageX: x,
        pageY: y,
      };
    });
  }, []);

  const touchFromEvent = useCallback(
    (evt: { nativeEvent: { locationX: number; locationY: number; pageX: number; pageY: number } }) => {
      const layout = layoutRef.current;
      if (layout.w > 0 && layout.h > 0 && (layout.pageX !== 0 || layout.pageY !== 0)) {
        return touchInView(evt.nativeEvent.pageX, evt.nativeEvent.pageY, layout);
      }
      return { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
    },
    [],
  );

  const angleAt = useCallback((locationX: number, locationY: number) => {
    const { w, h } = layoutRef.current;
    if (w <= 0 || h <= 0) return 0;
    const cx = w / 2;
    const cy = h / 2;
    return (Math.atan2(locationY - cy, locationX - cx) * 180) / Math.PI;
  }, []);

  const pickPlanetAtLocal = useCallback(
    (localX: number, localY: number): number => {
      if (!tw.show_planets) return -1;
      const { w, h } = layoutRef.current;
      if (w <= 0 || h <= 0) return -1;
      const { dist } = svgCoords(localX, localY, w, h);
      if (dist > R.rashiOut + 36) return -1;

      const hits = planetHitsAtLocal(
        localX,
        localY,
        w,
        h,
        spinRef.current,
        markers.planetLons,
        det.grahas.length,
      );
      const cluster = clusterAtTap(hits, w, h, det.grahas.length);
      if (cluster.length > 0) return pickFromCluster(cluster, lineTargetRef.current);

      /* Deep in the planet well with no close hit: still take the nearest
         graha so a conjunction off-centre does not fall through to a ring. */
      if (dist <= PLANET_CORE_R && hits[0]) return hits[0].i;
      return -1;
    },
    [det.grahas.length, markers.planetLons, tw.show_planets],
  );

  const pickPlanetAt = useCallback(
    (rawX: number, rawY: number): number => {
      const { w, h } = layoutRef.current;
      if (w <= 0 || h <= 0) return -1;
      const { x, y } = untransformTouch(rawX, rawY, w, h, panRef.current, zoomRef.current);
      return pickPlanetAtLocal(x, y);
    },
    [pickPlanetAtLocal],
  );

  const pickRingAtLocal = useCallback(
    (localX: number, localY: number) => {
      const { w, h } = layoutRef.current;
      if (w <= 0 || h <= 0) return;
      const planetIdx = pickPlanetAtLocal(localX, localY);
      if (planetIdx >= 0) {
        setLineTarget(planetIdx);
        return;
      }
      const { dist, L } = svgCoords(localX, localY, w, h);
      const wheelL = wheelLFromTouch(L, spinRef.current);
      if (dist <= PLANET_CORE_R) return;
      if (dist >= R.nakIn && dist <= R.nakOut) {
        onPick({ type: "nak", i: Math.floor(wheelL / (360 / 27)) % 27 });
        return;
      }
      if (dist >= R.rashiIn && dist <= R.rashiOut) {
        onPick({ type: "rashi", i: Math.floor(wheelL / 30) % 12 });
      }
    },
    [onPick, pickPlanetAtLocal],
  );

  const pickFromTouch = useCallback(
    (rawX: number, rawY: number) => {
      const { w, h } = layoutRef.current;
      if (w <= 0 || h <= 0) return;
      const { x, y } = untransformTouch(rawX, rawY, w, h, panRef.current, zoomRef.current);
      const planetIdx = pickPlanetAt(rawX, rawY);
      if (planetIdx >= 0) {
        setLineTarget(planetIdx);
        return;
      }
      pickRingAtLocal(x, y);
    },
    [pickPlanetAt, pickRingAtLocal],
  );

  const wheelPan = useMemo(
    () =>
      PanResponder.create({
        /* Do not claim on finger-down. A tap must reach the native Pressable
           over each graha — SVG onPress is not a mobile touch target, and
           capturing here used to swallow every planet tap. Spin/pinch only
           start after the finger has actually moved. */
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (evt, gs) =>
          (evt.nativeEvent.touches?.length ?? 0) >= 2 || Math.hypot(gs.dx, gs.dy) > 10,
        onMoveShouldSetPanResponderCapture: (evt, gs) =>
          (evt.nativeEvent.touches?.length ?? 0) >= 2 || Math.hypot(gs.dx, gs.dy) > 10,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          syncLayout();
          pinchingRef.current = false;
          pinchRef.current = null;
          const { w, h } = layoutRef.current;
          const touch = touchFromEvent(evt);
          const { x, y } = untransformTouch(touch.x, touch.y, w, h, panRef.current, zoomRef.current);
          if (zoomRef.current > 1) {
            dragRef.current = {
              mode: "p",
              pan0x: panRef.current.x,
              pan0y: panRef.current.y,
              moved: false,
            };
          } else {
            dragRef.current = {
              mode: "r",
              spin0: spinRef.current,
              angle0: angleAt(x, y),
              moved: false,
              latest: spinRef.current,
            };
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;
          const layout = layoutRef.current;
          if (touches.length >= 2 && layout.w > 0) {
            pinchingRef.current = true;
            const rotating = dragRef.current;
            if (rotating?.mode === "r" && rotating.moved) onSpin(rotating.latest);
            dragRef.current = null;
            const dist = touchPageDistance(touches);
            const centroid = touchCentroidInView(touches, layout.pageX, layout.pageY);
            if (dist <= 0 || !centroid) return;
            if (!pinchRef.current) {
              pinchRef.current = {
                dist0: dist,
                zoom0: zoomRef.current,
                pan0x: panRef.current.x,
                pan0y: panRef.current.y,
                focalX: centroid.x,
                focalY: centroid.y,
                centroid0x: centroid.x,
                centroid0y: centroid.y,
              };
              return;
            }
            const next = applyPinchTransform(pinchRef.current, dist, centroid, layout.w, layout.h);
            onZoom(next.zoom);
            onPan(next.pan.x, next.pan.y);
            return;
          }

          pinchRef.current = null;
          const drag = dragRef.current;
          if (!drag) return;

          if (drag.mode === "p") {
            if (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3) drag.moved = true;
            onPan(drag.pan0x + gestureState.dx, drag.pan0y + gestureState.dy);
            return;
          }

          const { w, h } = layoutRef.current;
          const touch = touchFromEvent(evt);
          const { x, y } = untransformTouch(touch.x, touch.y, w, h, panRef.current, zoomRef.current);
          const angle = angleAt(x, y);
          let delta = angle - drag.angle0;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          if (Math.abs(delta) > 1.2) drag.moved = true;
          drag.latest = drag.spin0 + delta;
          /* Spin increases counter-clockwise on screen (see `pol`), CSS rotate
             is clockwise — hence the sign. */
          dragRot.setValue(-delta);
        },
        onPanResponderRelease: (evt, gestureState) => {
          const drag = dragRef.current;
          const wasPinching = pinchingRef.current;
          if (drag?.mode === "r" && drag.moved && !wasPinching) onSpin(drag.latest);
          dragRef.current = null;
          pinchRef.current = null;
          pinchingRef.current = false;
          const touch = touchFromEvent(evt);
          const dist = Math.hypot(gestureState.dx, gestureState.dy);
          const moved = wasPinching || dist >= WHEEL_TAP_SLOP_PX || Boolean(drag?.moved);
          if (moved) return;
          pickFromTouch(touch.x, touch.y);
        },
        onPanResponderTerminate: () => {
          const drag = dragRef.current;
          if (drag?.mode === "r" && drag.moved) onSpin(drag.latest);
          else dragRot.setValue(0);
          dragRef.current = null;
          pinchRef.current = null;
          pinchingRef.current = false;
        },
      }),
    [angleAt, dragRot, onPan, onSpin, onZoom, pickFromTouch, pickPlanetAt, syncLayout, touchFromEvent],
  );

  const pol = useCallback(
    (L: number, rad: number): [number, number] => {
      const a = (L + spin) * DEG;
      return [CX - rad * Math.sin(a), CY - rad * Math.cos(a)];
    },
    [spin],
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
    [pol],
  );

  const { moonLon, planetLons, sunLon } = markers;

  const staticLayers = useMemo(() => {
    const nakSegs: ReactNode[] = [];
    const nakDecor: ReactNode[] = [];
    for (let i = 0; i < 27; i++) {
      const L0 = i * (360 / 27);
      const L1 = (i + 1) * (360 / 27);
      const Lm = (L0 + L1) / 2;
      const ico = NAKSHATRA_ICONS[i]!;
      const isHot = hover?.type === "nak" && hover.i === i;
      const isSel = sel?.type === "nak" && sel.i === i;
      nakSegs.push(
        <Path
          key={`ns${i}`}
          d={arcSeg(L0, L1, R.nakIn, R.nakOut)}
          fill={segNakFill({ alt: i % 2 === 1, hot: isHot, sel: isSel })}
          stroke={W_SEP_SOFT}
          strokeWidth={0.6}
        />,
      );
      // The name used to sit alone at the band's midpoint; it moves in to
      // R.nakName so the glyph can take R.nakIcon, the slot already reserved for
      // it out near the rim. Both stay — the icon reads at a glance, the name is
      // what you actually look up.
      const [nx, ny] = pol(Lm, R.nakIcon);
      const nakInk = isSel || isHot ? W_ACCENT : W_INK;
      nakDecor.push(
        <G key={`ni${i}`}>
          <WheelGlyph
            art={NAKSHATRA_GLYPHS[i]}
            size={NAK_GLYPH_SIZE}
            cx={nx}
            cy={ny}
            color={nakInk}
          />
          <RingLabel
            L={Lm}
            r={R.nakName}
            spin={spin}
            fill={nakInk}
            rows={labelRows(pick(ico.ne, ico.en))}
          />
        </G>,
      );
    }

    const rashiSegs: ReactNode[] = [];
    const rashiDecor: ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const L0 = i * 30;
      const L1 = (i + 1) * 30;
      const Lm = L0 + 15;
      const rs = WHEEL_RASHIS[i]!;
      const isHot = hover?.type === "rashi" && hover.i === i;
      const isSel = sel?.type === "rashi" && sel.i === i;
      rashiSegs.push(
        <Path
          key={`rs${i}`}
          d={arcSeg(L0, L1, R.rashiIn, R.rashiOut)}
          fill={segRashiFill({ alt: i % 2 === 1, hot: isHot, sel: isSel })}
          stroke={W_SEP_SOFT}
          strokeWidth={0.6}
        />,
      );
      const [gx, gy] = pol(Lm, R.rashiGlyph);
      rashiDecor.push(
        <G key={`rd${i}`}>
          <WheelGlyph
            art={RASHI_GLYPHS[i]}
            size={RASHI_GLYPH_SIZE}
            cx={gx}
            cy={gy}
            color={isSel || isHot ? W_ACCENT : W_INK}
          />
          <RingLabel
            L={Lm}
            r={R.rashiName}
            spin={spin}
            fill={isSel || isHot ? W_ACCENT : W_INK}
            rows={labelRows(pick(rs.ne, rs.en))}
          />
        </G>,
      );
    }

    const padaCells: ReactNode[] = [];
    if (tw.show_pada) {
      for (let i = 0; i < 108; i++) {
        const L0 = i * (360 / 108);
        const L1 = (i + 1) * (360 / 108);
        const Lm = (L0 + L1) / 2;
        padaCells.push(
          <G key={`pc${i}`}>
            <Path
              d={arcSeg(L0, L1, R.padaIn, R.padaOut)}
              fill={Math.floor(i / 4) % 2 === 1 ? W_PADA_ALT : W_PADA}
              stroke={W_SEP_SOFT}
              strokeWidth={0.4}
            />
            <RingLabel L={Lm} r={R.padaNum} spin={spin} fill={W_INK_DIM}>
              {PADA_AKSHAR[Math.floor(i / 4)]![i % 4]}
            </RingLabel>
          </G>,
        );
      }
    }

    const dayTicks: ReactNode[] = [];
    if (tw.show_lunar) {
      for (let i = 0; i < 12; i++) {
        const days = getBSMonthLength(bsYear, i + 1);
        for (let d = 1; d < days; d++) {
          const L = i * 30 + (d / days) * 30;
          const major = d % 5 === 0;
          const [x1, y1] = pol(L, R.bsOut - 1);
          const [x2, y2] = pol(L, R.bsOut - (major ? 11 : 6));
          dayTicks.push(
            <Line
              key={`dt${i}_${d}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={major ? W_INK_DIM : W_INK_FAINT}
              strokeWidth={major ? 0.9 : 0.55}
              opacity={major ? 0.85 : 0.6}
            />,
          );
        }
      }
    }

    const hits: ReactNode[] = [];
    for (let i = 0; i < 27; i++) {
      const L0 = i * (360 / 27);
      const L1 = (i + 1) * (360 / 27);
      hits.push(
        <Path
          key={`hn${i}`}
          d={arcSeg(L0, L1, R.nakIn, R.nakOut)}
          fill="transparent"
          pointerEvents="none"
        />,
      );
    }
    for (let i = 0; i < 12; i++) {
      const L0 = i * 30;
      const L1 = (i + 1) * 30;
      hits.push(
        <Path
          key={`hr${i}`}
          d={arcSeg(L0, L1, R.rashiIn, R.rashiOut)}
          fill="transparent"
          pointerEvents="none"
        />,
      );
    }

    const rashiRays: ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pol(i * 30, 12);
      const [x2, y2] = pol(i * 30, R.rimOuter - 2);
      rashiRays.push(
        <Line key={`ray${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={W_SEP_SOFT} strokeWidth={0.9} opacity={0.9} />,
      );
    }

    const gregLabels: ReactNode[] = tw.show_greg
      ? GREG_NE.map((m, i) => (
          <RingLabel key={`g${i}`} L={(i - 3) * 30 + 5} r={R.gregMid} spin={spin} fill={W_INK_FAINT} size={12}>
            {m}
          </RingLabel>
        ))
      : [];

    return { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, hits, rashiRays, gregLabels };
  }, [spin, hover, sel, bsYear, tw, pol, arcSeg, pick]);

  const dataLayers = useMemo(() => {
    const sunRashiIdx = Math.floor(normDeg(sunLon) / 30);

    const markerNodes: ReactNode[] = [];
    if (tw.show_today) {
      /* Only the BS month ring is lit. The moon line already marks the
         selected graha; a second rashi/nakshatra wedge made every other
         band look "selected" when the Moon was the target. */
      const mL0 = sunRashiIdx * 30;
      const mL1 = mL0 + 30;
      markerNodes.push(
        <Path
          key="nowwedge-month"
          d={arcSeg(mL0, mL1, R.bsIn, R.bsOut)}
          fill={SEG_NOW_FILL}
          stroke={W_ACCENT}
          strokeWidth={1.2}
        />,
      );

      const targetLon = planetLons[lineTarget] ?? moonLon;
      const targetSym = det.grahas[lineTarget]?.sym ?? "";
      const [lx, ly] = pol(targetLon, R.bsOut - 2);
      markerNodes.push(
        <Line
          key="target-line"
          x1={CX}
          y1={CY}
          x2={lx}
          y2={ly}
          stroke="#f9c800"
          strokeWidth={1.4}
          strokeDasharray="3 4"
          opacity={0.9}
        />,
      );
      markerNodes.push(
        <G key="target-cap" transform={`rotate(${-(targetLon + spin)} ${CX} ${CY})`}>
          <Circle cx={CX} cy={CY - (R.bsOut - 2)} r={3.4} fill="#f9c800" />
          <SvgText
            x={CX}
            y={CY - (R.bsOut + 5)}
            textAnchor="middle"
            alignmentBaseline="middle"
            fill="#f9c800"
            fontSize={15}
            fontFamily={FONT}
            {...(normDeg(targetLon + spin) > 90 && normDeg(targetLon + spin) < 270
              ? { transform: `rotate(180 ${CX} ${CY - (R.bsOut + 5)})` }
              : {})}
          >
            {targetSym}
          </SvgText>
        </G>,
      );
    }

    const innerRings: ReactNode[] = [];
    if (tw.show_today) {
      const sunL = markers.sunLon;
      const elongation = normDeg(markers.moonLon - sunL);
      const curTithiIdx = Math.floor(elongation / 12);
      const curKarIdx = Math.floor(elongation / 6);

      innerRings.push(
        <Circle key="ir-yoga-i" cx={CX} cy={CY} r={R_YOGA_I} fill="none" stroke={W_RIM} strokeWidth={0.8} opacity={0.5} />,
      );

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
          <Path
            key={`yog${y}`}
            d={arcSeg(L0, L1, R_YOGA_I, R_YOGA_O)}
            fill={isCur ? YOGA_CUR : "transparent"}
            stroke={isCur ? "#c4a8f0" : "rgba(169,212,212,0.28)"}
            strokeWidth={isCur ? 1.6 : 0.4}
          />,
        );
        innerRings.push(
          <RingLabel
            key={`yog-lbl-${y}`}
            L={Lm}
            r={(R_YOGA_I + R_YOGA_O) / 2}
            spin={spin}
            size={isCur ? 8 : 7}
            fill="#ffffff"
          >
            {yName.length > 4 ? yName.slice(0, 4) : yName}
          </RingLabel>,
        );
      }

      for (let k = 0; k < 60; k++) {
        const L0 = sunL + k * 6;
        const L1 = sunL + (k + 1) * 6;
        const Lm = sunL + k * 6 + 3;
        const kd = KARANA_SEQ[k]!;
        const isCur = k === curKarIdx;
        const kName = kd.ne;
        innerRings.push(
          <Path
            key={`kar${k}`}
            d={arcSeg(L0, L1, R_KAR_I, R_KAR_O)}
            fill={isCur ? KARANA_CUR : "transparent"}
            stroke={isCur ? W_ACCENT : "rgba(169,212,212,0.28)"}
            strokeWidth={isCur ? 1.7 : 0.4}
          />,
        );
        innerRings.push(
          <RingLabel
            key={`kar-lbl-${k}`}
            L={Lm}
            r={(R_KAR_I + R_KAR_O) / 2}
            spin={spin}
            size={isCur ? 9 : 7.5}
            fill="#ffffff"
          >
            {kName.length > 4 ? kName.slice(0, 4) : kName}
          </RingLabel>,
        );
      }

      for (let i = 0; i < 30; i++) {
        const L0 = sunL + i * 12;
        const L1 = sunL + (i + 1) * 12;
        const Lm = sunL + i * 12 + 6;
        const isCur = i === curTithiIdx;
        const shukla = i < 15;
        const tName = WHEEL_TITHIS[i]!.ne;
        innerRings.push(
          <G key={`tit${i}`}>
            <Path
              d={arcSeg(L0, L1, R_TIT_I, R_TIT_O)}
              fill={isCur ? TITHI_CUR : shukla ? TITHI_SHUKLA : TITHI_KRISHNA}
              stroke={isCur ? W_ACCENT : "rgba(143,191,193,0.18)"}
              strokeWidth={isCur ? 1.7 : 0.5}
            />
            <RingLabel
              L={Lm}
              r={(R_TIT_I + R_TIT_O) / 2}
              spin={spin}
              size={isCur ? 12 : 9.5}
              fill={isCur ? W_ACCENT : W_INK}
              stroke={isCur ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.55)"}
            >
              {tName.length > 6 ? tName.slice(0, 6) : tName}
            </RingLabel>
          </G>,
        );
      }
    }

    const core: ReactNode[] = [];
    if (tw.show_planets) {
      core.push(
        // @ts-expect-error react-native-svg Defs children typing
        <Defs key="pdefs">
          <RadialGradient id="pg0" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#fff9c0" />
            <Stop offset="35%" stopColor="#f9c800" />
            <Stop offset="75%" stopColor="#e07000" />
            <Stop offset="100%" stopColor="#8b3c00" />
          </RadialGradient>
          <RadialGradient id="pg1" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#f6f8fa" />
            <Stop offset="55%" stopColor="#b8c0cc" />
            <Stop offset="100%" stopColor="#6a7480" />
          </RadialGradient>
          <RadialGradient id="pg2" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#ff9870" />
            <Stop offset="55%" stopColor="#c84830" />
            <Stop offset="100%" stopColor="#6e1800" />
          </RadialGradient>
          <RadialGradient id="pg3" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#d8d4cc" />
            <Stop offset="55%" stopColor="#989090" />
            <Stop offset="100%" stopColor="#504848" />
          </RadialGradient>
          <RadialGradient id="pg4" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#f0d898" />
            <Stop offset="50%" stopColor="#c89840" />
            <Stop offset="100%" stopColor="#7a5010" />
          </RadialGradient>
          <RadialGradient id="pg5" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#fffae0" />
            <Stop offset="50%" stopColor="#e8d870" />
            <Stop offset="100%" stopColor="#a09020" />
          </RadialGradient>
          <RadialGradient id="pg6" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#f0e0b0" />
            <Stop offset="50%" stopColor="#c4a060" />
            <Stop offset="100%" stopColor="#7a5c28" />
          </RadialGradient>
          <RadialGradient id="pg7" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#7060c0" />
            <Stop offset="55%" stopColor="#2a2060" />
            <Stop offset="100%" stopColor="#080420" />
          </RadialGradient>
          <RadialGradient id="pg8" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#b06080" />
            <Stop offset="55%" stopColor="#601828" />
            <Stop offset="100%" stopColor="#1c0408" />
          </RadialGradient>
          <RadialGradient id="pg-earth" cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor="#a8f0d0" />
            <Stop offset="45%" stopColor="#1f8f6f" />
            <Stop offset="100%" stopColor="#0a3828" />
          </RadialGradient>
        </Defs>,
      );

      [44, 70, 96, 120, 150, 178, 204, 216].forEach((rad, k) =>
        core.push(
          <Circle key={`orb${k}`} cx={CX} cy={CY} r={rad * ORBIT_SCALE} fill="none" stroke={ORBIT_STROKE} strokeWidth={1} />,
        ),
      );

      det.grahas.forEach((g, i) => {
        const meta = GRAHA_META[i]!;
        const lon = planetLons[i] ?? 0;
        const [px, py] = pol(lon, meta.orbit * ORBIT_SCALE);
        const planetR = "big" in meta && meta.big ? 15 : i === 1 ? 10 : 8;

        core.push(<Circle key={`pg${i}`} cx={px} cy={py} r={planetR + 6} fill={meta.color} opacity={0.55} pointerEvents="none" />);

        if (i === 0) {
          const rays: ReactNode[] = [];
          for (let r = 0; r < 12; r++) {
            const ang = r * 30 * DEG;
            const r1 = planetR + 3;
            const r2 = planetR + (r % 2 === 0 ? 11 : 7);
            rays.push(
              <Line
                key={r}
                x1={px + r1 * Math.sin(ang)}
                y1={py - r1 * Math.cos(ang)}
                x2={px + r2 * Math.sin(ang)}
                y2={py - r2 * Math.cos(ang)}
                stroke="#f9c800"
                strokeWidth={2.2}
                strokeLinecap="round"
                opacity={0.9}
              />,
            );
          }
          core.push(<G key="sun-rays" pointerEvents="none">{rays}</G>);
        }

        if ("ring" in meta && meta.ring) {
          core.push(
            <Ellipse
              key={`ring${i}`}
              cx={px}
              cy={py}
              rx={planetR + 8}
              ry={planetR * 0.45}
              fill="none"
              stroke={meta.color}
              strokeWidth={2.4}
              opacity={0.88}
              transform={`rotate(-20 ${px} ${py})`}
              pointerEvents="none"
            />,
          );
        }

        if (i !== 1) {
          core.push(<Circle key={`pl${i}`} cx={px} cy={py} r={planetR} fill={`url(#pg${i})`} pointerEvents="none" />);
        } else {
          const moonElongation = normDeg(markers.moonLon - markers.sunLon);
          core.push(
            <G key="moon-phase" transform={`translate(${px},${py})`} pointerEvents="none">
              <MoonPhaseIcon elongation={moonElongation} r={planetR} />
            </G>,
          );
        }

        if (i === 4) {
          const clipId = `jclip${i}`;
          core.push(
            <G key={`jbands${i}`} pointerEvents="none">
              {/* @ts-expect-error react-native-svg Defs children typing */}
              <Defs>
                <ClipPath id={clipId}>
                  <Circle cx={px} cy={py} r={planetR - 0.5} />
                </ClipPath>
              </Defs>
              {[-planetR * 0.3, planetR * 0.05, planetR * 0.36].map((oy, bi) => (
                <Rect
                  key={bi}
                  x={px - planetR}
                  y={py + oy - 1.8}
                  width={planetR * 2}
                  height={3.2}
                  fill="rgba(80,42,8,0.42)"
                  clipPath={`url(#${clipId})`}
                />
              ))}
            </G>,
          );
        }

        core.push(
          <SvgText key={`pn${i}`} x={px} y={py + planetR + 9} textAnchor="middle" fill={W_INK_DIM} fontSize={15} fontFamily={FONT} pointerEvents="none">
            {g.ne}
          </SvgText>,
        );
      });

      core.push(
        <G key="earth" pointerEvents="none">
          <Circle cx={CX} cy={CY} r={13} fill="url(#pg-earth)" />
          <Circle cx={CX} cy={CY} r={13} fill="none" stroke="#9fe0c8" strokeWidth={0.8} opacity={0.5} />
        </G>,
      );
    }

    const bsLabels: ReactNode[] = tw.show_lunar
      ? bsMonthsForWheel().map((m, i) => (
          <RingLabel
            key={`b${i}`}
            L={i * 30 + 15}
            r={R.bsMid}
            spin={spin}
            fill={tw.show_today && i === sunRashiIdx ? W_ACCENT : W_INK_DIM}
            size={tw.show_today && i === sunRashiIdx ? 13 : 12}
          >
            {m.ne}
          </RingLabel>
        ))
      : [];

    return { markerNodes, innerRings, core, bsLabels };
  }, [markers, det, spin, tw, moonLon, sunLon, planetLons, lineTarget, pol, arcSeg]);

  const { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, hits, rashiRays, gregLabels } = staticLayers;
  const { markerNodes, innerRings, core, bsLabels } = dataLayers;

  const planetTouchTargets = useMemo(() => {
    if (!tw.show_planets || box.w <= 0 || box.h <= 0) return null;
    /* One pad per graha so TalkBack/VoiceOver can still name them. The
       actual pick is done on the shared overlay so a conjunction does not
       let the top pad steal every tap. */
    return det.grahas.map((g, i) => {
      const meta = GRAHA_META[i]!;
      const lon = planetLons[i] ?? 0;
      const [sx, sy] = planetSvgPosition(lon, meta.orbit, spin);
      const { x, y, scale } = svgToView(sx, sy, box.w, box.h);
      const r = Math.max(22, planetHitRadius(i) * scale * 0.55);
      return (
        <View
          key={`ptap${i}`}
          accessible
          accessibilityRole="button"
          accessibilityLabel={g.ne}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: x - r,
            top: y - r,
            width: r * 2,
            height: r * 2,
          }}
        />
      );
    });
  }, [box.h, box.w, det.grahas, planetLons, spin, tw.show_planets]);

  return (
    <View
      ref={viewRef}
      style={{ flex: 1 }}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        layoutRef.current = { ...layoutRef.current, w, h };
        setBox({ w, h });
        syncLayout();
      }}
      {...wheelPan.panHandlers}
    >
      <View
        style={{
          flex: 1,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: zoom }],
        }}
      >
        <Animated.View style={{ flex: 1, transform: [{ rotate: dragRotate }] }} pointerEvents="none">
        <Svg viewBox="42 42 916 916" width="100%" height="100%" pointerEvents="none">
        <Circle cx={CX} cy={CY} r={R.bsOut} fill="none" stroke={W_RIM} strokeWidth={1.4} />
        {[R.bsIn, R.nakOut, R.nakIn, R.padaIn, R_KAR_I, R.rashiOut, R.rashiIn].map((rad, k) => (
          <Circle key={`rc${k}`} cx={CX} cy={CY} r={rad} fill="none" stroke={W_RIM} strokeWidth={0.8} opacity={0.55} />
        ))}
        <Circle cx={CX} cy={CY} r={R.core} fill="none" stroke={W_RIM} strokeWidth={1.1} opacity={0.7} />

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
      </Svg>
        </Animated.View>
        <Pressable
          onPressIn={(e) => pickRingAtLocal(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
        />
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 8 }]}>
          {planetTouchTargets}
        </View>
      </View>
    </View>
  );
}

export const WheelChart = memo(WheelChartImpl);
