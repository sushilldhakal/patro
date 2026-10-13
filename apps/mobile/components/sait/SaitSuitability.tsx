import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { SaitSuitability } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { SUITABILITY_ORDER, SUITABILITY_STYLE } from "@vedic-patro/domain/sait-suitability";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";

/** A small verdict chip shown on a personalised day. */
export function SuitabilityBadge({ suitability }: { suitability: SaitSuitability }) {
  const { pick } = useLocale();
  const s = SUITABILITY_STYLE[suitability];
  const tone = saitClasses.suitability[suitability];
  return (
    <View className={cn(saitClasses.badge, tone.box)}>
      <View className={cn(saitClasses.badgeDot, tone.dot)} />
      <Text style={nepaliTextStyle()} className={cn(saitClasses.badgeText, tone.text)}>
        {pick(s.ne, s.en)}
      </Text>
    </View>
  );
}

/** Legend + optional counts, shown once a profile is chosen. */
export function SuitabilityLegend({
  counts,
}: {
  counts?: { favourable: number; neutral: number; avoid: number } | null;
}) {
  const { t, pick, digits } = useLocale();
  return (
    <View className={saitClasses.legend}>
      <Text className={cn(saitClasses.legendText, saitClasses.legendTitle)} style={nepaliTextStyle()}>
        {t("sait.for_your_profile")}
      </Text>
      {SUITABILITY_ORDER.map((k) => {
        const s = SUITABILITY_STYLE[k];
        return (
          <View key={k} className={saitClasses.legendItem}>
            <View className={cn(saitClasses.legendDot, saitClasses.suitability[k].dot)} />
            <Text className={saitClasses.legendText} style={nepaliTextStyle()}>
              {pick(s.ne, s.en)}
            </Text>
            {counts ? (
              <Text className={cn(saitClasses.legendText, saitClasses.legendCount)} style={nepaliTextStyle()}>· {digits(counts[k])}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
