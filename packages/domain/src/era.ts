/** The four calendar eras a date can be named in (Bikram Sambat, AD, BC, pre-BS). */
export const ERAS = ["ad", "bc", "bs", "bbs"] as const;

export type Era = (typeof ERAS)[number];
