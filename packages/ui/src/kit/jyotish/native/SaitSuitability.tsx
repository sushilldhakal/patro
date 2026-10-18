import { Box, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { SUITABILITY_ORDER, SUITABILITY_STYLE } from "@vedic-patro/design-tokens/classes/sait-suitability-classes";
import { useLocale } from "@vedic-patro/i18n/react";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SuitabilityBadgeProps, SuitabilityLegendProps } from "../contract";

/** A small verdict chip shown on a personalised day. */
export function SuitabilityBadge({ suitability, className }: SuitabilityBadgeProps) {
  const { pick } = useLocale();
  const s = SUITABILITY_STYLE[suitability];
  const tone = saitClasses.suitability[suitability];
  return (
    <Box className={cn(saitClasses.badge, tone.box, className)}>
      <Box className={cn(saitClasses.badgeDot, tone.dot)} />
      <Text className={cn(saitClasses.badgeText, tone.text)}>{pick(s.ne, s.en)}</Text>
    </Box>
  );
}

/** Legend + optional counts, shown once a profile is chosen. */
export function SuitabilityLegend({ counts }: SuitabilityLegendProps) {
  const { t, pick, digits } = useLocale();
  return (
    <Box className={saitClasses.legend}>
      <Text className={cn(saitClasses.legendText, saitClasses.legendTitle)}>{t("sait.for_your_profile")}</Text>
      {SUITABILITY_ORDER.map((k) => {
        const s = SUITABILITY_STYLE[k];
        return (
          <Box key={k} className={saitClasses.legendItem}>
            <Box className={cn(saitClasses.legendDot, saitClasses.suitability[k].dot)} />
            <Text className={saitClasses.legendText}>{pick(s.ne, s.en)}</Text>
            {counts ? <Text className={cn(saitClasses.legendText, saitClasses.legendCount)}>· {digits(counts[k])}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
