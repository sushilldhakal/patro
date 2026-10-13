import { brand, illustration, midnight, wheel } from "@vedic-patro/design-tokens";
/**
 * Colours for the 3D learn diagrams.
 *
 * The canvas is always deep space — a dark scene reads far better on a phone
 * than a washed-out one, and it keeps the bodies legible in both app themes.
 * Only the panel around the canvas follows the theme; everything inside these
 * tables is fixed so a scene never comes out invisible in light mode.
 */

export const DIAGRAM_CANVAS_BG = midnight.popover;

export const DIAGRAM_COLOR = {
  sun: illustration.amber67,
  sunCore: illustration.amber92,
  sunGlow: illustration.orange53b,
  earth: illustration.sky60,
  earthNight: illustration.sky14,
  moon: illustration.sky84,
  moonDark: illustration.sky27,
  orbit: illustration.sky61,
  orbitFaint: illustration.sky32b,
  arc: illustration.green58,
  ray: illustration.amber56,
  shadow: midnight.background,
  node: illustration.pink70,
  axis: illustration.sky75b,
  equator: illustration.red82,
  star: illustration.sky93,
  grid: illustration.sky27,
  tropical: illustration.orange61,
  sidereal: illustration.green45,
} as const;

/** The twelve rashi wedges, in order from मेष. */
export const RASHI_RING_COLORS = [
  illustration.red60,
  illustration.orange53c,
  illustration.amber47,
  illustration.lime44,
  illustration.green45,
  illustration.teal40,
  illustration.teal43,
  illustration.sky60,
  illustration.blue67,
  illustration.violet65,
  illustration.pink60,
  illustration.red60b,
] as const;

/** Overlay label colours — these sit on the dark canvas, never on the card. */
export const DIAGRAM_LABEL_COLOR = {
  body: brand.offWhite,
  /* Solid hex: THREE.Color ignores CSS alpha and warns on rgba(). Overlay text
     that should read softer applies its own opacity. */
  dim: wheel.ink,
  sun: DIAGRAM_COLOR.sun,
  earth: illustration.sky75b,
  moon: wheel.ink,
  arc: DIAGRAM_COLOR.arc,
  node: DIAGRAM_COLOR.node,
  rashi: illustration.amber61,
  warn: illustration.orange61,
} as const;
