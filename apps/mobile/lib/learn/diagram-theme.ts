/**
 * Colours for the 3D learn diagrams.
 *
 * The canvas is always deep space — a dark scene reads far better on a phone
 * than a washed-out one, and it keeps the bodies legible in both app themes.
 * Only the panel around the canvas follows the theme; everything inside these
 * tables is fixed so a scene never comes out invisible in light mode.
 */

export const DIAGRAM_CANVAS_BG = "#060b14";

export const DIAGRAM_COLOR = {
  sun: "#ffcf57",
  sunCore: "#fff6d8",
  sunGlow: "#f7a41d",
  earth: "#3d8bfd",
  earthNight: "#0b1f3a",
  moon: "#cbd5e1",
  moonDark: "#3b4553",
  orbit: "#7c93b8",
  orbitFaint: "#3d4b66",
  arc: "#4ade80",
  ray: "#fbbf24",
  shadow: "#0a0f1a",
  node: "#f472b6",
  axis: "#93c5fd",
  equator: "#fca5a5",
  star: "#dbeafe",
  grid: "#334155",
  tropical: "#fb923c",
  sidereal: "#22c55e",
} as const;

/** The twelve rashi wedges, in order from मेष. */
export const RASHI_RING_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
] as const;

/** Overlay label colours — these sit on the dark canvas, never on the card. */
export const DIAGRAM_LABEL_COLOR = {
  body: "#f1f5f9",
  /* Solid hex: THREE.Color ignores CSS alpha and warns on rgba(). Overlay text
     that should read softer applies its own opacity. */
  dim: "#e2e8f0",
  sun: DIAGRAM_COLOR.sun,
  earth: "#93c5fd",
  moon: "#e2e8f0",
  arc: DIAGRAM_COLOR.arc,
  node: DIAGRAM_COLOR.node,
  rashi: "#f4c542",
  warn: "#fb923c",
} as const;
