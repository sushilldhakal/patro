import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SPRING_SNAP, haptics } from "./motion";

type Axis = "x" | "y" | "both";

/** How far ahead of the finger a release is judged, in seconds: a flick lands where it was headed. */
const PROJECTION_S = 0.2;
/** iOS-style resistance: how much of the overshoot shows. Lower is stiffer. */
const RUBBER_BAND = 0.55;
/** Past an end, the drag can show at most about this much overshoot, however far the finger goes. */
const RUBBER_REACH = 120;
/** Finger movement before the pan claims the touch, so taps and the cross-axis scroll still work. */
const ACTIVATE = 8;

function nearest(points: readonly number[], at: number): number {
  "worklet";
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i]! - at) < Math.abs(points[best]! - at)) best = i;
  }
  return best;
}

/** Position under the finger: 1:1 inside [min, max], increasingly stiff beyond either end. */
function resist(value: number, min: number, max: number): number {
  "worklet";
  const over = value < min ? min - value : value > max ? value - max : 0;
  if (over === 0) return value;
  const shown = (1 - 1 / ((over * RUBBER_BAND) / RUBBER_REACH + 1)) * RUBBER_REACH;
  return value < min ? min - shown : max + shown;
}

/**
 * A drag that follows the finger, resists past its ends, and on release springs to the snap point
 * the flick was headed for, carrying the release velocity into the spring. Interruptible: touching
 * it mid-settle takes over from where it is.
 *
 * `snapPoints` are offsets from the resting position, per axis, so a bottom sheet is
 * `{ axis: "y", snapPoints: { y: [0, -240, -520] } }`. An axis without points does not move.
 * `onSnap` runs on the JS thread with the axis and the index chosen, once per release.
 *
 * Wrap the thing that moves in a `GestureDetector gesture={gesture}` and give an `Animated` view
 * `style={style}`; read `x` / `y` with `useGestureProgress` to drive anything else.
 */
export function useSpringPan(options: {
  axis?: Axis;
  snapPoints: { x?: readonly number[]; y?: readonly number[] };
  /** Where the thing rests to begin with, as an index into the snap points. Default 0. */
  initialIndex?: number;
  onSnap?: (axis: "x" | "y", index: number) => void;
}) {
  const { axis = "both", snapPoints, initialIndex = 0, onSnap } = options;
  const xs = snapPoints.x ?? [0];
  const ys = snapPoints.y ?? [0];
  const x = useSharedValue(xs[initialIndex] ?? xs[0]!);
  const y = useSharedValue(ys[initialIndex] ?? ys[0]!);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const xKey = xs.join(",");
  const yKey = ys.join(",");

  const gesture = useMemo(() => {
    const moveX = axis !== "y" && xs.length > 0;
    const moveY = axis !== "x" && ys.length > 0;
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const pan = Gesture.Pan()
      .onBegin(() => {
        cancelAnimation(x);
        cancelAnimation(y);
        startX.set(x.get());
        startY.set(y.get());
      })
      .onUpdate((e) => {
        if (moveX) x.set(resist(startX.get() + e.translationX, xMin, xMax));
        if (moveY) y.set(resist(startY.get() + e.translationY, yMin, yMax));
      })
      .onEnd((e) => {
        if (moveX) {
          const index = nearest(xs, x.get() + e.velocityX * PROJECTION_S);
          x.set(withSpring(xs[index]!, { ...SPRING_SNAP, velocity: e.velocityX }));
          if (onSnap) scheduleOnRN(onSnap, "x", index);
        }
        if (moveY) {
          const index = nearest(ys, y.get() + e.velocityY * PROJECTION_S);
          y.set(withSpring(ys[index]!, { ...SPRING_SNAP, velocity: e.velocityY }));
          if (onSnap) scheduleOnRN(onSnap, "y", index);
        }
        scheduleOnRN(haptics.snap);
      });

    // Claim the touch only for movement along the axis, so the other axis stays free to scroll.
    if (axis === "x") pan.activeOffsetX([-ACTIVATE, ACTIVATE]).failOffsetY([-ACTIVATE, ACTIVATE]);
    if (axis === "y") pan.activeOffsetY([-ACTIVATE, ACTIVATE]).failOffsetX([-ACTIVATE, ACTIVATE]);
    return pan;
    // The snap arrays are compared by value (xKey / yKey), not identity: callers pass literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, xKey, yKey, onSnap, x, y, startX, startY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }));

  /** Spring to a snap point from code (a button that opens the sheet). */
  const snapTo = (target: { x?: number; y?: number }) => {
    if (target.x !== undefined) x.set(withSpring(xs[target.x] ?? x.get(), SPRING_SNAP));
    if (target.y !== undefined) y.set(withSpring(ys[target.y] ?? y.get(), SPRING_SNAP));
  };

  return { gesture, x, y, style, snapTo };
}
