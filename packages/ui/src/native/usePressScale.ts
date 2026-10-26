import { useMemo } from "react";
import type { GestureResponderEvent } from "react-native";
import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { PRESS_SCALE, SPRING_SNAP, useReducedMotionPref } from "./motion";

type PressEvent = (event: GestureResponderEvent) => void;

/**
 * Press feedback that runs on the UI thread. The shared value is set straight from the press
 * handlers, so a press never re-renders the component and the spring can be grabbed mid-flight
 * (press, release, press again) without a jump.
 *
 * Spread `handlers` on a `Pressable` (keeps its accessibility and scroll-cancel behaviour) and put
 * `animatedStyle` on an `Animated` view. Your own `onPressIn` / `onPressOut` are called too.
 * Reduce Motion keeps the handlers and drops the scale.
 */
export function usePressScale(options: {
  scale?: number;
  disabled?: boolean;
  onPressIn?: PressEvent;
  onPressOut?: PressEvent;
} = {}) {
  const { scale = PRESS_SCALE, disabled = false, onPressIn, onPressOut } = options;
  const reduced = useReducedMotionPref();
  const value = useSharedValue(1);
  const active = !reduced && !disabled;

  const handlers = useMemo(
    () => ({
      onPressIn: (event: GestureResponderEvent) => {
        if (active) value.set(withSpring(scale, SPRING_SNAP));
        onPressIn?.(event);
      },
      onPressOut: (event: GestureResponderEvent) => {
        if (active) value.set(withSpring(1, SPRING_SNAP));
        onPressOut?.(event);
      },
    }),
    [active, scale, value, onPressIn, onPressOut],
  );

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: value.get() }] }));

  return { scale: value, animatedStyle, handlers };
}
