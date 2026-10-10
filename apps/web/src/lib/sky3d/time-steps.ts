/**
 * One ladder of time steps, shared by every control that moves the clock.
 *
 * There used to be two ideas of speed in the sky: a multiplier ladder for
 * play (×1, ×2, ×10 …) and a separate notion of how far the arrows jumped.
 * Reading "×100" told you nothing about what you were watching — a hundred
 * times what? — and the two could not be reasoned about together.
 *
 * So there is one list, and every rung is an amount of *simulated* time. It
 * means the same thing wherever it is used:
 *
 * - अगाडि  moves the clock forward by one step,
 * - पछाडि  moves it back by one step,
 * - चलाउनु runs it forward by one step for every real second.
 *
 * Pick `१ दिन` and the arrows step a day and play runs a day a second. There
 * is nothing else to know.
 */

export type TimeStep = {
  /** The step, in simulated seconds. */
  seconds: number;
  ne: string;
  en: string;
};

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 7 * DAY;
/**
 * Mean Gregorian month and year — 365.2425 days to the year, twelve months to
 * it. A month is not a fixed length of time and neither is a year, so a rung
 * that has to be a number of seconds uses the average. Over the ranges the top
 * rungs are for (a century a second, watching precession) the difference is
 * far below anything on screen.
 */
const MONTH = 2629746;
const YEAR = 31556952;

export const TIME_STEPS: readonly TimeStep[] = [
  { seconds: 1, ne: "१ से/से", en: "1s / 1s" },
  { seconds: MINUTE, ne: "१ मि/से", en: "1m / 1s" },
  { seconds: 30 * MINUTE, ne: "३० मि/से", en: "30m / 1s" },
  { seconds: HOUR, ne: "१ घ/से", en: "1h / 1s" },
  { seconds: 12 * HOUR, ne: "१२ घ/से", en: "12h / 1s" },
  { seconds: DAY, ne: "१ दिन/से", en: "1d / 1s" },
  { seconds: 2 * DAY, ne: "२ दिन/से", en: "2d / 1s" },
  { seconds: WEEK, ne: "१ हप्ता/से", en: "1w / 1s" },
  { seconds: 2 * WEEK, ne: "२ हप्ता/से", en: "2w / 1s" },
  { seconds: MONTH, ne: "१ महिना/से", en: "1mo / 1s" },
  { seconds: 6 * MONTH, ne: "६ महिना/से", en: "6mo / 1s" },
  { seconds: YEAR, ne: "१ वर्ष/से", en: "1y / 1s" },
  { seconds: 5 * YEAR, ne: "५ वर्ष/से", en: "5y / 1s" },
  { seconds: 10 * YEAR, ne: "१० वर्ष/से", en: "10y / 1s" },
  /* The top rung is for precession. The ayanamsa moves a degree in seventy-two
     years, so at any calendar speed the belt looks nailed down; at a century a
     second मेष walks away from वसन्त सम्पात while you watch and the whole
     26,000-year turn takes about four minutes. */
  { seconds: 100 * YEAR, ne: "१०० वर्ष/से", en: "100y / 1s" },
];

/** Where the sky opens: the clock on the wall, running at its own rate. */
export const DEFAULT_STEP_INDEX = 0;

/** The rung nearest a given number of seconds — for reading an old rate back. */
export function nearestStepIndex(seconds: number): number {
  const target = Math.abs(seconds) || 1;
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < TIME_STEPS.length; i += 1) {
    /* Compared in log space, because the rungs span nine orders of magnitude
       and a linear distance would put everything below a year on the bottom
       rung. */
    const gap = Math.abs(Math.log(TIME_STEPS[i].seconds) - Math.log(target));
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}
