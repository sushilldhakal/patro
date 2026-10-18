import { nearestStepIndex, TIME_STEPS } from "@vedic-patro/domain/astronomy/sky3d/time-steps";
import type { SkyTimeTransport } from "./wheel-transport";

/** One notch is one rung of {@link TIME_STEPS}. The sign is the direction. 0 is paused. */
export function sliderToRate(slider: number): number {
  const notch = Math.round(slider);
  if (notch === 0) return 0;
  const index = Math.min(TIME_STEPS.length - 1, Math.abs(notch) - 1);
  return Math.sign(notch) * TIME_STEPS[index]!.seconds;
}

export function rateToSlider(rate: number): number {
  if (rate === 0 || !Number.isFinite(rate)) return 0;
  return Math.sign(rate) * (nearestStepIndex(rate) + 1);
}

/** Notches either side of centre — one per rung. */
export const RATE_NOTCHES = TIME_STEPS.length;

export function skySheetTransport(input: {
  timeRate?: number;
  onTimeRate?: (rate: number) => void;
  onTogglePlay?: () => void;
  onResetRate?: () => void;
  transport?: SkyTimeTransport;
  speedLabel: string;
  playing: boolean;
}): (SkyTimeTransport & { playing: boolean }) | null {
  if (input.transport) return { ...input.transport, playing: input.transport.rung !== 0 };
  if (input.timeRate === undefined || !input.onTimeRate || !input.onTogglePlay || !input.onResetRate) return null;
  return {
    rung: Math.round(rateToSlider(input.timeRate)),
    max: RATE_NOTCHES,
    label: input.speedLabel,
    playing: input.playing,
    onRung: (n) => input.onTimeRate!(sliderToRate(n)),
    onTogglePlay: input.onTogglePlay,
    onReset: input.onResetRate,
  };
}
