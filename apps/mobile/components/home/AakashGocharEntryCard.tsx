import { Pressable, View } from "react-native";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { cn } from "@vedic-patro/domain/utils";

/** Entry card to the 3D sky — sits directly under the calendar (and today's card) like on the web. */
export function AakashGocharEntryCard() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useLocale();
  return (
    <Pressable
      onPress={() => router.push("/aakash-gochar")}
      className={cn(homeClasses.aakashCard, "active:opacity-80")}
      accessibilityRole="button"
      accessibilityLabel={t("sidebar_nav.items.aakash-gochar.label")}
    >
      <AppNavIcon name="orbit" size={20} color={colors.secondary} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-foreground" style={nepaliTextStyle()}>
          {t("sidebar_nav.items.aakash-gochar.label")}
        </Text>
      </View>
      <Text className="shrink-0 text-xs text-muted-foreground" style={nepaliTextStyle()}>
        {t("ui.home.geocentric")}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}
