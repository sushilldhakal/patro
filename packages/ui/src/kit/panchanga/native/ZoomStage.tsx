import { fitWheelSize, isLandscape } from "./wheel-fit";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type ComponentRef } from "react";
import { Animated, Modal, Platform, Pressable, StatusBar, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { midnight, nativeShadow, radius, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { useLocale } from "@vedic-patro/i18n/react";
import type { IconNode } from "../../../contract";
import { fullscreenIcon, minimizeIcon, rotateCcwIcon } from "../icons";
import { setZoomScrollLocked } from "./zoom-scroll-lock";

/** The panchanga wheel's sky — every zoomable chart sits on it. */
export const ZOOM_STAGE_BG = wheel.sky1;
const INK = midnight.foam;
const BTN_BG = withAlpha(wheel.surface, 0.94);
const BTN_BORDER = withAlpha(wheel.line, 0.28);
const MAX_ZOOM = 6;
/** One tap of the zoom buttons. */
const ZOOM_STEP = 1.5;

const plusIcon: IconNode = [
  ["path", { d: "M5 12h14", key: "plus-h" }],
  ["path", { d: "M12 5v14", key: "plus-v" }],
];
const minusIcon: IconNode = [["path", { d: "M5 12h14", key: "minus-h" }]];
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

/** What the stage's buttons drive on the surface. */
type ZoomControl = { reset: () => void; zoomBy: (factor: number) => void };

/**
 * Two-finger pinch zooms about the fingers, one finger pans once zoomed in.
 * Taps fall through to the chart (a gesture only starts once a finger moves),
 * and at 1× a one-finger drag is left to the page so it still scrolls.
 *
 * Built on react-native-gesture-handler rather than the JS responder system: a
 * ScrollView takes two-finger drags before the responder system can hand them to
 * a child, which is why the old PanResponder pinch never fired on a phone. While a
 * finger is down the page scroll is held still (`zoom-scroll-lock`). The transform is
 * driven by Animated values — no React render per frame.
 */
function ZoomSurface({
  width,
  height,
  children,
  onZoomed,
  controlRef,
}: {
  width: number;
  height: number;
  children: ReactNode;
  onZoomed: (zoomed: boolean) => void;
  controlRef: { current: ZoomControl | null };
}) {
  const zoomV = useRef(new Animated.Value(1)).current;
  const xV = useRef(new Animated.Value(0)).current;
  const yV = useRef(new Animated.Value(0)).current;
  const cur = useRef({ zoom: 1, x: 0, y: 0 });
  const sizeRef = useRef({ w: width, h: height });
  sizeRef.current = { w: width, h: height };
  /* Scale is about the middle of the stage, which is what the gesture's coordinates are in. */
  const stageRef = useRef({ w: width, h: height });
  const viewRef = useRef<ComponentRef<typeof View>>(null);
  /* react-native-gesture-handler reports a pinch's centre relative to the view on iOS and
     Android but in page coordinates on web; this is the offset that brings web in line. */
  const origin = useRef({ x: 0, y: 0 });
  const pinchFrom = useRef<{ zoom0: number; x0: number; y0: number; fx: number; fy: number } | null>(null);
  const panFrom = useRef({ x0: 0, y0: 0 });
  const [canPan, setCanPan] = useState(false);

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

  const settle = useCallback(() => {
    const zoomed = cur.current.zoom > 1.01;
    setCanPan(zoomed);
    onZoomed(zoomed);
  }, [onZoomed]);

  controlRef.current = {
    reset: () => {
      apply(1, 0, 0);
      settle();
    },
    zoomBy: (factor) => {
      const { zoom, x, y } = cur.current;
      const next = Math.max(1, Math.min(MAX_ZOOM, zoom * factor));
      const ratio = next / zoom;
      apply(next, x * ratio, y * ratio);
      settle();
    },
  };

  useEffect(() => () => setZoomScrollLocked(false), []);

  const measureOrigin = useCallback(() => {
    if (Platform.OS === "web") viewRef.current?.measureInWindow((x, y) => (origin.current = { x, y }));
  }, []);

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onTouchesDown((e) => {
        measureOrigin();
        if (e.numberOfTouches >= 2) setZoomScrollLocked(true);
      })
      .onStart((e) => {
        setZoomScrollLocked(true);
        const { zoom, x, y } = cur.current;
        pinchFrom.current = { zoom0: zoom, x0: x, y0: y, fx: e.focalX - origin.current.x, fy: e.focalY - origin.current.y };
      })
      .onUpdate((e) => {
        const p = pinchFrom.current;
        if (!p) return;
        const { w, h } = stageRef.current;
        const zoom = Math.max(1, Math.min(MAX_ZOOM, p.zoom0 * e.scale));
        const ratio = zoom / p.zoom0;
        /* Scale is about the stage's centre, so this keeps the point under
           the fingers where it was — then follows the fingers as they move. */
        const cx = e.focalX - origin.current.x;
        const cy = e.focalY - origin.current.y;
        const x = p.fx - w / 2 - ratio * (p.fx - w / 2 - p.x0) + (cx - p.fx);
        const y = p.fy - h / 2 - ratio * (p.fy - h / 2 - p.y0) + (cy - p.fy);
        apply(zoom, x, y);
      })
      .onFinalize(() => {
        pinchFrom.current = null;
        setZoomScrollLocked(false);
        settle();
      });

    const pan = Gesture.Pan()
      .runOnJS(true)
      .enabled(canPan)
      .minPointers(1)
      .maxPointers(1)
      .minDistance(4)
      .onTouchesDown(() => setZoomScrollLocked(true))
      .onStart(() => {
        panFrom.current = { x0: cur.current.x, y0: cur.current.y };
      })
      .onUpdate((e) => {
        apply(cur.current.zoom, panFrom.current.x0 + e.translationX, panFrom.current.y0 + e.translationY);
      })
      .onFinalize(() => setZoomScrollLocked(false));

    return Gesture.Simultaneous(pinch, pan);
  }, [apply, canPan, measureOrigin, settle]);

  const onStageLayout = useCallback(
    (e: LayoutChangeEvent) => {
      stageRef.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
      measureOrigin();
    },
    [measureOrigin],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={viewRef}
        collapsable={false}
        onLayout={onStageLayout}
        style={{ width: "100%", height, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
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
    </GestureDetector>
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
  /** Drawn over the fullscreen view: the page's own dialogs sit under it (a second Modal cannot present on top of this one). */
  fullscreenOverlay?: ReactNode;
  /** Told when fullscreen opens and closes, so the page can hold its own Modal back meanwhile. */
  onFullscreenChange?: (fullscreen: boolean) => void;
};

/**
 * A chart on the panchanga wheel's sky that pinches to zoom, pans once
 * zoomed, and opens full screen (still pinchable) from its corner button.
 */
export function ZoomStage({ children, size, height, rounded = true, fullscreenOverlay, onFullscreenChange }: ZoomStageProps) {
  const { t } = useLocale();
  const insets = useContext(ZoomInsetsContext);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [fsZoomed, setFsZoomed] = useState(false);
  const controlInline = useRef<ZoomControl | null>(null);
  const controlFs = useRef<ZoomControl | null>(null);
  // In landscape the inline chart shrinks to the screen height, so it never needs scrolling.
  const inlineSize = fitWheelSize(size, screenW, screenH, insets.top);
  const stageH = isLandscape(screenW, screenH) ? inlineSize : Math.max(height ?? size, size);
  const fsH = Math.max(240, screenH - insets.top - insets.bottom - FULLSCREEN_CHROME);
  const fsSize = Math.min(screenW, fsH);

  const open = useCallback(() => {
    controlInline.current?.reset();
    setFullscreen(true);
    onFullscreenChange?.(true);
  }, [onFullscreenChange]);
  const close = useCallback(() => {
    setFsZoomed(false);
    setFullscreen(false);
    onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  const labels = {
    open: t("ui.zoom.fullscreen"),
    close: t("ui.zoom.exit_fullscreen"),
    reset: t("ui.zoom.reset"),
    zoomIn: t("ui.zoom.zoom_in"),
    zoomOut: t("ui.zoom.zoom_out"),
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
        <ZoomSurface width={inlineSize} height={stageH} onZoomed={setZoomed} controlRef={controlInline}>
          {fullscreen ? null : children(inlineSize, false, close)}
        </ZoomSurface>
        <View pointerEvents="box-none" style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", gap: 8 }}>
          {zoomed ? <StageButton node={rotateCcwIcon} label={labels.reset} onPress={() => controlInline.current?.reset()} /> : null}
          {zoomed ? <StageButton node={minusIcon} label={labels.zoomOut} onPress={() => controlInline.current?.zoomBy(1 / ZOOM_STEP)} /> : null}
          <StageButton node={plusIcon} label={labels.zoomIn} onPress={() => controlInline.current?.zoomBy(ZOOM_STEP)} />
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
        <StatusBar barStyle="light-content" />
        {/* A Modal is its own window on Android: gestures need their own root inside it. */}
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: ZOOM_STAGE_BG, paddingTop: insets.top + FULLSCREEN_CHROME, paddingBottom: insets.bottom }}>
          {fullscreen ? (
            <ZoomSurface width={fsSize} height={fsH} onZoomed={setFsZoomed} controlRef={controlFs}>
              {children(fsSize, true, close)}
            </ZoomSurface>
          ) : null}
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", top: insets.top + 10, right: insets.right + 12, flexDirection: "row", gap: 8 }}
          >
            {fsZoomed ? <StageButton node={rotateCcwIcon} label={labels.reset} onPress={() => controlFs.current?.reset()} /> : null}
            {fsZoomed ? <StageButton node={minusIcon} label={labels.zoomOut} onPress={() => controlFs.current?.zoomBy(1 / ZOOM_STEP)} /> : null}
            <StageButton node={plusIcon} label={labels.zoomIn} onPress={() => controlFs.current?.zoomBy(ZOOM_STEP)} />
            <StageButton node={minimizeIcon} label={labels.close} onPress={close} />
          </View>
          {fullscreenOverlay}
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
