import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  type AppStateStatus,
} from "react-native";

/** CSS `ease-in-out` from the web favicon and loader SVGs. */
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);

function appIsActive(state: AppStateStatus | string | null | undefined): boolean {
  return state === "active" || state === "unknown";
}

/**
 * True while motion should run. Reduced-motion and a backgrounded app both
 * hold the artwork on its resting frame so the UI thread can idle.
 */
export function useBrandMotionEnabled(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(appIsActive(AppState.currentState));

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const appSub = AppState.addEventListener("change", (next) => setActive(appIsActive(next)));
    return () => {
      mounted = false;
      reduceSub.remove();
      appSub.remove();
    };
  }, []);

  return active && !reduceMotion;
}

/** Linear spin. `degrees` is the sweep of one revolution (negative spins the other way). */
export function useRotate(degrees: number, durationMs: number, enabled: boolean) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      progress.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [durationMs, enabled, progress]);

  return useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", `${degrees}deg`],
      }),
    [degrees, progress],
  );
}

/** Scale 1 → peak → 1. `halfDurationMs` is one half of the web keyframe cycle. */
export function useScalePulse(peak: number, halfDurationMs: number, enabled: boolean) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      scale.setValue(1);
      return;
    }
    const step = (toValue: number) =>
      Animated.timing(scale, {
        toValue,
        duration: halfDurationMs,
        easing: EASE_IN_OUT,
        useNativeDriver: true,
      });
    const anim = Animated.loop(Animated.sequence([step(peak), step(1)]));
    anim.start();
    return () => anim.stop();
  }, [enabled, halfDurationMs, peak, scale]);

  return scale;
}

/**
 * Opacity rest → peak → rest. `reduced` is the frame used when motion is off
 * (the SVG's un-animated opacity, which is not always `rest`).
 */
export function useOpacityPulse(
  rest: number,
  peak: number,
  halfDurationMs: number,
  enabled: boolean,
  reduced = rest,
) {
  const opacity = useRef(new Animated.Value(enabled ? rest : reduced)).current;

  useEffect(() => {
    if (!enabled) {
      opacity.setValue(reduced);
      return;
    }
    opacity.setValue(rest);
    const step = (toValue: number) =>
      Animated.timing(opacity, {
        toValue,
        duration: halfDurationMs,
        easing: EASE_IN_OUT,
        useNativeDriver: true,
      });
    const anim = Animated.loop(Animated.sequence([step(peak), step(rest)]));
    anim.start();
    return () => anim.stop();
  }, [enabled, halfDurationMs, opacity, peak, reduced, rest]);

  return opacity;
}
