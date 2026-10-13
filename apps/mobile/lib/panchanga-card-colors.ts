import { brand, illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
/** Solid tone fills — reliable on React Native (no color-mix / missing Tailwind tokens). */
export const PANCHANGA_TONE_BG: Record<"best" | "good" | "neutral" | "bad" | "worst", string> = {
  best: withAlpha(brand.green, 0.14),
  good: withAlpha(brand.green, 0.09),
  neutral: withAlpha(brand.ink, 0.05),
  bad: withAlpha(brand.vermilion, 0.08),
  worst: withAlpha(brand.vermilion, 0.12),
};

export const PANCHANGA_TONE_BG_DARK: Record<keyof typeof PANCHANGA_TONE_BG, string> = {
  best: withAlpha(brand.green, 0.22),
  good: withAlpha(brand.green, 0.16),
  neutral: withAlpha(brand.offWhite, 0.06),
  bad: withAlpha(brand.vermilion, 0.14),
  worst: withAlpha(brand.vermilion, 0.2),
};

export const PANCHANGA_FIELD_CARD_BG = withAlpha(neutral.white, 0.72);
export const PANCHANGA_FIELD_CARD_BG_DARK = withAlpha(illustration.teal15c, 0.85);

export const PANCHANGA_TIMING_HIGHLIGHT_BG = withAlpha(brand.green, 0.1);
export const PANCHANGA_TIMING_HIGHLIGHT_BORDER = withAlpha(brand.green, 0.35);
