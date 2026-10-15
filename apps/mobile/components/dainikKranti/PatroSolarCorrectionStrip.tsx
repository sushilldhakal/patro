import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { usePatroSolarCorrection, type PatroSolarKey } from "@vedic-patro/features/dainik-kranti";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type Props = {
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
  className?: string;
};

const SOLAR_ICON: Record<PatroSolarKey, keyof typeof Ionicons.glyphMap> = {
  deshaantar: "globe-outline",
  akshamsha: "navigate-outline",
  belaantar: "time-outline",
};

export function PatroSolarCorrectionStrip({ deshaantar, akshamsha, belaantar, className }: Props) {
  const colors = useThemeColors();
  const items = usePatroSolarCorrection({ deshaantar, akshamsha, belaantar });
  if (items.length === 0) return null;

  return (
    <View className={cn(dainikKrantiClasses.solarStrip, className)}>
      {items.map((item) => (
        <View
          key={item.key}
          className={cn(
            dainikKrantiClasses.solarItem,
            item.highlight ? dainikKrantiClasses.solarItemBela : dainikKrantiClasses.solarItemPlain,
          )}
          style={{ maxWidth: "48%" }}
        >
          <View className={dainikKrantiClasses.solarLabel}>
            <Ionicons
              name={SOLAR_ICON[item.key]}
              size={14}
              color={item.highlight ? colors.secondary : colors.mutedForeground}
            />
            <Text className={dainikKrantiClasses.solarLabelText} style={nepaliTextStyle()}>
              {item.label}
            </Text>
          </View>
          <Text
            className={cn(
              dainikKrantiClasses.solarValue,
              item.highlight ? dainikKrantiClasses.solarValueBela : dainikKrantiClasses.solarValuePlain,
            )}
            style={nepaliTextStyle()}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
