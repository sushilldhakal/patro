import { Pressable, View } from "react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { APP_VERSION } from "@/lib/store-links";

/**
 * Which build and which over-the-air update is running: version (build) ·
 * channel · update id and publish time, or the bundle the build shipped with.
 * So a tester can tell at a glance whether the latest push has arrived.
 */
function runningBuildLine(): string {
  const build = `${APP_VERSION} (${Application.nativeBuildVersion ?? "?"})`;
  // Dev and simulator builds report an empty channel; show a dash rather than "· ·".
  const channel = Updates.channel || "—";
  const update =
    Updates.isEmbeddedLaunch || !Updates.updateId
      ? "embedded"
      : [Updates.updateId.slice(0, 8), Updates.createdAt?.toISOString().slice(0, 16).replace("T", " ")]
          .filter(Boolean)
          .join(" · ");
  return `${build} · ${channel} · ${update}`;
}

/**
 * The foot of the side menu: one row to the profile page, which holds the settings (language, calendar,
 * theme, offline data), and the running build for testers.
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
      <Text className="text-xs text-muted-foreground" selectable>
        {runningBuildLine()}
      </Text>
    </View>
  );
}
