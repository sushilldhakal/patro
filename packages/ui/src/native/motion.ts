import { motion } from "@vedic-patro/design-tokens";
/* Safe on binaries built before expo-haptics was added: it loads its native module with
   `requireOptionalNativeModule`, so a missing one is null rather than a throw at import,
   and each call rejects instead — which `fire` swallows. An over-the-air update to such a
   build just doesn't vibrate. */
import * as Haptics from "expo-haptics";
import { Easing, ReduceMotion, cubicBezier, useReducedMotion } from "react-native-reanimated";

const easeOut = motion.native.easeOut;
const easeInOut = motion.native.easeInOut;
const easeSheet = motion.native.easeSheet;

/** `withTiming` / `.easing(...)`. Strong ease-out for entering and exiting. */
export const EASE_OUT = Easing.bezier(easeOut[0], easeOut[1], easeOut[2], easeOut[3]);
/** `withTiming` / `.easing(...)`. On-screen movement. */
export const EASE_IN_OUT = Easing.bezier(easeInOut[0], easeInOut[1], easeInOut[2], easeInOut[3]);
/** `withTiming` / `.easing(...)`. iOS sheet curve. */
export const EASE_SHEET = Easing.bezier(easeSheet[0], easeSheet[1], easeSheet[2], easeSheet[3]);

/** `transitionTimingFunction` / `animationTimingFunction`. */
export const CSS_EASE_OUT = cubicBezier(easeOut[0], easeOut[1], easeOut[2], easeOut[3]);
/** `transitionTimingFunction` / `animationTimingFunction`. */
export const CSS_EASE_IN_OUT = cubicBezier(easeInOut[0], easeInOut[1], easeInOut[2], easeInOut[3]);

function spring(config: { readonly duration: number; readonly dampingRatio: number }) {
  return {
    duration: config.duration,
    dampingRatio: config.dampingRatio,
    reduceMotion: ReduceMotion.System,
  };
}

/** Default settle, no overshoot. */
export const SPRING_SETTLE = spring(motion.native.spring.settle);
/** Reposition / snap back after a drag. */
export const SPRING_SNAP = spring(motion.native.spring.snap);
/** Sheet and drawer. */
export const SPRING_SHEET = spring(motion.native.spring.sheet);

export const DURATION = motion.duration;
export const PRESS_SCALE = motion.native.pressScale;
export const ENTER_SCALE = motion.native.enterScale;
export const SHIFT = motion.native.shift;

/** True when the OS asks for reduced motion. Scale and translation should drop; fades stay. */
export function useReducedMotionPref(): boolean {
  return useReducedMotion();
}

function fire(run: () => Promise<void>): void {
  try {
    void Promise.resolve(run()).catch(() => {});
  } catch {
    // Missing on web, simulators, and devices without a vibrator.
  }
}

/** One haptic per user action. Never the only feedback — the visual has to stand alone. */
export const haptics = {
  /** A value ticks past a step: picker, stepper, segmented control. */
  tick(): void {
    fire(() => Haptics.selectionAsync());
  },
  /** Something snaps home: a sheet detent, a drag commit. */
  snap(): void {
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  success(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  error(): void {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
