const easeOut = [0.23, 1, 0.32, 1] as const;
const easeInOut = [0.77, 0, 0.175, 1] as const;
const easeSheet = [0.32, 0.72, 0, 1] as const;

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

export const SPRING_SETTLE = spring({ duration: 400, dampingRatio: 1 });
export const SPRING_SNAP = spring({ duration: 400, dampingRatio: 0.8 });
export const SPRING_SHEET = spring({ duration: 300, dampingRatio: 0.8 });

export const DURATION = { fast: 120, standard: 200, slow: 320 } as const;
export const PRESS_SCALE = 0.97;
export const ENTER_SCALE = 0.95;
export const SHIFT = 8;

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
