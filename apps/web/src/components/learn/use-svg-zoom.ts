import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

/**
 * Two-finger zoom for a learn diagram drawn in SVG.
 *
 * Zooms by narrowing the SVG's own viewBox, so text and strokes stay crisp at
 * any scale. Pinch with two fingers on a phone, pinch on a trackpad (the browser
 * sends it as a ctrl + wheel) or Ctrl + scroll with a mouse; once zoomed in, one
 * finger or the mouse drags the view around. At 1× the diagram leaves one-finger
 * vertical swipes to the page so it never traps scrolling.
 */

type View = { s: number; cx: number; cy: number };
type Gesture = { dist: number; mid: { x: number; y: number }; view: View };

export function useSvgZoom(svgRef: RefObject<SVGSVGElement | null>, width: number, height: number, maxScale = 4) {
  const viewRef = useRef<View>({ s: 1, cx: width / 2, cy: height / 2 });
  const [view, setViewState] = useState<View>(() => ({ s: 1, cx: width / 2, cy: height / 2 }));
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastPan = useRef<{ x: number; y: number } | null>(null);

  const setView = useCallback(
    (next: View) => {
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

  /** Client point → 0..1 across the drawn SVG box. */
  const norm = useCallback((clientX: number, clientY: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return { x: 0.5, y: 0.5 };
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  }, [svgRef]);

  /** Scale `from` by `factor`, keeping the SVG point under `at` (0..1) where it is. */
  const zoomFrom = useCallback(
    (from: View, factor: number, at: { x: number; y: number }) => {
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

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    gesture.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: norm((a.x + b.x) / 2, (a.y + b.y) / 2),
      view: viewRef.current,
    };
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      startPinch();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } else if (pointers.current.size === 1 && viewRef.current.s > 1) {
      lastPan.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size >= 2 && g) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const mid = norm((a.x + b.x) / 2, (a.y + b.y) / 2);
      const zoomed = zoomFrom(g.view, Math.hypot(a.x - b.x, a.y - b.y) / g.dist, g.mid);
      /* Moving both fingers together also drags the view. */
      setView({
        s: zoomed.s,
        cx: zoomed.cx - (mid.x - g.mid.x) * (width / zoomed.s),
        cy: zoomed.cy - (mid.y - g.mid.y) * (height / zoomed.s),
      });
      return;
    }
    const last = lastPan.current;
    const r = svgRef.current?.getBoundingClientRect();
    if (last && r && viewRef.current.s > 1) {
      const v = viewRef.current;
      setView({
        s: v.s,
        cx: v.cx - ((e.clientX - last.x) / r.width) * (width / v.s),
        cy: v.cy - ((e.clientY - last.y) / r.height) * (height / v.s),
      });
      lastPan.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerEnd = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    gesture.current = null;
    lastPan.current = null;
    /* Lifting one finger of a pinch carries on as a one-finger drag. */
    const rest = [...pointers.current.values()][0];
    if (rest && viewRef.current.s > 1) lastPan.current = rest;
  };

  /* Trackpad pinch and Ctrl + scroll arrive as wheel events; they need a
     non-passive listener so the page itself does not zoom. */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setView(zoomFrom(viewRef.current, Math.exp(-e.deltaY * 0.01), norm(e.clientX, e.clientY)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [svgRef, norm, setView, zoomFrom]);

  const vw = width / view.s;
  const vh = height / view.s;

  return {
    viewBox: `${(view.cx - vw / 2).toFixed(2)} ${(view.cy - vh / 2).toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`,
    scale: view.s,
    zoomIn: () => zoomBy(1.4),
    zoomOut: () => zoomBy(1 / 1.4),
    reset,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      /* Clip to the frame: these diagrams draw labels past the viewBox at 1×. */
      style: { touchAction: view.s > 1 ? "none" : "pan-y", overflow: view.s > 1 ? "hidden" : undefined } as const,
    },
  };
}
