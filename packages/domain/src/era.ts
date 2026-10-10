/** The four calendar eras a date can be named in (Bikram Sambat, AD, BC, pre-BS). */
export const ERAS = ["ad", "bc", "bs", "bbs"] as const;

export type Era = (typeof ERAS)[number];

/** A civil day in `inputEra`, plus the local time of day on it. */
export type InstantQuery = {
  inputEra: Era;
  year: number;
  month: number;
  day: number;
  /** Observer-local `HH:MM`. */
  clock: string;
};
