import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

/**
 * The foot of the side menu: one row to the profile page, which holds the settings (language, calendar,
 * theme, offline data). The running build line for testers sits at the foot of that page, not here.
 */
export function MenuPreferences({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <View className="gap-3">
      <Pressable
        onPress={() => onNavigate("/account")}
        className="flex-row items-center justify-between gap-3 active:opacity-70"
        accessibilityRole="button"
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Ionicons name="person-circle-outline" size={20} color={colors.foreground} />
          <Text className="text-sm text-foreground">{t("ui.navigation.profile_and_settings")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}
