import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { G } from "react-native-svg";
import Animated from "react-native-reanimated";

export const AnimatedG = Animated.createAnimatedComponent(G);

export function useReduceMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setEnabled);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setEnabled);
    return () => sub.remove();
  }, []);
  return enabled;
}

export function usePivotTransform(
  pivot: { x: number; y: number },
  rotation: SharedValue<number> | null,
  scale: SharedValue<number> | null,
) {
  return useAnimatedProps(() => {
    const transform = [
      { translateX: pivot.x },
      { translateY: pivot.y },
      ...(rotation ? [{ rotate: `${rotation.value}deg` }] : []),
      ...(scale ? [{ scale: scale.value }] : []),
      { translateX: -pivot.x },
      { translateY: -pivot.y },
    ];
    return { transform };
  });
}

export function useOpacityPulse(value: SharedValue<number>) {
  return useAnimatedProps(() => ({ opacity: value.value }));
}

export function useSpin(
  value: SharedValue<number>,
  degrees: number,
  durationMs: number,
  reduceMotion: boolean,
) {
  useEffect(() => {
    if (reduceMotion) {
      value.value = 0;
      return;
    }
    value.value = withRepeat(
      withTiming(degrees, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [degrees, durationMs, reduceMotion, value]);
}

export function useScalePulse(
  value: SharedValue<number>,
  peak: number,
  halfDurationMs: number,
  reduceMotion: boolean,
) {
  useEffect(() => {
    if (reduceMotion) {
      value.value = 1;
      return;
    }
    value.value = withRepeat(
      withTiming(peak, { duration: halfDurationMs, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [halfDurationMs, peak, reduceMotion, value]);
}

export function useOpacityOscillation(
  value: SharedValue<number>,
  peak: number,
  rest: number,
  halfDurationMs: number,
  reduceMotion: boolean,
) {
  useEffect(() => {
    if (reduceMotion) {
      value.value = (peak + rest) / 2;
      return;
    }
    value.value = rest;
    value.value = withRepeat(
      withTiming(peak, { duration: halfDurationMs, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [halfDurationMs, peak, reduceMotion, rest, value]);
}
