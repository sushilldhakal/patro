import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";

export function GrahaStatusLegend({ className }: { className?: string }) {
  const { t } = useLocale();
  const colors = useThemeColors();

  return (
    <View className={cn("flex-row", grahaClasses.statusLegend, className)}>
      <View className={cn("flex-row", grahaClasses.statusLegendItem)}>
        <Ionicons name="refresh" size={14} color={colors.secondary} />
        <Text className={grahaClasses.statusLegendText} style={nepaliTextStyle(13)}>
          {t("common.retrograde")}
        </Text>
      </View>
      <View className={cn("flex-row", grahaClasses.statusLegendItem)}>
        <Ionicons name="flame" size={14} color={colors.danger} />
        <Text className={grahaClasses.statusLegendText} style={nepaliTextStyle(13)}>
          {t("common.combust")}
        </Text>
      </View>
    </View>
  );
}
