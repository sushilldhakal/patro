import type { SaitSuitability } from "@/lib/api";
import { SUITABILITY_STYLE as SUITABILITY_LABELS } from "@vedic-patro/design-tokens/classes/sait-suitability-classes";
import { withAlpha } from "@vedic-patro/design-tokens";
import type { ThemeColors } from "@/lib/theme";

type Tone = { dot: string; bg: string; fg: string; ring: string; ne: string; en: string };

/**
 * Native colours for the per-day verdict. The web styles the same three verdicts
 * with Tailwind classes (`SUITABILITY_STYLE` in the shared package); NativeWind
 * cannot do `bg-success/12`-style alpha on a CSS variable, so the colours are
 * the theme's values with alpha here and the labels come from the shared table.
 * Neutral uses the muted ink. Taken from the theme, so dark mode gets its own
 * readable green and red rather than the light ones.
 */
export function suitabilityStyle(colors: ThemeColors): Record<SaitSuitability, Tone> {
  const native: Record<SaitSuitability, Pick<Tone, "dot" | "bg" | "fg" | "ring">> = {
    favourable: {
      dot: colors.success,
      bg: withAlpha(colors.success, 0.12),
      fg: colors.success,
      ring: withAlpha(colors.success, 0.5),
    },
    neutral: {
      dot: withAlpha(colors.mutedForeground, 0.6),
      bg: withAlpha(colors.mutedForeground, 0.1),
      fg: colors.mutedForeground,
      ring: withAlpha(colors.mutedForeground, 0.35),
    },
    avoid: {
      dot: colors.danger,
      bg: withAlpha(colors.danger, 0.12),
      fg: colors.danger,
      ring: withAlpha(colors.danger, 0.4),
    },
  };
  return Object.fromEntries(
    (Object.keys(native) as SaitSuitability[]).map((k) => [
      k,
      { ...native[k], ne: SUITABILITY_LABELS[k].ne, en: SUITABILITY_LABELS[k].en },
    ]),
  ) as Record<SaitSuitability, Tone>;
}
