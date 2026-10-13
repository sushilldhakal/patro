import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

type Props = {
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
  className?: string;
};

const SOLAR_ITEMS = [
  {
    key: "deshaantar" as const,
    ne: "देशान्तर",
    en: "Deshaantar",
    icon: "globe-outline" as const,
  },
  {
    key: "akshamsha" as const,
    ne: "अक्षांश",
    en: "Latitude",
    icon: "navigate-outline" as const,
  },
  {
    key: "belaantar" as const,
    ne: "बेलान्तर",
    en: "Belaantar",
    icon: "time-outline" as const,
  },
];

export function PatroSolarCorrectionStrip({ deshaantar, akshamsha, belaantar, className }: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const values = { deshaantar, akshamsha, belaantar };
  const visible = SOLAR_ITEMS.filter((item) => values[item.key]);
  if (visible.length === 0) return null;

  return (
    <View className={cn(dainikKrantiClasses.solarStrip, className)}>
      {visible.map((item) => (
        <View
          key={item.key}
          className={cn(
            dainikKrantiClasses.solarItem,
            item.key === "belaantar" ? dainikKrantiClasses.solarItemBela : dainikKrantiClasses.solarItemPlain,
          )}
          style={{ maxWidth: "48%" }}
        >
          <View className={dainikKrantiClasses.solarLabel}>
            <Ionicons
              name={item.icon}
              size={14}
              color={item.key === "belaantar" ? colors.secondary : colors.mutedForeground}
            />
            <Text className={dainikKrantiClasses.solarLabelText} style={nepaliTextStyle()}>
              {pick(item.ne, item.en)}
            </Text>
          </View>
          <Text
            className={cn(
              dainikKrantiClasses.solarValue,
              item.key === "belaantar" ? dainikKrantiClasses.solarValueBela : dainikKrantiClasses.solarValuePlain,
            )}
            style={nepaliTextStyle()}
          >
            {values[item.key]}
          </Text>
        </View>
      ))}
    </View>
  );
}
