import type { SaitShuddhiTone, SaitSuitability } from "@/lib/api";

type Tone = { dot: string; bg: string; fg: string; ring: string; ne: string; en: string };

/**
 * Visual treatment for a native (profile-based) per-day verdict. Mirrors the
 * web SUITABILITY_STYLE with the Tailwind classes resolved to literals, since
 * NativeWind cannot do `bg-success/12`-style alpha on a CSS variable.
 */
export const SUITABILITY_STYLE: Record<SaitSuitability, Tone> = {
  favourable: {
    dot: "#2e7d32",
    bg: "rgba(46,125,50,0.12)",
    fg: "#2e7d32",
    ring: "rgba(46,125,50,0.5)",
    ne: "अनुकूल",
    en: "Favourable",
  },
  neutral: {
    dot: "rgba(120,120,120,0.6)",
    bg: "rgba(120,120,120,0.10)",
    fg: "#6b7280",
    ring: "rgba(120,120,120,0.35)",
    ne: "सामान्य",
    en: "Neutral",
  },
  avoid: {
    dot: "#c62828",
    bg: "rgba(198,40,40,0.12)",
    fg: "#c62828",
    ring: "rgba(198,40,40,0.4)",
    ne: "त्याज्य",
    en: "Avoid",
  },
};

export const SUITABILITY_ORDER: SaitSuitability[] = ["favourable", "neutral", "avoid"];

/** Chip colours for the graha-shuddhi / kumbha / anna-month tone flags. */
export const SHUDDHI_TONE_STYLE: Record<SaitShuddhiTone, { bg: string; fg: string }> = {
  good: { bg: "rgba(46,125,50,0.12)", fg: "#2e7d32" },
  shanti: { bg: "rgba(230,126,34,0.15)", fg: "#b45309" },
  avoid: { bg: "rgba(198,40,40,0.12)", fg: "#c62828" },
};

export const SHUDDHI_SUMMARY: Record<SaitShuddhiTone, { ne: string; en: string }> = {
  good: { ne: "ग्रह शुद्ध — शुभ", en: "Grahas strong — auspicious" },
  shanti: { ne: "शान्ति आवश्यक", en: "needs śānti" },
  avoid: { ne: "त्याज्य ग्रहस्थिति", en: "weak graha — avoid" },
};

export const SHUDDHI_PLANET_LABEL: Record<string, { ne: string; en: string }> = {
  sun: { ne: "सूर्य", en: "Sun" },
  moon: { ne: "चन्द्र", en: "Moon" },
  guru: { ne: "गुरु", en: "Jupiter" },
  shukra: { ne: "शुक्र", en: "Venus" },
};
