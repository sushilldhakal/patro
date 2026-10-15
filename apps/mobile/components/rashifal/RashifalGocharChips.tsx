import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import type { RashifalGocharRow } from "@/lib/api";
import { useRashifalGocharChips, type RashifalGocharFlag } from "@vedic-patro/features/rashifal";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";

/**
 * The nine-graha gochar strip inside "why this reading?" — one chip per graha
 * with its house from the sign, the three transit flags, and a legend for the
 * flags actually shown. Same colours as the web: secondary = वक्री,
 * destructive = अस्त, so one icon means one thing across the app.
 */
const TONE = {
  vedha: rashifalClasses.gochar.toneVedha,
  good: rashifalClasses.gochar.toneGood,
  bad: rashifalClasses.gochar.toneBad,
} as const;

const FLAG_ICON: Record<RashifalGocharFlag, keyof typeof Ionicons.glyphMap> = {
  vedha: "shield-outline",
  retrograde: "refresh-outline",
  combust: "flame-outline",
};

export function RashifalGocharChips({ rows }: { rows: RashifalGocharRow[] }) {
  const colors = useThemeColors();
  const { chips, legend } = useRashifalGocharChips(rows);
  if (!chips.length) return null;

  const flagColor: Record<RashifalGocharFlag, string> = {
    vedha: colors.mutedForeground,
    retrograde: colors.secondary,
    combust: colors.destructive,
  };
  const flag = (f: RashifalGocharFlag) => <Ionicons name={FLAG_ICON[f]} size={12} color={flagColor[f]} />;

  return (
    <View className={cn("mt-3", rashifalClasses.gochar.wrap)}>
      <View className={cn("flex-row flex-wrap", rashifalClasses.gochar.list)}>
        {chips.map((chip) => (
          <View key={chip.key} accessibilityLabel={chip.hint} className={cn("flex-row", rashifalClasses.gochar.chip, TONE[chip.tone])}>
            <Text className={rashifalClasses.gochar.chipText}>{chip.graha}</Text>
            <Text className={cn(rashifalClasses.gochar.chipText, rashifalClasses.gochar.house)}>{chip.house}</Text>
            {chip.flags.map((f) => (
              <View key={f.flag} accessibilityLabel={f.label}>
                {flag(f.flag)}
              </View>
            ))}
          </View>
        ))}
      </View>

      {legend.length ? (
        <View className={cn("flex-row flex-wrap items-center", rashifalClasses.gochar.legend)}>
          {legend.map((f) => (
            <View key={f.flag} className={cn("flex-row", rashifalClasses.gochar.legendItem)}>
              {flag(f.flag)}
              <Text className={rashifalClasses.gochar.legendText}>{f.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
