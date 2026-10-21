import { createContext, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { wheelSkyBackdrop } from "@vedic-patro/design-tokens/classes/wheel-classes";
import { fullscreenIcon, minimizeIcon, rotateCcwIcon } from "../icons";

/** The app passes safe-area insets for its fullscreen modal; the website has none to give. */
export const ZoomStageInsets = createContext({ top: 0, bottom: 0 }).Provider;

const MAX_ZOOM = 6;
const STAGE_BTN =
  "flex h-9 w-9 items-center justify-center rounded-full border border-wheel-control-border bg-wheel-control text-[var(--w-ink)] shadow-lg transition-colors hover:border-[var(--w-accent)]";
const STAGE_ICON = "!text-white";

type View = { zoom: number; x: number; y: number };

/**
 * Pinch (two fingers), mouse wheel / trackpad, and drag-to-pan once zoomed —
 * written straight to the content's transform, so a gesture never re-renders
 * the chart. Taps and clicks still reach the chart; a click that ends a drag
 * is swallowed.
 */
function ZoomSurface({
  children,
  fill,
  onZoomed,
  resetRef,
}: {
  children: ReactNode;
  fill: boolean;
  onZoomed: (zoomed: boolean) => void;
  resetRef: { current: (() => void) | null };
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ zoom: 1, x: 0, y: 0 });
  const zoomedRef = useRef(false);
  const onZoomedRef = useRef(onZoomed);
  onZoomedRef.current = onZoomed;

  const apply = useCallback((zoom: number, x: number, y: number) => {
    const el = surfaceRef.current;
    const z = Math.max(1, Math.min(MAX_ZOOM, zoom));
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    /* The chart's edge can come to the middle of the stage, no further. */
    const mx = (w * z) / 2;
    const my = (h * z) / 2;
    const nx = z === 1 ? 0 : Math.max(-mx, Math.min(mx, x));
    const ny = z === 1 ? 0 : Math.max(-my, Math.min(my, y));
    view.current = { zoom: z, x: nx, y: ny };
    if (contentRef.current) contentRef.current.style.transform = `translate(${nx}px, ${ny}px) scale(${z})`;
    if (el) el.style.touchAction = z > 1 || fill ? "none" : "pan-y";
    const zoomed = z > 1.01;
    if (zoomed !== zoomedRef.current) {
      zoomedRef.current = zoomed;
      onZoomedRef.current(zoomed);
    }
  }, [fill]);

  resetRef.current = () => apply(1, 0, 0);

  /* Zoom by `ratio` keeping the point at (fx, fy) — surface coords — still. */
  const zoomAbout = useCallback(
    (from: View, zoom: number, fx: number, fy: number, dx = 0, dy = 0) => {
      const el = surfaceRef.current;
      if (!el) return;
      const z = Math.max(1, Math.min(MAX_ZOOM, zoom));
      const ratio = z / from.zoom;
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      apply(z, fx - cx - ratio * (fx - cx - from.x) + dx, fy - cy - ratio * (fy - cy - from.y) + dy);
    },
    [apply],
  );

  useLayoutEffect(() => {
    apply(view.current.zoom, view.current.x, view.current.y);
  }, [apply]);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const local = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    };

    /* Mouse wheel and trackpad (a trackpad pinch arrives as ctrl + wheel). */
    const onWheel = (e: WheelEvent) => {
      const fine = window.matchMedia("(pointer: fine)").matches;
      if (!fine && !e.ctrlKey) return;
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16;
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= 400;
      const p = local(e.clientX, e.clientY);
      zoomAbout(view.current, view.current.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)), p.x, p.y);
    };

    /* Touch: two fingers pinch, one finger pans once zoomed. At 1× a
       one-finger drag is left alone so the page still scrolls. */
    let pinch: { dist0: number; from: View; fx: number; fy: number } | null = null;
    let pan: { x0: number; y0: number; from: View } | null = null;
    const two = (t: TouchList) => {
      const a = local(t[0]!.clientX, t[0]!.clientY);
      const b = local(t[1]!.clientX, t[1]!.clientY);
      return { dist: Math.hypot(b.x - a.x, b.y - a.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        const m = two(e.touches);
        pinch = { dist0: m.dist, from: { ...view.current }, fx: m.x, fy: m.y };
        pan = null;
      } else if (e.touches.length === 1) {
        pan = { x0: e.touches[0]!.clientX, y0: e.touches[0]!.clientY, from: { ...view.current } };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && pinch) {
        e.preventDefault();
        const m = two(e.touches);
        if (m.dist <= 0 || pinch.dist0 <= 0) return;
        zoomAbout(pinch.from, pinch.from.zoom * (m.dist / pinch.dist0), pinch.fx, pinch.fy, m.x - pinch.fx, m.y - pinch.fy);
        return;
      }
      if (e.touches.length === 1 && pan && view.current.zoom > 1) {
        e.preventDefault();
        const t = e.touches[0]!;
        apply(view.current.zoom, pan.from.x + (t.clientX - pan.x0), pan.from.y + (t.clientY - pan.y0));
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      pinch = null;
      /* A finger of a pinch lifted: the other one pans on from here. */
      pan =
        e.touches.length === 1
          ? { x0: e.touches[0]!.clientX, y0: e.touches[0]!.clientY, from: { ...view.current } }
          : null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [apply, zoomAbout]);

  /* Mouse / pen drag pans once zoomed. Capture waits for real movement so a
     plain click still lands on the chart. */
  const drag = useRef<{ id: number; x0: number; y0: number; from: View; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || e.button !== 0 || view.current.zoom <= 1) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, from: { ...view.current }, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    apply(d.from.zoom, d.from.x + dx, d.from.y + dy);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) swallowClick.current = true;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative flex w-full select-none items-center justify-center overflow-hidden",
        fill ? "h-full" : "p-2 sm:p-3",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div ref={contentRef} className="flex h-full w-full origin-center items-center justify-center will-change-transform">
        {children}
      </div>
    </div>
  );
}

type ZoomStageProps = {
  /** The chart; `fullscreen` lets it drop width caps meant for the page. */
  children: (fullscreen: boolean) => ReactNode;
  className?: string;
};

/**
 * A chart on the panchanga wheel's sky that zooms by pinch or mouse wheel,
 * pans once zoomed, and opens full screen (still zoomable) from its corner.
 */
export function ZoomStage({ children, className }: ZoomStageProps) {
  const { t } = useLocale();
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [fsZoomed, setFsZoomed] = useState(false);
  const resetInline = useRef<(() => void) | null>(null);
  const resetFs = useRef<(() => void) | null>(null);

  const open = useCallback(() => {
    resetInline.current?.();
    setFullscreen(true);
  }, []);
  const close = useCallback(() => {
    setFsZoomed(false);
    setFullscreen(false);
  }, []);

  /* The page underneath must not scroll, and Escape gets out. */
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, fullscreen]);

  const labels = { open: t("ui.zoom.fullscreen"), close: t("ui.zoom.exit_fullscreen"), reset: t("ui.zoom.reset") };

  const overlay = fullscreen ? (
    <div className={cn("pn-wheel fixed inset-0 z-[120] overflow-hidden", wheelSkyBackdrop)} role="dialog" aria-modal="true" aria-label={labels.open}>
      <div className="relative z-[1] flex h-full w-full flex-col pt-14 pb-2">
        <ZoomSurface fill onZoomed={setFsZoomed} resetRef={resetFs}>
          <div className="aspect-square" style={{ width: "min(calc(100vw - 16px), calc(100dvh - 72px))" }}>
            {children(true)}
          </div>
        </ZoomSurface>
      </div>
      <div className="absolute top-3 right-3 z-[2] flex items-center gap-1.5">
        {fsZoomed ? (
          <button type="button" className={STAGE_BTN} title={labels.reset} aria-label={labels.reset} onClick={() => resetFs.current?.()}>
            <Icon node={rotateCcwIcon} size={16} tone="foreground" className={STAGE_ICON} />
          </button>
        ) : null}
        <button type="button" className={STAGE_BTN} title={labels.close} aria-label={labels.close} onClick={close}>
          <Icon node={minimizeIcon} size={16} tone="foreground" className={STAGE_ICON} />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("pn-wheel relative overflow-hidden rounded-2xl border border-[var(--w-surface-border)]", wheelSkyBackdrop, className)}>
      <div className="relative z-[1]">
        <ZoomSurface fill={false} onZoomed={setZoomed} resetRef={resetInline}>
          {children(false)}
        </ZoomSurface>
      </div>
      <div className="absolute top-2 right-2 z-[2] flex items-center gap-1.5">
        {zoomed ? (
          <button type="button" className={STAGE_BTN} title={labels.reset} aria-label={labels.reset} onClick={() => resetInline.current?.()}>
            <Icon node={rotateCcwIcon} size={16} tone="foreground" className={STAGE_ICON} />
          </button>
        ) : null}
        <button type="button" className={STAGE_BTN} title={labels.open} aria-label={labels.open} onClick={open}>
          <Icon node={fullscreenIcon} size={16} tone="foreground" className={STAGE_ICON} />
        </button>
      </div>
      {overlay && typeof document !== "undefined" ? createPortal(overlay, document.body) : null}
    </div>
  );
}
