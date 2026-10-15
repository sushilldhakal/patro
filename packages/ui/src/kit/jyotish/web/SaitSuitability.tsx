import { Box, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { SUITABILITY_ORDER, SUITABILITY_STYLE } from "@vedic-patro/domain/sait-suitability";
import { useLocale } from "@vedic-patro/i18n/react";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SuitabilityBadgeProps, SuitabilityLegendProps } from "../contract";

/** A small verdict chip shown on a personalised day. */
export function SuitabilityBadge({ suitability, className }: SuitabilityBadgeProps) {
  const { pick } = useLocale();
  const s = SUITABILITY_STYLE[suitability];
  const tone = saitClasses.suitability[suitability];
  return (
    <Text
      as="span"
      className={cn(saitClasses.badge, saitClasses.badgeText, tone.box, tone.text, className)}
      webClassName="inline-flex"
    >
      <Text as="span" className={cn(saitClasses.badgeDot, tone.dot)} />
      {pick(s.ne, s.en)}
    </Text>
  );
}

/** Legend + optional counts, shown once a profile is chosen. */
export function SuitabilityLegend({ counts }: SuitabilityLegendProps) {
  const { t, pick, digits } = useLocale();
  return (
    <Box className={cn(saitClasses.legend, saitClasses.legendText)}>
      <Text as="span" className={saitClasses.legendTitle}>
        {t("sait.for_your_profile")}
      </Text>
      {SUITABILITY_ORDER.map((k) => {
        const s = SUITABILITY_STYLE[k];
        return (
          <Text as="span" key={k} className={saitClasses.legendItem} webClassName="inline-flex">
            <Text as="span" className={cn(saitClasses.legendDot, saitClasses.suitability[k].dot)} />
            {pick(s.ne, s.en)}
            {counts ? (
              <Text as="span" className={saitClasses.legendCount}>
                · {digits(counts[k])}
              </Text>
            ) : null}
          </Text>
        );
      })}
    </Box>
  );
}
