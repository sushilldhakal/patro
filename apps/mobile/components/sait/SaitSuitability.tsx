import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { SaitSuitability } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { SUITABILITY_ORDER } from "@vedic-patro/domain/sait-suitability";
import { SUITABILITY_STYLE } from "@/lib/sait-suitability-style";

/** A small verdict chip shown on a personalised day. */
export function SuitabilityBadge({ suitability }: { suitability: SaitSuitability }) {
  const { pick } = useLocale();
  const s = SUITABILITY_STYLE[suitability];
  return (
    <View
      style={{ backgroundColor: s.bg }}
      className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5"
    >
      <View style={{ backgroundColor: s.dot }} className="h-1.5 w-1.5 rounded-full" />
      <Text style={{ color: s.fg, ...nepaliTextStyle(11) }} className="text-caption font-semibold">
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
  const { pick, digits } = useLocale();
  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
      <Text className="text-caption font-medium text-foreground" style={nepaliTextStyle(11)}>
        {pick("तपाईंको प्रोफाइलअनुसार", "For your profile")}
      </Text>
      {SUITABILITY_ORDER.map((k) => {
        const s = SUITABILITY_STYLE[k];
        return (
          <View key={k} className="flex-row items-center gap-1">
            <View style={{ backgroundColor: s.dot }} className="h-2 w-2 rounded-full" />
            <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
              {pick(s.ne, s.en)}
            </Text>
            {counts ? (
              <Text className="text-caption font-num text-muted-foreground">· {digits(counts[k])}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
