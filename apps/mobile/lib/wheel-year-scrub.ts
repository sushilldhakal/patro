/**
 * The contract between the year page and whichever wheel is drawing it.
 *
 * The page owns the position and the playback clock; the wheel owns the controls.
 * Shared so the native dock and the web dock stay the same instrument.
 */
export type YearWheelScrub = {
  /** Global day index across the whole range (single year ⇒ 1..365). */
  day: number;
  /** Total days across the whole range. */
  totalDays: number;
  /** Autoplay direction: -1 backward, 0 paused, 1 forward. */
  direction: -1 | 0 | 1;
  /** Autoplay speed multiplier while playing: 1 | 2 | 4 | 8. */
  speed: number;
  /** Play/step forward — repeated presses ramp 1×→2×→4×→8×. */
  onForward: () => void;
  /** Play/step backward — repeated presses ramp 1×→2×→4×→8×. */
  onBackward: () => void;
  /** Stop playback (resets speed). */
  onPause: () => void;
  /** Receives the global day index; the page maps it back to (year, day). */
  onDayChange: (day: number) => void;
  /** Jump straight to a day-in-year (1-based) within the active year; pauses playback. */
  onJumpDay: (dayInYear: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  /** Multi-year range context — shows the active year + day-in-year label. */
  yearLabel?: string;
  dayInYear?: number;
  daysInYear?: number;
  /** Live HUD while playing, e.g. "1.1 days / 1 sec". */
  playbackRateLabel?: string;
};
