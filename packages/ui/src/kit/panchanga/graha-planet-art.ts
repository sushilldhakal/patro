import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { grahaArt as c } from "@vedic-patro/design-tokens";

export type GrahaStop = { offset: string; color: string };
export type GrahaSpot = {
  cx: number;
  cy: number;
  r?: number;
  rx?: number;
  ry?: number;
  rotate?: number;
};

/** Geometry of one spherical graha, colours from `grahaArt`. */
export type GrahaPlanetSpec = {
  r: number;
  cx: string;
  cy: string;
  gradR: string;
  stops: readonly GrahaStop[];
  spots?: { opacity: number; fill: string; items: readonly GrahaSpot[] };
  rays?: { stroke: string; lines: readonly (readonly [number, number, number, number])[] };
  ring?: { stroke: string; bright: string };
};

const disc = (light: string, dark: string, r = 17.28): Pick<GrahaPlanetSpec, "r" | "cx" | "cy" | "gradR" | "stops"> => ({
  r,
  cx: "38%",
  cy: "34%",
  gradR: "72%",
  stops: [
    { offset: "0%", color: light },
    { offset: "100%", color: dark },
  ],
});

export const grahaPlanetArt: Record<GrahaKey, GrahaPlanetSpec> = {
  sun: {
    ...disc(c.sunLight, c.sunDark, 14.4),
    rays: {
      stroke: c.sunRay,
      lines: [
        [24, 7.68, 24, 1.92],
        [32.54, 9.46, 36.62, 4.54],
        [38.54, 15.46, 43.46, 11.38],
        [40.32, 24, 46.08, 24],
        [38.54, 32.54, 43.46, 36.62],
        [32.54, 38.54, 36.62, 43.46],
        [24, 40.32, 24, 46.08],
        [15.46, 38.54, 11.38, 43.46],
        [9.46, 32.54, 4.54, 36.62],
        [7.68, 24, 1.92, 24],
        [9.46, 15.46, 4.54, 11.38],
        [15.46, 9.46, 11.38, 4.54],
      ],
    },
  },
  moon: {
    ...disc(c.moonLight, c.moonDark),
    spots: {
      opacity: 0.4,
      fill: c.moonSpot,
      items: [
        { cx: 19.68, cy: 21.6, r: 2.88 },
        { cx: 26.64, cy: 25.92, r: 2.16 },
        { cx: 24.48, cy: 30.72, r: 2.4 },
        { cx: 20.88, cy: 28.8, r: 1.44 },
      ],
    },
  },
  mars: {
    ...disc(c.marsLight, c.marsDark),
    spots: {
      opacity: 0.5,
      fill: c.marsSpot,
      items: [
        { cx: 21.6, cy: 20.16, r: 2.88 },
        { cx: 29.76, cy: 26.88, r: 2.4 },
        { cx: 24.96, cy: 31.68, r: 1.68 },
      ],
    },
  },
  mercury: {
    ...disc(c.mercuryLight, c.mercuryDark),
    spots: {
      opacity: 0.45,
      fill: c.mercurySpot,
      items: [
        { cx: 20.16, cy: 21.12, r: 3.36 },
        { cx: 28.8, cy: 28.8, r: 2.4 },
        { cx: 26.88, cy: 18.24, r: 1.44 },
      ],
    },
  },
  jupiter: {
    ...disc(c.jupiterLight, c.jupiterDark),
    spots: {
      opacity: 0.55,
      fill: c.jupiterBand,
      items: [],
    },
  },
  venus: {
    ...disc(c.venusLight, c.venusDark),
    spots: {
      opacity: 0.5,
      fill: c.venusCloud,
      items: [
        { cx: 21.12, cy: 19.2, rx: 7.68, ry: 2.4 },
        { cx: 27.84, cy: 27.84, rx: 6.24, ry: 2.16 },
      ],
    },
  },
  saturn: {
    ...disc(c.saturnLight, c.saturnDark, 14.4),
    ring: { stroke: c.saturnRing, bright: c.saturnRingBright },
  },
  rahu: {
    r: 16.8,
    cx: "38%",
    cy: "32%",
    gradR: "68%",
    stops: [
      { offset: "0%", color: c.rahuLight },
      { offset: "55%", color: c.rahuMid },
      { offset: "100%", color: c.rahuDark },
    ],
    spots: {
      opacity: 0.35,
      fill: c.rahuBand,
      items: [
        { cx: 20, cy: 19, rx: 8, ry: 3, rotate: -15 },
        { cx: 28, cy: 27, rx: 6, ry: 2.5, rotate: 20 },
      ],
    },
  },
  ketu: {
    r: 16.8,
    cx: "38%",
    cy: "32%",
    gradR: "68%",
    stops: [
      { offset: "0%", color: c.ketuLight },
      { offset: "55%", color: c.ketuMid },
      { offset: "100%", color: c.ketuDark },
    ],
    spots: {
      opacity: 0.4,
      fill: c.ketuSpot,
      items: [
        { cx: 19, cy: 21, r: 2.5 },
        { cx: 27, cy: 26, r: 1.8 },
        { cx: 23, cy: 30, r: 2 },
      ],
    },
  },
};

/** Jupiter's band rectangles are not circles. Drawn beside the shared spots. */
export const jupiterBands = [
  { y: 13.44, h: 4.32, fill: c.jupiterBand },
  { y: 22.08, h: 5.76, fill: c.jupiterBandMid },
  { y: 30.72, h: 3.84, fill: c.jupiterBandDeep },
] as const;

export const jupiterSpot = { cx: 28.8, cy: 24.96, rx: 3.36, ry: 2.4, fill: c.jupiterSpot };
