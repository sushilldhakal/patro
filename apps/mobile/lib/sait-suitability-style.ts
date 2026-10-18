import type { SaitShuddhiTone, SaitSuitability } from "@/lib/api";
import { SUITABILITY_STYLE as SUITABILITY_LABELS } from "@vedic-patro/design-tokens/classes/sait-suitability-classes";
import { brand, withAlpha } from "@vedic-patro/design-tokens";

type Tone = { dot: string; bg: string; fg: string; ring: string; ne: string; en: string };

/**
 * Native colours for the per-day verdict. The web styles the same three verdicts
 * with Tailwind classes (`SUITABILITY_STYLE` in the shared package); NativeWind
 * cannot do `bg-success/12`-style alpha on a CSS variable, so the colours are
 * token values with alpha here and the labels come from the shared table.
 * Neutral uses the website's muted ink.
 */
const NATIVE_COLOURS: Record<SaitSuitability, Pick<Tone, "dot" | "bg" | "fg" | "ring">> = {
  favourable: {
    dot: brand.green,
    bg: withAlpha(brand.green, 0.12),
    fg: brand.green,
    ring: withAlpha(brand.green, 0.5),
  },
  neutral: {
    dot: withAlpha(brand.inkMuted, 0.6),
    bg: withAlpha(brand.inkMuted, 0.1),
    fg: brand.inkMuted,
    ring: withAlpha(brand.inkMuted, 0.35),
  },
  avoid: {
    dot: brand.vermilion,
    bg: withAlpha(brand.vermilion, 0.12),
    fg: brand.vermilion,
    ring: withAlpha(brand.vermilion, 0.4),
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
  good: { bg: withAlpha(brand.green, 0.12), fg: brand.green },
  shanti: { bg: withAlpha(brand.saffronBright, 0.15), fg: brand.saffronPressed },
  avoid: { bg: withAlpha(brand.vermilion, 0.12), fg: brand.vermilion },
};
