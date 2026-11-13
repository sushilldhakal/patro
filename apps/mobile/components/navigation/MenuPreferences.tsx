import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { CalculationSystemToggle, CalendarSystemToggle } from "@vedic-patro/ui/kit/shell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

/**
 * The foot of the side menu, and the app's one way to the account now that the bottom bar has no
 * profile tab: "लगइन" while signed out, "सेटिङ" once signed in. Both open the profile page, which
 * leads with the sign-in card (signed out) and holds the settings (language, calendar, theme, offline
 * data) either way, so a signed-out reader still reaches them. The build line for testers is at the
 * foot of that page.
 *
 * Above it, the switches people reach for most — BS | AD, language, theme and Drik | Surya
 * Siddhanta — one labelled row each, so they change in one tap without opening settings. Same
 * controls and order as the website's menu.
 */
export function MenuPreferences({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  return (
    <View className="gap-4">
      <View className="gap-3">
        <PreferenceRow label={t("calendar_system.label")}>
          <CalendarSystemToggle className="h-9" />
        </PreferenceRow>
        <PreferenceRow label={t("language")}>
          <LanguageSwitcher />
        </PreferenceRow>
        <PreferenceRow label={t("theme_label")}>
          <ThemeSwitcher showLabel />
        </PreferenceRow>
        <PreferenceRow label={t("calculation_system.label")}>
          <CalculationSystemToggle className="h-9" />
        </PreferenceRow>
      </View>
      <Pressable
        onPress={() => onNavigate("/account")}
        className="flex-row items-center justify-between gap-3 active:opacity-70"
        accessibilityRole="button"
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Ionicons name={isAuthenticated ? "settings-outline" : "person-circle-outline"} size={20} color={colors.foreground} />
          <Text className="text-sm text-foreground">{isAuthenticated ? t("ui.settings.title") : t("ui.nav.log_in")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function PreferenceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-9 flex-row items-center justify-between gap-3">
      <Text className="min-w-0 flex-1 text-sm text-foreground" numberOfLines={1}>
        {label}
      </Text>
      {children}
    </View>
  );
}
