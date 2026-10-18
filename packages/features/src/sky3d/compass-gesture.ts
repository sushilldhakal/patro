import { normalizeDeg } from "@vedic-patro/domain/astronomy/sky3d/geocentric-model";

/** A drag shorter than this, released quickly, reads as a tap rather than a spin. */
export const COMPASS_TAP_SLOP_PX = 6;
export const COMPASS_ICON_SIZE = 20;

export type CompassGesture = {
  startAngle: number;
  startHeading: number;
  startX: number;
  startY: number;
  moved: number;
  cancelledSensor: boolean;
};

/** Pointer angle in degrees, atan2 from the dial centre. */
export function compassPointerAngle(x: number, y: number, cx: number, cy: number): number {
  return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
}

export function beginCompassGesture(x: number, y: number, cx: number, cy: number, heading: number): CompassGesture {
  return {
    startAngle: compassPointerAngle(x, y, cx, cy),
    startHeading: heading,
    startX: x,
    startY: y,
    moved: 0,
    cancelledSensor: false,
  };
}

/**
 * Straight-line pixels, not arc length. A tap on the centre needle is a few
 * pixels of jitter, but atan2 there swings tens of degrees for a 1px wobble.
 */
export function moveCompassGesture(
  gesture: CompassGesture,
  x: number,
  y: number,
  cx: number,
  cy: number,
  sensorActive: boolean,
): { gesture: CompassGesture; heading: number | null; manualDrag: boolean } {
  const angle = compassPointerAngle(x, y, cx, cy);
  const moved = Math.max(gesture.moved, Math.hypot(x - gesture.startX, y - gesture.startY));
  if (sensorActive) {
    const manualDrag = !gesture.cancelledSensor && moved > COMPASS_TAP_SLOP_PX;
    return {
      gesture: { ...gesture, moved, cancelledSensor: gesture.cancelledSensor || manualDrag },
      heading: null,
      manualDrag,
    };
  }
  const delta = ((angle - gesture.startAngle + 540) % 360) - 180;
  return {
    gesture: { ...gesture, moved },
    heading: normalizeDeg(gesture.startHeading + delta),
    manualDrag: false,
  };
}

export function compassGestureIsTap(gesture: CompassGesture): boolean {
  return gesture.moved <= COMPASS_TAP_SLOP_PX && !gesture.cancelledSensor;
}
