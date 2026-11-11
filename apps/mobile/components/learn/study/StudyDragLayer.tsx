/**
 * Dragging on a study's drawing, the way the website's studies do it.
 *
 * Each website study reads a pointer as
 * `(e.clientX - rect.left) / rect.width * viewBoxWidth` against its SVG's
 * `getBoundingClientRect()`. Here a transparent layer over the drawing takes
 * the touch, and hands the study's own handlers an event and an SVG "ref" that
 * answer those same questions — so the website's handler code runs unchanged.
 */
import { useMemo, useRef } from "react";
import { PanResponder, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";

type Rect = { left: number; top: number; width: number; height: number };
export type SvgRefShim = { current: { getBoundingClientRect: () => Rect } | null };
export type ShimPointerEvent = {
  clientX: number;
  clientY: number;
  pointerId: number;
  currentTarget: { setPointerCapture: (id: number) => void };
};

/** Stands in for `useRef<SVGSVGElement>(null)`: its rect is the drawing's laid-out size. */
export function useSvgRefShim(): SvgRefShim {
  const ref = useRef<SvgRefShim["current"]>(null);
  if (!ref.current) {
    const size = { width: 1, height: 1 };
    ref.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: size.width, height: size.height }) };
    (ref.current as unknown as { size: typeof size }).size = size;
  }
  return ref as SvgRefShim;
}

const toEvent = (e: GestureResponderEvent): ShimPointerEvent => ({
  clientX: e.nativeEvent.locationX,
  clientY: e.nativeEvent.locationY,
  pointerId: 0,
  currentTarget: { setPointerCapture: () => {} },
});

export function StudyDragLayer({
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  svgRef: SvgRefShim;
  onPointerDown?: (e: ShimPointerEvent) => void;
  onPointerMove?: (e: ShimPointerEvent) => void;
  onPointerUp?: (e: ShimPointerEvent) => void;
  onPointerCancel?: (e: ShimPointerEvent) => void;
}) {
  const handlers = useRef({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel });
  handlers.current = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        /* Once a finger is on the drawing, the article does not scroll under it. */
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => handlers.current.onPointerDown?.(toEvent(e)),
        onPanResponderMove: (e) => handlers.current.onPointerMove?.(toEvent(e)),
        onPanResponderRelease: (e) => handlers.current.onPointerUp?.(toEvent(e)),
        onPanResponderTerminate: (e) => (handlers.current.onPointerCancel ?? handlers.current.onPointerUp)?.(toEvent(e)),
      }),
    [],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const size = (svgRef.current as unknown as { size?: { width: number; height: number } } | null)?.size;
    if (size) {
      size.width = e.nativeEvent.layout.width;
      size.height = e.nativeEvent.layout.height;
    }
  };

  return <View className="absolute inset-0" onLayout={onLayout} {...pan.panHandlers} />;
}
