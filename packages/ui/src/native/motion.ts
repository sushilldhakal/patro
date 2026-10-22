import { Easing, ReduceMotion, cubicBezier, useReducedMotion } from "react-native-reanimated";

const easeOut = [0.23, 1, 0.32, 1] as const;
const easeInOut = [0.77, 0, 0.175, 1] as const;
const easeSheet = [0.32, 0.72, 0, 1] as const;

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
export const SPRING_SETTLE = spring({ duration: 400, dampingRatio: 1 });
/** Reposition / snap back after a drag. */
export const SPRING_SNAP = spring({ duration: 400, dampingRatio: 0.8 });
/** Sheet and drawer. */
export const SPRING_SHEET = spring({ duration: 300, dampingRatio: 0.8 });

export const DURATION = { fast: 120, standard: 200, slow: 320 } as const;
export const PRESS_SCALE = 0.97;
export const ENTER_SCALE = 0.95;
export const SHIFT = 8;

/** True when the OS asks for reduced motion. Scale and translation should drop; fades stay. */
export function useReducedMotionPref(): boolean {
  return useReducedMotion() === true;
}

type HapticApi = {
  selectionAsync(): Promise<void>;
  impactAsync(style: number): Promise<void>;
  notificationAsync(type: number): Promise<void>;
  ImpactFeedbackStyle: { readonly Light: number };
  NotificationFeedbackType: { readonly Success: number; readonly Error: number };
};

function loadHaptics(): HapticApi | null {
  try {
    const req = new Function("return typeof require === 'function' ? require : null")() as
      | ((id: string) => HapticApi)
      | null;
    if (!req) return null;
    return req("expo-haptics");
  } catch {
    return null;
  }
}

function fire(run: (api: HapticApi) => Promise<void>): void {
  try {
    const api = loadHaptics();
    if (!api) return;
    void Promise.resolve(run(api)).catch(() => {});
  } catch {
    // Missing on web, simulators, and devices without a vibrator.
  }
}

/** One haptic per user action. Never the only feedback — the visual has to stand alone. */
export const haptics = {
  tick(): void {
    fire((api) => api.selectionAsync());
  },
  snap(): void {
    fire((api) => api.impactAsync(api.ImpactFeedbackStyle.Light));
  },
  success(): void {
    fire((api) => api.notificationAsync(api.NotificationFeedbackType.Success));
  },
  error(): void {
    fire((api) => api.notificationAsync(api.NotificationFeedbackType.Error));
  },
};
