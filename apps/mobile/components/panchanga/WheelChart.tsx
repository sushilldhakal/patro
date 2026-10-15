import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Animated, PanResponder, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Line,
  Path,
  Text as SvgText,
  TSpan,
} from "react-native-svg";

/** Web typings of Defs omit children when moduleSuffixes resolves the .web types. */
const SvgDefs = Defs as ComponentType<{ children?: ReactNode }>;
import Ketu from "@/assets/graha/ketu.svg";
import Rahu from "@/assets/graha/rahu.svg";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import {
  NAKSHATRA_GLYPHS,
  RASHI_GLYPHS,
  WheelGlyph,
} from "@/components/panchanga/WheelGlyph";
import {
  WHEEL_CHART_INNER_R,
  WHEEL_CHART_R,
  WHEEL_NAK_GLYPH_SIZE,
  WHEEL_RASHI_GLYPH_SIZE,
  useWheelChartLabels,
  wheelLabelRows,
  type WheelHover,
} from "@vedic-patro/features/panchanga-drawing";
import { getBSMonthLength } from "@vedic-patro/domain/bs-calendar";
import { bsMonthsForWheel, GRAHA_META, normDeg, PADA_AKSHAR, type WheelDetail, type WheelMarkers, type WheelTweaks, getWheelRashis } from "@vedic-patro/domain/wheel-data";
import { KARANA_SEQ, WHEEL_TITHIS, WHEEL_YOGAS } from "@vedic-patro/domain/tithi-wheel-data";
import { nepaliSvgTextCenter } from "@/lib/nepali-text";
import { NOTO_DEVANAGARI_CHART } from "@/lib/fonts";
import { brand, illustration, midnight, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { wheelPalette } from "@vedic-patro/ui/kit/panchanga";
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

const WHEEL_NODE_ICONS = [Rahu, Ketu] as const;
const SKY_TOP = {
  sun: require("@/assets/sky3d/top/sun.png"),
  moon: require("@/assets/sky3d/top/moon.png"),
  mars: require("@/assets/sky3d/top/mars.png"),
  mercury: require("@/assets/sky3d/top/mercury.png"),
  jupiter: require("@/assets/sky3d/top/jupiter.png"),
  venus: require("@/assets/sky3d/top/venus.png"),
  saturn: require("@/assets/sky3d/top/saturn.png"),
} as const;
const EARTH_TOP = require("@/assets/sky3d/top/earth.png");
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

const FONT = NOTO_DEVANAGARI_CHART;

/**
 * Glyph box sizes. Both are "contain" fits, so these are the longer side of the
 * artwork, not its apparent weight — the rashi band (178–263) has more radial
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
                dy={i > 0 ? 15 * fontSize : -0.55 * (stack.length - 1) * fontSize}
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
  const { pick, gregMonths } = useWheelChartLabels();
  const lineTarget = lineTargetProp ?? 1;
  const viewRef = useRef<View>(null);
  const layoutRef = useRef<LayoutMetrics>({ w: 0, h: 0, pageX: 0, pageY: 0 });
  const [layoutBox, setLayoutBox] = useState({ w: 0, h: 0 });
  const unitPx = Math.min(layoutBox.w, layoutBox.h) > 0 ? (Math.min(layoutBox.w, layoutBox.h) / 916) * zoom : 0;
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const pinchRef = useRef<PinchGesture | null>(null);
  const pinchingRef = useRef(false);
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

  const wheelPan = useMemo(
    () =>
      PanResponder.create({
        /* Spin and pinch start after the finger has actually moved. A tap on a
           graha, rashi, or nakshatra does not select anything — that lives in
           the planet toolbar. */
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
        onPanResponderRelease: () => {
          const drag = dragRef.current;
          const wasPinching = pinchingRef.current;
          if (drag?.mode === "r" && drag.moved && !wasPinching) onSpin(drag.latest);
          dragRef.current = null;
          pinchRef.current = null;
          pinchingRef.current = false;
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
    [angleAt, dragRot, onPan, onSpin, onZoom, syncLayout, touchFromEvent],
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
      [44, 70, 96, 120, 150, 178, 204, 216].forEach((rad, k) =>
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
        const planetR = "big" in meta && meta.big ? 15 : i === 1 ? 10 : 8;
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

  const { nakSegs, nakDecor, rashiSegs, rashiDecor, padaCells, dayTicks, rashiRays, gregLabels } = staticLayers;
  const { markerNodes, innerRings, core, bsLabels } = dataLayers;

  return (
    <View
      ref={viewRef}
      style={{ flex: 1 }}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        layoutRef.current = { ...layoutRef.current, w, h };
        setLayoutBox({ w, h });
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
        {/* Android: rasterize the SVG once into a GPU texture so a drag-spin only
            rotates that texture. Without it every frame re-draws the whole wheel
            (~300 ms/frame on a phone). The texture refreshes when the SVG changes. */}
        <Animated.View
          style={{ flex: 1, transform: [{ rotate: dragRotate }] }}
          pointerEvents="none"
          renderToHardwareTextureAndroid
        >
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
      </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

export const WheelChart = memo(WheelChartImpl);
