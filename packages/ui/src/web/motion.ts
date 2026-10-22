import { motion } from "@vedic-patro/design-tokens";

const easeOut = motion.native.easeOut;
const easeInOut = motion.native.easeInOut;
const easeSheet = motion.native.easeSheet;

/** Plain bezier control points. The website has no Reanimated `Easing`. */
export const EASE_OUT = easeOut;
export const EASE_IN_OUT = easeInOut;
export const EASE_SHEET = easeSheet;

export const CSS_EASE_OUT = `cubic-bezier(${easeOut.join(", ")})`;
export const CSS_EASE_IN_OUT = `cubic-bezier(${easeInOut.join(", ")})`;

function spring(config: { readonly duration: number; readonly dampingRatio: number }) {
  return {
    duration: config.duration,
    dampingRatio: config.dampingRatio,
    reduceMotion: "system" as const,
  };
}

export const SPRING_SETTLE = spring(motion.native.spring.settle);
export const SPRING_SNAP = spring(motion.native.spring.snap);
export const SPRING_SHEET = spring(motion.native.spring.sheet);

export const DURATION = motion.duration;
export const PRESS_SCALE = motion.native.pressScale;
export const ENTER_SCALE = motion.native.enterScale;
export const SHIFT = motion.native.shift;

/** The website reads this as a plain boolean. Reduced motion stays off until a screen asks. */
export function useReducedMotionPref(): boolean {
  return false;
}

/** The website never vibrates. */
export const haptics = {
  tick(): void {},
  snap(): void {},
  success(): void {},
  error(): void {},
};
