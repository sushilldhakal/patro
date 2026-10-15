import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { illustration, midnight, neutral, withAlpha } from "@vedic-patro/design-tokens";
import {
  COMPASS_DIAL_SIZE,
  COMPASS_ICON_SIZE,
  beginCompassGesture,
  compassGestureIsTap,
  moveCompassGesture,
  useCompassDial,
  type CompassGesture,
} from "@vedic-patro/features/sky3d";
import type { CompassControlProps } from "../contract";

const RADIUS = COMPASS_DIAL_SIZE / 2;

export function CompassControl({
  heading,
  onHeadingChange,
  gyroMode,
  cameraOn,
  onTap,
  onManualDrag,
  bottom = 12,
  visible = true,
  renderNeedle,
  renderCamera,
}: CompassControlProps) {
  const dial = useCompassDial(heading);
  const sensorActive = gyroMode || cameraOn;
  const gesture = useRef<CompassGesture | null>(null);
  const pointerId = useRef<number | null>(null);
  const glyphColor = cameraOn ? illustration.green58 : gyroMode ? illustration.amber61 : withAlpha(neutral.white, 0.8);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button != null && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    pointerId.current = e.pointerId;
    gesture.current = beginCompassGesture(e.clientX, e.clientY, rect.left + rect.width / 2, rect.top + rect.height / 2, heading);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId || !gesture.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const next = moveCompassGesture(
      gesture.current,
      e.clientX,
      e.clientY,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      sensorActive,
    );
    gesture.current = next.gesture;
    if (next.manualDrag) onManualDrag();
    if (next.heading != null) onHeadingChange(next.heading);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId || !gesture.current) return;
    pointerId.current = null;
    if (compassGestureIsTap(gesture.current)) onTap();
  };

  if (!visible) return null;

  return (
    <div
      data-sky-controls
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute z-20 flex items-center justify-center"
      style={{
        width: COMPASS_DIAL_SIZE,
        height: COMPASS_DIAL_SIZE,
        bottom,
        left: "50%",
        marginLeft: -RADIUS,
        touchAction: "none",
        cursor: sensorActive ? "default" : "grab",
        userSelect: "none",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[7px] border-x-transparent"
        style={{ top: -4, borderBottomColor: sensorActive ? illustration.amber61 : withAlpha(neutral.white, 0.75) }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: COMPASS_ICON_SIZE, height: COMPASS_ICON_SIZE, color: glyphColor }}
      >
        {gyroMode ? renderCamera(glyphColor) : renderNeedle(glyphColor)}
      </span>
      {dial.dots.map((p) => (
        <span
          key={p.az}
          className="pointer-events-none absolute size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40"
          style={{ left: p.x, top: p.y }}
        />
      ))}
      {dial.points.map((p) => (
        <span
          key={p.az}
          className="pointer-events-none absolute flex h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center text-diagram-sm font-bold"
          style={{ left: p.x, top: p.y, color: p.north ? midnight.vermilion : withAlpha(neutral.white, 0.85) }}
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}
