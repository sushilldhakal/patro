/**
 * The sky's compass — a rotary dial docked bottom-centre over the canvas.
 *
 * The web counterpart of the mobile app's `CompassControl`: same behaviours,
 * `PanResponder` swapped for the Pointer Events API a browser already gives a
 * plain `<div>`.
 *
 * 1. **Drag it.** Spin the dial with a mouse or a finger and the camera's
 *    yaw follows, the same way turning a real compass card under a fixed
 *    lubber line does — N/E/S/W paint on the rotating disc, a fixed pointer
 *    at the top names whichever one you're currently facing.
 * 2. **Tap it.** Neither sensor is running yet — asks to raise the phone,
 *    then (after {@link AakashGocharSky}'s own timer) switches the dial over
 *    to `useDeviceOrientation`. The centre needle becomes a camera glyph the
 *    moment that happens, tapping *that* is what actually opens the lens.
 * 3. **While a sensor is driving it**, the dial is read-only — dragging it
 *    (or the sky itself) is the reader taking the wheel back, so the parent
 *    hears about that via {@link onManualDrag} and drops both sensors.
 */

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import compassNeedle from "@/assets/compass.svg?raw";
import cameraGlyph from "@/assets/camera.svg?raw";
import { COMPASS_DIAL_SIZE, useCompassDial } from "@vedic-patro/features/sky3d";
import { normalizeDeg } from "@vedic-patro/domain/sky3d/geocentric-model";

import { illustration, midnight, neutral, withAlpha } from "@vedic-patro/design-tokens";
const DIAL_SIZE = COMPASS_DIAL_SIZE;
const RADIUS = DIAL_SIZE / 2;
/** The centre glyph sits fixed — this is its own box, not the dial's. */
const ICON_SIZE = 20;
/** A drag shorter than this, released quickly, reads as a tap rather than a spin. */
const TAP_SLOP_PX = 6;


export function CompassControl({
  heading,
  onHeadingChange,
  gyroMode,
  cameraOn,
  onTap,
  onManualDrag,
  visible = true,
}: {
  /** Degrees, 0 = north, clockwise — the same frame the sky's own az is in. */
  heading: number;
  /** Fired continuously while dragging (ignored while a sensor is driving the dial). */
  onHeadingChange: (heading: number) => void;
  /** The device's own tilt/turn is driving `heading` — the dial is read-only. */
  gyroMode: boolean;
  /** The back camera is live behind the sky — always false unless {@link gyroMode} is too. */
  cameraOn: boolean;
  /** A clean tap (no real drag) — what it means depends on {@link gyroMode}/{@link cameraOn}, decided by the caller. */
  onTap: () => void;
  /** A real drag started while a sensor was driving the dial — the reader wants the wheel back. */
  onManualDrag: () => void;
  /** Hidden outside the horizon view — there is no "facing direction" from space or the globe. */
  visible?: boolean;
}) {
  const dial = useCompassDial(heading);
  const sensorActive = gyroMode || cameraOn;

  const gesture = useRef({
    startAngle: 0,
    startHeading: 0,
    startX: 0,
    startY: 0,
    moved: 0,
    pointerId: null as number | null,
    cancelledSensor: false,
  });

  const angleAt = (clientX: number, clientY: number, rect: DOMRect) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button != null && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    gesture.current = {
      startAngle: angleAt(e.clientX, e.clientY, rect),
      startHeading: heading,
      startX: e.clientX,
      startY: e.clientY,
      moved: 0,
      pointerId: e.pointerId,
      cancelledSensor: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const angle = angleAt(e.clientX, e.clientY, rect);
    // Straight-line pixels, not outer-edge arc. A tap on the centre needle is
    // a few pixels of jitter at most, but atan2 there swings tens of degrees
    // for a 1px wobble — measuring that as arc length at RADIUS made every
    // click on the icon look like a spin, so the gyro never armed.
    gesture.current.moved = Math.max(
      gesture.current.moved,
      Math.hypot(e.clientX - gesture.current.startX, e.clientY - gesture.current.startY),
    );
    if (sensorActive) {
      // A real drag on a sensor-driven dial is the reader grabbing the wheel
      // back — fired once per gesture, the instant it stops reading as a tap.
      if (!gesture.current.cancelledSensor && gesture.current.moved > TAP_SLOP_PX) {
        gesture.current.cancelledSensor = true;
        onManualDrag();
      }
      return;
    }
    const delta = ((angle - gesture.current.startAngle + 540) % 360) - 180;
    onHeadingChange(normalizeDeg(gesture.current.startHeading + delta));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== e.pointerId) return;
    gesture.current.pointerId = null;
    if (gesture.current.moved > TAP_SLOP_PX || gesture.current.cancelledSensor) return;
    onTap();
  };

  if (!visible) return null;

  return (
    <div
      data-sky-controls
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute bottom-3 z-20 flex items-center justify-center"
      style={{
        width: DIAL_SIZE,
        height: DIAL_SIZE,
        left: "50%",
        marginLeft: -RADIUS,
        touchAction: "none",
        cursor: sensorActive ? "default" : "grab",
        userSelect: "none",
      }}
    >
      {/* The lubber line: fixed, names whichever cardinal is currently faced. */}
      <div
        className="pointer-events-none absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[7px] border-x-transparent"
        style={{ borderBottomColor: sensorActive ? illustration.amber61 : withAlpha(neutral.white, 0.75) }}
      />

      {/* The centre glyph: it names nothing itself, so it never turns — only
          the ring of letters around it carries the heading. A needle until
          the device's own tilt takes over, then the lens it can now open. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          color: cameraOn ? illustration.green58 : gyroMode ? illustration.amber61 : withAlpha(neutral.white, 0.8),
        }}
        dangerouslySetInnerHTML={{ __html: gyroMode ? cameraGlyph : compassNeedle }}
      />

      {/* N/E/S/W orbit the needle as the heading changes — each span's own
          angle is `az - heading`, computed straight into its x/y, rather than
          spinning a shared parent. A rotated parent would spin the glyphs
          with it and put "N" on its side at a 90° heading; walking each one
          around the circle individually is what lets the position turn while
          the letter itself stays upright. */}
      {dial.dots.map((p) => {
        const { x, y } = p;
        return (
          <span
            key={p.az}
            className="pointer-events-none absolute size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40"
            style={{ left: x, top: y }}
          />
        );
      })}
      {dial.points.map((p) => {
        const { x, y } = p;
        return (
          <span
            key={p.az}
            className="pointer-events-none absolute flex h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center text-diagram-sm font-bold"
            style={{ left: x, top: y, color: p.north ? midnight.vermilion : withAlpha(neutral.white, 0.85) }}
          >
            {p.label}
          </span>
        );
      })}
    </div>
  );
}
