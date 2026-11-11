/**
 * Two-finger zoom for a Learn study drawn in SVG — the website's `useSvgZoom`.
 *
 * It zooms by narrowing the SVG's own viewBox, so text and strokes stay crisp.
 * Pinch with two fingers; once zoomed in, one finger drags the view around. At
 * 1× a one-finger swipe is left to the article, so the page still scrolls.
 *
 * The view maths is the website's. The website reads pointer events off the
 * <svg>; here a touch layer laid over the drawing (`zoom.layer`, passed to
 * `StudySvg`'s `overlay`) feeds the same maths.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";

type ViewState = { s: number; cx: number; cy: number };
type Pt = { x: number; y: number };
type Gesture = { dist: number; mid: Pt; view: ViewState };

export function useSvgZoom(_svgRef: unknown, width: number, height: number, maxScale = 4, _mount?: unknown) {
  const viewRef = useRef<ViewState>({ s: 1, cx: width / 2, cy: height / 2 });
  const [view, setViewState] = useState<ViewState>(() => ({ s: 1, cx: width / 2, cy: height / 2 }));
  const box = useRef({ width: 1, height: 1 });
  const gesture = useRef<Gesture | null>(null);
  const lastPan = useRef<Pt | null>(null);

  const setView = useCallback(
    (next: ViewState) => {
      const s = Math.min(maxScale, Math.max(1, next.s));
      const hw = width / (2 * s);
      const hh = height / (2 * s);
      const clamped = {
        s,
        cx: Math.min(width - hw, Math.max(hw, next.cx)),
        cy: Math.min(height - hh, Math.max(hh, next.cy)),
      };
      viewRef.current = clamped;
      setViewState(clamped);
    },
    [width, height, maxScale],
  );

  const norm = useCallback((x: number, y: number): Pt => {
    const r = box.current;
    if (r.width <= 1 || r.height <= 1) return { x: 0.5, y: 0.5 };
    return { x: x / r.width, y: y / r.height };
  }, []);

  const zoomFrom = useCallback(
    (from: ViewState, factor: number, at: Pt): ViewState => {
      const vw = width / from.s;
      const vh = height / from.s;
      const px = from.cx - vw / 2 + at.x * vw;
      const py = from.cy - vh / 2 + at.y * vh;
      const s = Math.min(maxScale, Math.max(1, from.s * factor));
      const vw2 = width / s;
      const vh2 = height / s;
      return { s, cx: px - at.x * vw2 + vw2 / 2, cy: py - at.y * vh2 + vh2 / 2 };
    },
    [width, height, maxScale],
  );

  const zoomBy = useCallback((factor: number) => setView(zoomFrom(viewRef.current, factor, { x: 0.5, y: 0.5 })), [setView, zoomFrom]);
  const reset = useCallback(() => setView({ s: 1, cx: width / 2, cy: height / 2 }), [setView, width, height]);

  const handlers = useRef({ setView, zoomFrom, norm, width, height });
  handlers.current = { setView, zoomFrom, norm, width, height };

  const pan = useMemo(() => {
    const touchesOf = (e: GestureResponderEvent): Pt[] =>
      e.nativeEvent.touches.map((t) => ({ x: t.locationX, y: t.locationY }));
    const startPinch = (pts: Pt[]) => {
      const [a, b] = pts;
      if (!a || !b) return;
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: handlers.current.norm((a.x + b.x) / 2, (a.y + b.y) / 2),
        view: viewRef.current,
      };
    };
    const wants = (e: GestureResponderEvent) => e.nativeEvent.touches.length >= 2 || viewRef.current.s > 1;
    return PanResponder.create({
      onStartShouldSetPanResponder: wants,
      onMoveShouldSetPanResponder: wants,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const pts = touchesOf(e);
        if (pts.length >= 2) startPinch(pts);
        else if (pts[0]) lastPan.current = pts[0];
      },
      onPanResponderMove: (e) => {
        const { setView: set, zoomFrom: zf, norm: nm, width: w, height: h } = handlers.current;
        const pts = touchesOf(e);
        if (pts.length >= 2) {
          if (!gesture.current) startPinch(pts);
          const g = gesture.current!;
          const [a, b] = pts as [Pt, Pt];
          const mid = nm((a.x + b.x) / 2, (a.y + b.y) / 2);
          const zoomed = zf(g.view, Math.hypot(a.x - b.x, a.y - b.y) / g.dist, g.mid);
          set({
            s: zoomed.s,
            cx: zoomed.cx - (mid.x - g.mid.x) * (w / zoomed.s),
            cy: zoomed.cy - (mid.y - g.mid.y) * (h / zoomed.s),
          });
          lastPan.current = null;
          return;
        }
        gesture.current = null;
        const p = pts[0];
        const last = lastPan.current;
        if (p && last && viewRef.current.s > 1) {
          const v = viewRef.current;
          set({
            s: v.s,
            cx: v.cx - ((p.x - last.x) / box.current.width) * (w / v.s),
            cy: v.cy - ((p.y - last.y) / box.current.height) * (h / v.s),
          });
        }
        lastPan.current = p ?? null;
      },
      onPanResponderRelease: () => {
        gesture.current = null;
        lastPan.current = null;
      },
      onPanResponderTerminate: () => {
        gesture.current = null;
        lastPan.current = null;
      },
    });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    box.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
  };

  const vw = width / view.s;
  const vh = height / view.s;

  return {
    viewBox: `${(view.cx - vw / 2).toFixed(2)} ${(view.cy - vh / 2).toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`,
    scale: view.s,
    zoomIn: () => zoomBy(1.4),
    zoomOut: () => zoomBy(1 / 1.4),
    reset,
    /** The touch layer: pass as `StudySvg`'s `overlay`. */
    layer: <View className="absolute inset-0" onLayout={onLayout} {...pan.panHandlers} />,
  };
}
