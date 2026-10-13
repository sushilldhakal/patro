import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

/** Offline download, language, and theme — last block of the sidebar scroll. */
export function MenuPreferences({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <View className="gap-3">
      <Pressable
        onPress={() => onNavigate("/offline")}
        className="flex-row items-center justify-between gap-3 active:opacity-70"
        accessibilityRole="button"
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Ionicons name="cloud-download-outline" size={18} color={colors.foreground} />
          <Text className="text-sm text-foreground">{t("ui.navigation.offline_download")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </Pressable>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm text-foreground">{t("language")}</Text>
        <LanguageSwitcher />
      </View>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm text-foreground">{t("ui.common.theme")}</Text>
        <ThemeSwitcher showLabel />
      </View>
    </View>
  );
}
