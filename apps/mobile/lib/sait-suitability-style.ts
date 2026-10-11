import type { SaitShuddhiTone, SaitSuitability } from "@/lib/api";
import { SUITABILITY_STYLE as SUITABILITY_LABELS } from "@vedic-patro/domain/sait-suitability";
import { brand } from "@vedic-patro/design-tokens";

type Tone = { dot: string; bg: string; fg: string; ring: string; ne: string; en: string };

/**
 * Native colours for the per-day verdict. The web styles the same three verdicts
 * with Tailwind classes (`SUITABILITY_STYLE` in the shared package); NativeWind
 * cannot do `bg-success/12`-style alpha on a CSS variable, so the colours are
 * literals here and the labels come from the shared table.
 */
const NATIVE_COLOURS: Record<SaitSuitability, Pick<Tone, "dot" | "bg" | "fg" | "ring">> = {
  favourable: {
    dot: brand.green,
    bg: "rgba(46,125,50,0.12)",
    fg: brand.green,
    ring: "rgba(46,125,50,0.5)",
  },
  neutral: {
    dot: "rgba(120,120,120,0.6)",
    bg: "rgba(120,120,120,0.10)",
    fg: "#6b7280",
    ring: "rgba(120,120,120,0.35)",
  },
  avoid: {
    dot: brand.vermilion,
    bg: "rgba(198,40,40,0.12)",
    fg: brand.vermilion,
    ring: "rgba(198,40,40,0.4)",
  },
};

export const SUITABILITY_STYLE = Object.fromEntries(
  (Object.keys(NATIVE_COLOURS) as SaitSuitability[]).map((k) => [
    k,
    { ...NATIVE_COLOURS[k], ne: SUITABILITY_LABELS[k].ne, en: SUITABILITY_LABELS[k].en },
  ]),
) as Record<SaitSuitability, Tone>;

/** Chip colours for the graha-shuddhi / kumbha / anna-month tone flags. */
export const SHUDDHI_TONE_STYLE: Record<SaitShuddhiTone, { bg: string; fg: string }> = {
  good: { bg: "rgba(46,125,50,0.12)", fg: brand.green },
  shanti: { bg: "rgba(230,126,34,0.15)", fg: brand.saffronPressed },
  avoid: { bg: "rgba(198,40,40,0.12)", fg: brand.vermilion },
};
