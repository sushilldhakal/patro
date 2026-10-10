/**
 * The bipolar rate slider, in rungs of {@link TIME_STEPS} rather than in
 * multiples — shared by {@link SkyTimeSheet} and the desktop transport row in
 * {@link AakashGocharSky} so dragging either one means the same thing.
 *
 * One notch is one rung, the sign is the direction, and 0 is paused. It used
 * to be a continuous logarithmic multiplier, which could land on ×43 — a
 * number that says nothing about what you are watching. Now every position on
 * it is a step you can name, and it is the same step पछाडि and अगाडि move by.
 */

import { nearestStepIndex, TIME_STEPS } from "@/lib/sky3d/time-steps";

export function sliderToRate(slider: number): number {
  const notch = Math.round(slider);
  if (notch === 0) return 0;
  const index = Math.min(TIME_STEPS.length - 1, Math.abs(notch) - 1);
  return Math.sign(notch) * TIME_STEPS[index].seconds;
}

export function rateToSlider(rate: number): number {
  if (rate === 0 || !Number.isFinite(rate)) return 0;
  return Math.sign(rate) * (nearestStepIndex(rate) + 1);
}

/** Notches either side of centre — one per rung. */
export const RATE_NOTCHES = TIME_STEPS.length;
