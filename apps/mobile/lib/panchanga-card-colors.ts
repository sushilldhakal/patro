/** Solid tone fills — reliable on React Native (no color-mix / missing Tailwind tokens). */
export const PANCHANGA_TONE_BG: Record<"best" | "good" | "neutral" | "bad" | "worst", string> = {
  best: "rgba(46, 125, 50, 0.14)",
  good: "rgba(46, 125, 50, 0.09)",
  neutral: "rgba(26, 20, 16, 0.05)",
  bad: "rgba(198, 40, 40, 0.08)",
  worst: "rgba(198, 40, 40, 0.12)",
};

export const PANCHANGA_TONE_BG_DARK: Record<keyof typeof PANCHANGA_TONE_BG, string> = {
  best: "rgba(46, 125, 50, 0.22)",
  good: "rgba(46, 125, 50, 0.16)",
  neutral: "rgba(248, 246, 242, 0.06)",
  bad: "rgba(198, 40, 40, 0.14)",
  worst: "rgba(198, 40, 40, 0.2)",
};

export const PANCHANGA_FIELD_CARD_BG = "rgba(255, 255, 255, 0.72)";
export const PANCHANGA_FIELD_CARD_BG_DARK = "rgba(11, 61, 64, 0.85)";

export const PANCHANGA_TIMING_HIGHLIGHT_BG = "rgba(46, 125, 50, 0.1)";
export const PANCHANGA_TIMING_HIGHLIGHT_BORDER = "rgba(46, 125, 50, 0.35)";
