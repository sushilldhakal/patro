import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Animated, View, type ImageSourcePropType } from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { EASE_OUT, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Line,
  Path,
  Rect,
  Text as SvgText,
  TSpan,
} from "react-native-svg";

/** Web typings of Defs omit children when moduleSuffixes resolves the .web types. */
const SvgDefs = Defs as ComponentType<{ children?: ReactNode }>;
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/panchanga/nakshatra-icons";
import { NAKSHATRA_GLYPHS, RASHI_GLYPHS, type GlyphArt } from "../glyph-art";
import {
  WHEEL_CHART_INNER_R,
  WHEEL_CHART_R,
  WHEEL_NAK_GLYPH_SIZE,
  WHEEL_RASHI_GLYPH_SIZE,
  useWheelChartLabels,
  wheelLabelRows,
  type WheelHover,
} from "@vedic-patro/features/panchanga-drawing";
import { getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
import { bsMonthsForWheel, GRAHA_META, WHEEL_ORBIT_RADII, normDeg, PADA_AKSHAR, type WheelDetail, type WheelMarkers, type WheelTweaks, getWheelRashis } from "@vedic-patro/domain/panchanga/wheel-data";
import {
  formatWheelDegree,
  wheelDegreeClearsReadout,
  wheelDegreeMarks,
  wheelDegreeNumberSize,
  wheelDegreeStep,
  WHEEL_DEGREE_READOUT_SIZE,
} from "@vedic-patro/domain/panchanga/wheel-degree-ring";
import { KARANA_SEQ, WHEEL_TITHIS, WHEEL_YOGAS } from "@vedic-patro/domain/panchanga/tithi-wheel-data";
const nepaliSvgTextCenter = { alignmentBaseline: "central" as const };

/** First draw of a session only. The plan's settle, not a duration token. */
const WHEEL_SETTLE_MS = 600;
let wheelSettleClaimed = false;

function useWheelSettle(layoutWidth: number) {
  const reduced = useReducedMotionPref();
  const play = useRef<boolean | null>(null);
  if (play.current === null) {
    play.current = !wheelSettleClaimed && !reduced;
    wheelSettleClaimed = true;
  }
  const started = useRef(false);
  const rotation = useSharedValue(play.current ? -10 : 0);
  useEffect(() => {
    if (!play.current || started.current || layoutWidth <= 0) return;
    started.current = true;
    rotation.set(withTiming(0, { duration: WHEEL_SETTLE_MS, easing: EASE_OUT }));
  }, [layoutWidth, rotation]);
  return useAnimatedStyle(() => ({ flex: 1, transform: [{ rotate: `${rotation.get()}deg` }] }));
}

type NodeIcon = ComponentType<{ width?: number; height?: number }>;
type WheelChartAssets = {
  fontFamily: string;
  skyTop: {
    sun: ImageSourcePropType;
    moon: ImageSourcePropType;
    mars: ImageSourcePropType;
    mercury: ImageSourcePropType;
    jupiter: ImageSourcePropType;
    venus: ImageSourcePropType;
    saturn: ImageSourcePropType;
  };
  earthTop: ImageSourcePropType;
  nodeIcons: readonly [NodeIcon, NodeIcon];
};
const WheelAssetsContext = createContext<WheelChartAssets | null>(null);
function useWheelAssets(): WheelChartAssets {
  const value = useContext(WheelAssetsContext);
  if (!value) throw new Error("WheelChart assets");
  return value;
}

function WheelGlyph({ art, size, cx, cy, color, opacity = 1 }: { art: GlyphArt | undefined; size: number; cx: number; cy: number; color?: string; opacity?: number }) {
  if (!art) return null;
  const [minX, minY, w, h] = art.vb;
  const scale = size / Math.max(w, h);
  const tx = cx - (minX + w / 2) * scale;
  const ty = cy - (minY + h / 2) * scale;
  return (
    <G transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})`} opacity={opacity} pointerEvents="none">
      <G transform={art.transform} fill={color} stroke={color} strokeWidth={art.strokeWidth} strokeLinejoin="round" strokeLinecap="round">
        {art.paths.map((path, i) => (
          <Path key={i} d={path.d} strokeWidth={path.strokeWidth} />
        ))}
      </G>
    </G>
  );
}
import { brand, illustration, midnight, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { wheelPalette } from "../wheel-palette";
import { DEG, CX, CY, ORBIT_SCALE, planetIconSize, planetVisualRadius } from "@vedic-patro/domain/panchanga/wheel-chart-geometry";
import {
  earthTop,
  retroBorder,
  WHEEL_MERIDIAN,
  WHEEL_RETRO,
  wheelMoonShadow,
  type WheelPlace,
} from "@vedic-patro/domain/panchanga/wheel-bodies";
import { moonSunFacingRotation } from "@vedic-patro/domain/astronomy/moon-phase-svg";

const SKY_NAMES = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"] as const;

const { yogaIn: R_YOGA_I, yogaOut: R_YOGA_O, karanaIn: R_KAR_I, karanaOut: R_KAR_O, tithiIn: R_TIT_I, tithiOut: R_TIT_O } = WHEEL_CHART_INNER_R;

// Resolved `.pn-wheel` custom properties from the web stylesheet. react-native-svg
// cannot read CSS vars, so the exact computed values are inlined here — keep them
// in step with the `.pn-wheel` block in global.css / the web's index.css.
/** var(--w-rim) — color-mix(#a9d4d4 50%, transparent) */
const W_RIM = withAlpha(wheel.rim, 0.5);
/** var(--w-sep) — color-mix(#8fbfc1 42%, transparent) */
const W_SEP = withAlpha(wheel.line, 0.42);
/** var(--w-sep-soft) — color-mix(#8fbfc1 16%, transparent) */
const W_SEP_SOFT = withAlpha(wheel.line, 0.16);
/** var(--w-accent) — var(--brand-vermilion) */
const W_ACCENT = brand.vermilion;
/** var(--w-ink) */
const W_INK = midnight.foam;
/** var(--w-ink-dim) */
const W_INK_DIM = wheel.inkDim;
/** var(--w-ink-faint) */
const W_INK_FAINT = wheel.inkFaint;
/** var(--w-band) — color-mix(brand-green 30%, #0a1618) */
const W_BAND = illustration.green13;
/** var(--w-band-alt) — color-mix(brand-green 44%, #0b181a) */
const W_BAND_ALT = illustration.green17;
/** var(--w-rashi) — color-mix(brand-green 22%, #091315) */
const W_RASHI = illustration.green12;
/** var(--w-rashi-alt) — color-mix(brand-green 34%, #0a1518) */
const W_RASHI_ALT = illustration.green13;
/** var(--w-pada) */
const W_PADA = wheel.sky0;
/** var(--w-pada-alt) */
const W_PADA_ALT = wheel.sky0;


/**
 * Glyph box sizes. Both are "contain" fits, so these are the longer side of the
 * artwork, not its apparent weight — the rashi band (202–263) has more radial
 * room to spare than the nakshatra band, whose glyph shares 345–423 with a name
 * that runs to two stacked rows in English.
 */
const RASHI_GLYPH_SIZE = WHEEL_RASHI_GLYPH_SIZE;
const NAK_GLYPH_SIZE = WHEEL_NAK_GLYPH_SIZE;

/** color-mix(in srgb, var(--w-accent) 26%, var(--w-band-alt)) */
const SEG_HOT = illustration.orange22;
/** color-mix(in srgb, var(--w-accent) 40%, var(--w-band-alt)) */
const SEG_SEL = illustration.orange26;
/** color-mix(in srgb, var(--w-accent) 18%, transparent) */
const SEG_NOW_FILL = withAlpha(brand.vermilion, 0.18);
/** color-mix(in srgb, #8fbfc1 14%, transparent) */
const ORBIT_STROKE = withAlpha(wheel.line, 0.14);
/** Current yoga — faint tint only; solid fills drowned the labels on native. */
const YOGA_CUR = withAlpha(illustration.violet70, 0.20);
/** Current karana — same idea: highlight without covering the name. */
const KARANA_CUR = withAlpha(brand.vermilion, 0.16);
/** color-mix(in srgb, var(--w-accent) 28%, #0d2428) */
const TITHI_CUR = illustration.red18;
/** color-mix(in srgb, #2d8a86 26%, #0a1a1e) */
const TITHI_SHUKLA = illustration.teal15b;
/** color-mix(in srgb, #2d8a86 14%, #060e10) */
const TITHI_KRISHNA = midnight.background;

const R = WHEEL_CHART_R;

export type { WheelHover };
export type WheelPick = WheelHover;

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

type LayoutMetrics = { w: number; h: number };

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

const labelRows = wheelLabelRows;

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
  const FONT = useWheelAssets().fontFamily;

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
                /* 1.1em, as on web. `15 * fontSize` flung the second word
                   (“फाल्गुनी”) ~165 units off the ring and left “उत्तर” /
                   “पूर्व” stranded on their own. */
                dy={i > 0 ? 1.1 * fontSize : -0.55 * (stack.length - 1) * fontSize}
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
  place?: WheelPlace | null;
  assets: WheelChartAssets;
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
  onPick: _onPick,
  onSpin,
  zoom,
  onZoom,
  pan,
  onPan,
  lineTarget: lineTargetProp,
  place,
}: WheelChartProps) {
  const { skyTop: SKY_TOP, earthTop: EARTH_TOP, nodeIcons: WHEEL_NODE_ICONS, fontFamily: FONT } = useWheelAssets();

  const { pick, gregMonths } = useWheelChartLabels();
  const lineTarget = lineTargetProp ?? 1;
  const layoutRef = useRef<LayoutMetrics>({ w: 0, h: 0 });
  const [layoutBox, setLayoutBox] = useState({ w: 0, h: 0 });
  const settleStyle = useWheelSettle(layoutBox.w);
  const unitPx = Math.min(layoutBox.w, layoutBox.h) > 0 ? (Math.min(layoutBox.w, layoutBox.h) / 1000) * zoom : 0;
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchRef = useRef<PinchGesture | null>(null);
  const pinchingRef = useRef(false);
  /* Live pinch / pan, applied straight to the transform. Committing every
     finger-move to `zoom` / `pan` state re-rendered the whole SVG per event —
     and in fullscreen there were two of them — so pinch stalled there. The
     parent's state is set once, on release. */
  const liveZoom = useRef(new Animated.Value(zoom)).current;
  const liveX = useRef(new Animated.Value(pan.x)).current;
  const liveY = useRef(new Animated.Value(pan.y)).current;
  const pendingRef = useRef<{ zoom: number; x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    liveZoom.setValue(zoom);
    liveX.setValue(pan.x);
    liveY.setValue(pan.y);
  }, [zoom, pan.x, pan.y, liveZoom, liveX, liveY]);
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

  const angleAt = useCallback((locationX: number, locationY: number) => {
    const { w, h } = layoutRef.current;
    if (w <= 0 || h <= 0) return 0;
    const cx = w / 2;
    const cy = h / 2;
    return (Math.atan2(locationY - cy, locationX - cx) * 180) / Math.PI;
  }, []);

  const commitLive = useCallback(() => {
    const done = pendingRef.current;
    pendingRef.current = null;
    if (!done) return;
    if (done.zoom !== zoomRef.current) onZoom(done.zoom);
    onPan(done.x, done.y);
  }, [onPan, onZoom]);

  /* Gesture-handler gestures, not the JS responder: the responder never saw a
     touch inside the fullscreen Modal, and on the panchanga page the scroll view
     took a two-finger drag before the wheel could claim it, so pinch did nothing
     on phones and tablets alike. Pinch zooms about the fingers; one finger spins
     the wheel at 1x and pans it once zoomed in. Both drive Animated values — the
     real `zoom` / `pan` / `spin` are committed once, on release. */
  const wheelGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart((e) => {
        pinchingRef.current = true;
        const rotating = dragRef.current;
        if (rotating?.mode === "r") {
          if (rotating.moved) onSpin(rotating.latest);
          else dragRot.setValue(0);
        }
        dragRef.current = null;
        const from = pendingRef.current ?? { zoom: zoomRef.current, ...panRef.current };
        pinchRef.current = {
          dist0: 1,
          zoom0: from.zoom,
          pan0x: from.x,
          pan0y: from.y,
          focalX: e.focalX,
          focalY: e.focalY,
          centroid0x: e.focalX,
          centroid0y: e.focalY,
        };
      })
      .onUpdate((e) => {
        const p = pinchRef.current;
        const { w, h } = layoutRef.current;
        /* As a finger lifts, Android sends one more update whose focal point is
           the finger left behind — following it threw the wheel sideways. */
        if (!p || w <= 0 || h <= 0 || e.numberOfPointers < 2) return;
        /* `scale` is the finger spread relative to where the pinch began. */
        const next = applyPinchTransform(p, e.scale, { x: e.focalX, y: e.focalY }, w, h);
        pendingRef.current = { zoom: next.zoom, x: next.pan.x, y: next.pan.y };
        liveZoom.setValue(next.zoom);
        liveX.setValue(next.pan.x);
        liveY.setValue(next.pan.y);
      })
      .onFinalize(() => {
        if (!pinchingRef.current) return;
        commitLive();
        pinchRef.current = null;
        pinchingRef.current = false;
      });

    const drag = Gesture.Pan()
      .runOnJS(true)
      .minDistance(10)
      .onStart((e) => {
        if (pinchingRef.current || e.numberOfPointers > 1) return;
        if (zoomRef.current > 1) {
          dragRef.current = { mode: "p", pan0x: panRef.current.x, pan0y: panRef.current.y, moved: false };
          return;
        }
        const { w, h } = layoutRef.current;
        /* Angle from where the finger went down, not where the drag was recognised. */
        const { x, y } = untransformTouch(e.x - e.translationX, e.y - e.translationY, w, h, panRef.current, zoomRef.current);
        dragRef.current = { mode: "r", spin0: spinRef.current, angle0: angleAt(x, y), moved: false, latest: spinRef.current };
      })
      .onUpdate((e) => {
        const d = dragRef.current;
        if (!d || pinchingRef.current || e.numberOfPointers > 1) return;
        if (d.mode === "p") {
          if (Math.abs(e.translationX) > 3 || Math.abs(e.translationY) > 3) d.moved = true;
          const x = d.pan0x + e.translationX;
          const y = d.pan0y + e.translationY;
          pendingRef.current = { zoom: zoomRef.current, x, y };
          liveX.setValue(x);
          liveY.setValue(y);
          return;
        }
        const { w, h } = layoutRef.current;
        const { x, y } = untransformTouch(e.x, e.y, w, h, panRef.current, zoomRef.current);
        let delta = angleAt(x, y) - d.angle0;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        if (Math.abs(delta) > 1.2) d.moved = true;
        d.latest = d.spin0 + delta;
        /* Spin increases counter-clockwise on screen (see `pol`), CSS rotate
           is clockwise — hence the sign. */
        dragRot.setValue(-delta);
      })
      .onFinalize(() => {
        const d = dragRef.current;
        dragRef.current = null;
        if (!d) return;
        if (d.mode === "r") {
          if (d.moved) onSpin(d.latest);
          else dragRot.setValue(0);
          return;
        }
        commitLive();
      });

    return Gesture.Simultaneous(pinch, drag);
  }, [angleAt, commitLive, dragRot, liveX, liveY, liveZoom, onSpin]);


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
      const rs = getWheelRashis()[i]!;
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

    const rashiRays: ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pol(i * 30, 12);
      const [x2, y2] = pol(i * 30, R.rimOuter - 2);
      rashiRays.push(
        <Line key={`ray${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={W_SEP_SOFT} strokeWidth={0.9} opacity={0.9} />,
      );
    }

    const gregLabels: ReactNode[] = tw.show_greg
      ? gregMonths.map((label, i) => (
          <RingLabel key={`g${i}`} L={(i - 3) * 30 + 5} r={R.gregMid} spin={spin} fill={W_INK_FAINT} size={12}>
            {label}
          </RingLabel>
        ))
      : [];

    return { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, rashiRays, gregLabels };
  }, [spin, hover, sel, bsYear, tw, pol, arcSeg, pick, gregMonths]);

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
          stroke={illustration.amber49}
          strokeWidth={1.4}
          strokeDasharray="3 4"
          opacity={0.9}
        />,
      );
      markerNodes.push(
        <G key="target-cap" transform={`rotate(${-(targetLon + spin)} ${CX} ${CY})`}>
          <Circle cx={CX} cy={CY - (R.bsOut - 2)} r={3.4} fill={illustration.amber49} />
          <SvgText
            x={CX}
            y={CY - (R.bsOut + 5)}
            textAnchor="middle"
            alignmentBaseline="middle"
            fill={illustration.amber49}
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
            stroke={isCur ? illustration.violet80 : withAlpha(wheel.rim, 0.28)}
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
            fill={neutral.white}
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
            stroke={isCur ? W_ACCENT : withAlpha(wheel.rim, 0.28)}
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
            fill={neutral.white}
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
              stroke={isCur ? W_ACCENT : withAlpha(wheel.line, 0.18)}
              strokeWidth={isCur ? 1.7 : 0.5}
            />
            <RingLabel
              L={Lm}
              r={(R_TIT_I + R_TIT_O) / 2}
              spin={spin}
              size={isCur ? 12 : 9.5}
              fill={isCur ? W_ACCENT : W_INK}
              stroke={isCur ? withAlpha(neutral.black, 0.7) : withAlpha(neutral.black, 0.55)}
            >
              {tName.length > 6 ? tName.slice(0, 6) : tName}
            </RingLabel>
          </G>,
        );
      }
    }

    const core: ReactNode[] = [];
    if (tw.show_planets) {
      WHEEL_ORBIT_RADII.forEach((rad, k) =>
        core.push(
          <Circle key={`orb${k}`} cx={CX} cy={CY} r={rad * ORBIT_SCALE} fill="none" stroke={ORBIT_STROKE} strokeWidth={1} />,
        ),
      );

      const planetNames: ReactNode[] = [];
      const [sunX, sunY] = pol(sunLon, GRAHA_META[0]!.orbit * ORBIT_SCALE);
      det.grahas.forEach((g, i) => {
        const meta = GRAHA_META[i]!;
        const lon = planetLons[i] ?? 0;
        const [px, py] = pol(lon, meta.orbit * ORBIT_SCALE);
        const planetR = planetVisualRadius(i);
        const sky = SKY_NAMES[i];
        const collar = g.retrograde ? retroBorder(planetR, unitPx) : null;
        const moonShadow = i === 1 ? wheelMoonShadow(normDeg(moonLon - sunLon), planetR) : null;
        const moonTurn = i === 1 ? moonSunFacingRotation(px, py, sunX, sunY) : 0;
        if (sky) {
          core.push(
            <G key={`pl${i}`} pointerEvents="none">
              <SvgDefs>
                <ClipPath id={`wheel-pl-${i}`}>
                  <Circle cx={px} cy={py} r={planetR} />
                </ClipPath>
              </SvgDefs>
              {collar ? (
                <Circle cx={px} cy={py} r={collar.r} fill="none" stroke={WHEEL_RETRO} strokeWidth={collar.width} opacity={0.9} />
              ) : null}
              {i === 6 ? (
                <Circle cx={px} cy={py} r={planetR * 1.42} fill="none" stroke={wheelPalette.saturnRing} strokeWidth={1.15} />
              ) : null}
              <SvgImage
                href={SKY_TOP[sky]}
                x={px - planetR}
                y={py - planetR}
                width={planetR * 2}
                height={planetR * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#wheel-pl-${i})`}
              />
              {moonShadow ? (
                <Path
                  d={moonShadow}
                  transform={`translate(${px} ${py}) rotate(${moonTurn})`}
                  fill={wheelPalette.moonShadow}
                  fillRule="evenodd"
                  opacity={0.78}
                />
              ) : null}
            </G>,
          );
        } else {
          const icon = planetIconSize(i, planetR);
          const Icon = WHEEL_NODE_ICONS[i - 7]!;
          core.push(
            <G key={`pl${i}`} pointerEvents="none">
              {collar ? (
                <Circle cx={px} cy={py} r={collar.r} fill="none" stroke={WHEEL_RETRO} strokeWidth={collar.width} opacity={0.9} />
              ) : null}
              <G transform={`translate(${px - icon / 2} ${py - icon / 2})`}>
                <Icon width={icon} height={icon} />
              </G>
            </G>,
          );
        }

        planetNames.push(
          <G key={`pn${i}`} transform={`translate(${px} ${py}) scale(${1 / zoom})`} pointerEvents="none">
            <SvgText
              x={0}
              y={0}
              textAnchor="middle"
              fill="none"
              stroke={wheelPalette.nameHalo}
              strokeWidth={1.6}
              fontSize={13}
              fontWeight="600"
              fontFamily={FONT}
              {...nepaliSvgTextCenter}
            >
              {pick(g.ne, g.en)}
            </SvgText>
            <SvgText
              x={0}
              y={0}
              textAnchor="middle"
              fill={W_INK}
              fontSize={13}
              fontWeight="600"
              fontFamily={FONT}
              {...nepaliSvgTextCenter}
            >
              {pick(g.ne, g.en)}
            </SvgText>
          </G>,
        );
      });

      const earthR = 13;
      const globe = place ? earthTop(place.lat, place.lon, place.at) : null;
      core.push(
        <G key="earth" pointerEvents="none" transform={`translate(${CX} ${CY}) rotate(${globe?.spin ?? 0})`}>
          <SvgDefs>
            <ClipPath id="wheel-earth">
              <Circle cx={0} cy={0} r={earthR} />
            </ClipPath>
          </SvgDefs>
          <SvgImage
            href={EARTH_TOP}
            x={-earthR}
            y={-earthR}
            width={earthR * 2}
            height={earthR * 2}
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#wheel-earth)"
          />
          {globe ? (
            <Line
              x1={-globe.dx * earthR}
              y1={-globe.dy * earthR}
              x2={globe.dx * earthR}
              y2={globe.dy * earthR}
              stroke={WHEEL_MERIDIAN}
              strokeWidth={1.4}
            />
          ) : null}
          {globe ? (
            <G>
              <Circle cx={globe.place.x * earthR} cy={globe.place.y * earthR} r={2.4} fill={WHEEL_MERIDIAN} opacity={0.35} />
              <Circle cx={globe.place.x * earthR} cy={globe.place.y * earthR} r={1.3} fill={WHEEL_MERIDIAN} />
            </G>
          ) : null}
        </G>,
      );
      core.push(...planetNames);
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
  }, [markers, det, spin, tw, moonLon, sunLon, planetLons, lineTarget, pol, arcSeg, pick, zoom, place, unitPx]);

  // The degree scale on the outermost ring: every 10°, every 5° once zoomed in,
  // with the selected graha's exact longitude read out where its needle meets
  // the rim. Kept apart from the layers above: only it depends on the zoom step
  // and the selected longitude.
  const degreeStep = wheelDegreeStep(zoom);
  const selectedDeg = tw.show_today ? normDeg(planetLons[lineTarget] ?? moonLon) : null;
  const degreeRing = useMemo(() => {
    const nodes: ReactNode[] = [];
    for (const { deg, major } of wheelDegreeMarks(degreeStep)) {
      const [x1, y1] = pol(deg, R.rimOuter);
      const [x2, y2] = pol(deg, R.rimOuter - (major ? 9 : 5));
      nodes.push(
        <Line
          key={`dgt${deg}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={major ? W_INK_DIM : W_INK_FAINT}
          strokeWidth={major ? 1.1 : 0.7}
        />,
      );
      if (!wheelDegreeClearsReadout(deg, selectedDeg)) continue;
      nodes.push(
        <RingLabel key={`dgn${deg}`} L={deg} r={R.degNum + 1.5} spin={spin} fill={W_INK_DIM} size={wheelDegreeNumberSize(degreeStep)}>
          {String(deg)}
        </RingLabel>,
      );
    }
    if (selectedDeg != null) {
      const [x1, y1] = pol(selectedDeg, R.tickIn);
      const [x2, y2] = pol(selectedDeg, R.rimOuter);
      const a = normDeg(selectedDeg + spin);
      const flip = a > 90 && a < 270;
      const cy = CY - R.degNum;
      nodes.push(<Line key="dgsel-line" x1={x1} y1={y1} x2={x2} y2={y2} stroke={illustration.amber49} strokeWidth={1.4} />);
      nodes.push(
        <G key="dgsel" transform={`rotate(${-a} ${CX} ${CY})`} pointerEvents="none">
          <Rect x={CX - 25} y={cy - 6.5} width={50} height={13} rx={4} fill={midnight.background} stroke={illustration.amber49} strokeWidth={0.8} />
          <SvgText
            x={CX}
            y={cy}
            textAnchor="middle"
            fill={illustration.amber49}
            fontSize={WHEEL_DEGREE_READOUT_SIZE}
            fontWeight="bold"
            fontFamily={FONT}
            {...nepaliSvgTextCenter}
            {...(flip ? { transform: `rotate(180 ${CX} ${cy})` } : {})}
          >
            {formatWheelDegree(selectedDeg)}
          </SvgText>
        </G>,
      );
    }
    return nodes;
  }, [degreeStep, selectedDeg, spin, pol, FONT]);

  const { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, rashiRays, gregLabels } = staticLayers;
  const { markerNodes, innerRings, core, bsLabels } = dataLayers;

  return (
    <GestureDetector gesture={wheelGesture}>
    <View
      collapsable={false}
      style={{ flex: 1 }}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        layoutRef.current = { w, h };
        setLayoutBox({ w, h });
      }}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: liveX }, { translateY: liveY }, { scale: liveZoom }],
        }}
      >
        <Reanimated.View style={settleStyle} pointerEvents="none">
        {/* Android: rasterize the SVG once into a GPU texture so a drag-spin only
            rotates that texture. Without it every frame re-draws the whole wheel
            (~300 ms/frame on a phone). The texture refreshes when the SVG changes. */}
        <Animated.View
          style={{ flex: 1, transform: [{ rotate: dragRotate }] }}
          pointerEvents="none"
          renderToHardwareTextureAndroid
        >
        <Svg viewBox="0 0 1000 1000" width="100%" height="100%" pointerEvents="none">
        <Circle cx={CX} cy={CY} r={R.bsOut} fill="none" stroke={W_RIM} strokeWidth={1.4} />
        <Circle cx={CX} cy={CY} r={R.rimOuter} fill="none" stroke={W_RIM} strokeWidth={0.8} opacity={0.55} />
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
        {degreeRing}
      </Svg>
        </Animated.View>
        </Reanimated.View>
      </Animated.View>
    </View>
    </GestureDetector>
  );
}

function WheelChartBound(props: WheelChartProps) {
  return (
    <WheelAssetsContext.Provider value={props.assets}>
      <WheelChartImpl {...props} />
    </WheelAssetsContext.Provider>
  );
}

export const WheelChart = memo(WheelChartBound);
export type { WheelChartAssets };

