import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export function GrahaStatusLegend({ className }: { className?: string }) {
  const { pick } = useLocale();
  const colors = useThemeColors();

  return (
    <View className={cn("flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1", className)}>
      <View className="flex-row items-center gap-1">
        <Ionicons name="refresh" size={14} color={colors.secondary} />
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
          {pick("वक्री", "Retrograde")}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Ionicons name="flame" size={14} color={colors.danger} />
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
          {pick("अस्त", "Combust")}
        </Text>
      </View>
    </View>
  );
}
