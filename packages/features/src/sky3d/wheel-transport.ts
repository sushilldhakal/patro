/**
 * The speed row of the wheel's date sheet (play / pause, a slider whose middle
 * is stopped, back to stopped) over the year page's playback, which runs at
 * 1×, 2×, 4× … up to the page's top speed in either direction: rung −6…6, 0 paused.
 */
import { WHEEL_MAX_PLAY_SPEED } from "@vedic-patro/domain/wheel-year-playback";

export const WHEEL_TRANSPORT_MAX = Math.round(Math.log2(WHEEL_MAX_PLAY_SPEED)) + 1;

/** The speed row of the time sheet: play / pause, a slider whose middle is stopped, and back to stopped / real time. */
export type SkyTimeTransport = {
  /** Negative runs backwards, 0 is paused. */
  rung: number;
  max: number;
  /** The rate in words ("2 weeks / 1 sec"); empty when paused. */
  label?: string;
  onRung: (rung: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
};

export type WheelPlayback = {
  direction: -1 | 0 | 1;
  /** 1, 2, 4 … doubling up to the top speed. */
  speed: number;
  playbackRateLabel?: string;
  onForward: () => void;
  onPause: () => void;
  onSetPlayback?: (direction: -1 | 0 | 1, speed: number) => void;
};

/** Direction and speed → slider rung: 2× forward is 2, 4× backward is −3. */
export function playbackToRung(direction: -1 | 0 | 1, speed: number): number {
  if (direction === 0) return 0;
  const step = Math.min(WHEEL_TRANSPORT_MAX, Math.max(1, Math.round(Math.log2(Math.max(1, speed))) + 1));
  return direction * step;
}

/** Slider rung → direction and speed. */
export function rungToPlayback(rung: number): { direction: -1 | 0 | 1; speed: number } {
  const r = Math.max(-WHEEL_TRANSPORT_MAX, Math.min(WHEEL_TRANSPORT_MAX, Math.round(rung)));
  if (r === 0) return { direction: 0, speed: 1 };
  return { direction: r > 0 ? 1 : -1, speed: 2 ** (Math.abs(r) - 1) };
}

export function wheelTransport(p: WheelPlayback): SkyTimeTransport {
  const rung = playbackToRung(p.direction, p.speed);
  return {
    rung,
    max: WHEEL_TRANSPORT_MAX,
    label: p.direction === 0 ? "" : (p.playbackRateLabel ?? ""),
    onRung: (next: number) => {
      const t = rungToPlayback(next);
      if (t.direction === 0) p.onPause();
      else p.onSetPlayback?.(t.direction, t.speed);
    },
    onTogglePlay: () => (p.direction === 0 ? p.onForward() : p.onPause()),
    onReset: p.onPause,
  };
}
