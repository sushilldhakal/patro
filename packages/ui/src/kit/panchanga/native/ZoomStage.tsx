import { fitWheelSize, isLandscape } from "./wheel-fit";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, PanResponder, Pressable, StatusBar, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { midnight, nativeShadow, radius, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { useLocale } from "@vedic-patro/i18n/react";
import type { IconNode } from "../../../contract";
import { fullscreenIcon, minimizeIcon, rotateCcwIcon } from "../icons";

/** The panchanga wheel's sky — every zoomable chart sits on it. */
export const ZOOM_STAGE_BG = wheel.sky1;
const INK = midnight.foam;
const BTN_BG = withAlpha(wheel.surface, 0.94);
const BTN_BORDER = withAlpha(wheel.line, 0.28);
const MAX_ZOOM = 6;
/** Fullscreen leaves this much room above the chart for its own buttons. */
const FULLSCREEN_CHROME = 56;

/** Safe-area insets for the fullscreen modal. The app provides them; the kit cannot read them. */
const ZoomInsetsContext = createContext({ top: 0, bottom: 0, left: 0, right: 0 });
export const ZoomStageInsets = ZoomInsetsContext.Provider;

function StageIcon({ node }: { node: IconNode }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      {node.map(([tag, attrs], i) =>
        tag === "path" ? (
          <Path key={i} d={String(attrs.d)} stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ) : null,
      )}
    </Svg>
  );
}

function StageButton({ node, label, onPress }: { node: IconNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: BTN_BORDER,
        backgroundColor: BTN_BG,
        ...nativeShadow("lg"),
      }}
    >
      <StageIcon node={node} />
    </Pressable>
  );
}

type Touch = { pageX: number; pageY: number };
type Gesture =
  | { kind: "pan"; x0: number; y0: number }
  | { kind: "pinch"; dist0: number; zoom0: number; x0: number; y0: number; fx: number; fy: number };

/**
 * Two-finger pinch zooms about the fingers, one finger pans once zoomed in.
 * Taps fall through to the chart (nothing is claimed until a finger moves),
 * and at 1× a one-finger drag is left to the page so it still scrolls.
 * The transform is driven by Animated values — no React render per frame.
 */
function ZoomSurface({
  width,
  height,
  children,
  onZoomed,
  resetRef,
}: {
  width: number;
  height: number;
  children: ReactNode;
  onZoomed: (zoomed: boolean) => void;
  resetRef: { current: (() => void) | null };
}) {
  const zoomV = useRef(new Animated.Value(1)).current;
  const xV = useRef(new Animated.Value(0)).current;
  const yV = useRef(new Animated.Value(0)).current;
  const cur = useRef({ zoom: 1, x: 0, y: 0 });
  const gesture = useRef<Gesture | null>(null);
  const viewRef = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ w: width, h: height });
  sizeRef.current = { w: width, h: height };

  const apply = useCallback(
    (zoom: number, x: number, y: number) => {
      const z = Math.max(1, Math.min(MAX_ZOOM, zoom));
      const { w, h } = sizeRef.current;
      /* Keep some of the chart on screen: the edge can reach the middle, no further. */
      const mx = (w * z) / 2;
      const my = (h * z) / 2;
      const nx = z === 1 ? 0 : Math.max(-mx, Math.min(mx, x));
      const ny = z === 1 ? 0 : Math.max(-my, Math.min(my, y));
      cur.current = { zoom: z, x: nx, y: ny };
      zoomV.setValue(z);
      xV.setValue(nx);
      yV.setValue(ny);
    },
    [xV, yV, zoomV],
  );

  resetRef.current = () => {
    apply(1, 0, 0);
    onZoomed(false);
  };

  const measure = useCallback(() => {
    viewRef.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  }, []);

  const responder = useMemo(() => {
    const wants = (e: GestureResponderEvent, g: { dx: number; dy: number }) =>
      (e.nativeEvent.touches?.length ?? 0) >= 2 || (cur.current.zoom > 1 && Math.hypot(g.dx, g.dy) > 6);
    const end = () => {
      gesture.current = null;
      onZoomed(cur.current.zoom > 1.01);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: wants,
      onMoveShouldSetPanResponderCapture: wants,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        gesture.current = null;
        measure();
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches as readonly Touch[];
        if (touches.length >= 2) {
          const a = touches[0]!;
          const b = touches[1]!;
          const dist = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          if (dist <= 0) return;
          const cx = (a.pageX + b.pageX) / 2 - origin.current.x;
          const cy = (a.pageY + b.pageY) / 2 - origin.current.y;
          const p = gesture.current;
          if (p?.kind !== "pinch") {
            const { zoom, x, y } = cur.current;
            gesture.current = { kind: "pinch", dist0: dist, zoom0: zoom, x0: x, y0: y, fx: cx, fy: cy };
            return;
          }
          const { w, h } = sizeRef.current;
          const zoom = Math.max(1, Math.min(MAX_ZOOM, p.zoom0 * (dist / p.dist0)));
          const ratio = zoom / p.zoom0;
          /* Scale is about the view's centre, so this keeps the point under
             the fingers where it was — then follows the fingers as they move. */
          const x = p.fx - w / 2 - ratio * (p.fx - w / 2 - p.x0) + (cx - p.fx);
          const y = p.fy - h / 2 - ratio * (p.fy - h / 2 - p.y0) + (cy - p.fy);
          apply(zoom, x, y);
          return;
        }
        if (gesture.current?.kind !== "pan") {
          /* Started, or a finger of a pinch lifted: carry on from here. */
          gesture.current = { kind: "pan", x0: cur.current.x - g.dx, y0: cur.current.y - g.dy };
        }
        if (cur.current.zoom <= 1) return;
        const p = gesture.current;
        apply(cur.current.zoom, p.x0 + g.dx, p.y0 + g.dy);
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, [apply, measure, onZoomed]);

  return (
    <View
      ref={viewRef}
      onLayout={measure}
      style={{ width: "100%", height, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
      {...responder.panHandlers}
    >
      <Animated.View
        style={{
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateX: xV }, { translateY: yV }, { scale: zoomV }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

type ZoomStageProps = {
  /** Draws the chart for a square of `size` points; called again, larger, in fullscreen. */
  children: (size: number, fullscreen: boolean, exitFullscreen: () => void) => ReactNode;
  /** Inline chart size. */
  size: number;
  /** Inline stage height, when it is taller than the chart. */
  height?: number;
  /** Rounded card around the inline stage. */
  rounded?: boolean;
};

/**
 * A chart on the panchanga wheel's sky that pinches to zoom, pans once
 * zoomed, and opens full screen (still pinchable) from its corner button.
 */
export function ZoomStage({ children, size, height, rounded = true }: ZoomStageProps) {
  const { t } = useLocale();
  const insets = useContext(ZoomInsetsContext);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [fsZoomed, setFsZoomed] = useState(false);
  const resetInline = useRef<(() => void) | null>(null);
  const resetFs = useRef<(() => void) | null>(null);
  // In landscape the inline chart shrinks to the screen height, so it never needs scrolling.
  const inlineSize = fitWheelSize(size, screenW, screenH, insets.top);
  const stageH = isLandscape(screenW, screenH) ? inlineSize : Math.max(height ?? size, size);
  const fsH = Math.max(240, screenH - insets.top - insets.bottom - FULLSCREEN_CHROME);
  const fsSize = Math.min(screenW, fsH);

  const open = useCallback(() => {
    resetInline.current?.();
    setFullscreen(true);
  }, []);
  const close = useCallback(() => {
    setFsZoomed(false);
    setFullscreen(false);
  }, []);

  const labels = {
    open: t("ui.zoom.fullscreen"),
    close: t("ui.zoom.exit_fullscreen"),
    reset: t("ui.zoom.reset"),
  };

  return (
    <>
      <View
        style={{
          width: "100%",
          backgroundColor: ZOOM_STAGE_BG,
          borderRadius: rounded ? 16 : 0,
          borderWidth: rounded ? 1 : 0,
          borderColor: BTN_BORDER,
          overflow: "hidden",
        }}
      >
        {/* The page's copy stays mounted but empty while fullscreen is up:
            one chart drawing at a time. */}
        <ZoomSurface width={inlineSize} height={stageH} onZoomed={setZoomed} resetRef={resetInline}>
          {fullscreen ? null : children(inlineSize, false, close)}
        </ZoomSurface>
        <View pointerEvents="box-none" style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", gap: 8 }}>
          {zoomed ? <StageButton node={rotateCcwIcon} label={labels.reset} onPress={() => resetInline.current?.()} /> : null}
          <StageButton node={fullscreenIcon} label={labels.open} onPress={open} />
        </View>
      </View>

      <Modal
        visible={fullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        supportedOrientations={["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"]}
        onRequestClose={close}
      >
        <StatusBar barStyle="light-content" backgroundColor={ZOOM_STAGE_BG} translucent />
        <View style={{ flex: 1, backgroundColor: ZOOM_STAGE_BG, paddingTop: insets.top + FULLSCREEN_CHROME, paddingBottom: insets.bottom }}>
          {fullscreen ? (
            <ZoomSurface width={fsSize} height={fsH} onZoomed={setFsZoomed} resetRef={resetFs}>
              {children(fsSize, true, close)}
            </ZoomSurface>
          ) : null}
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", top: insets.top + 10, right: insets.right + 12, flexDirection: "row", gap: 8 }}
          >
            {fsZoomed ? <StageButton node={rotateCcwIcon} label={labels.reset} onPress={() => resetFs.current?.()} /> : null}
            <StageButton node={minimizeIcon} label={labels.close} onPress={close} />
          </View>
        </View>
      </Modal>
    </>
  );
}
