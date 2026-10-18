import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";

/**
 * One button that flips between light and dark, like the website's ThemeToggle:
 * in dark it offers Light (sun), in light it offers Dark (moon). `showLabel`
 * adds the name of the theme it will switch to. Choosing a theme here replaces
 * the "follow the system" preference, as it does on the website.
 */
export function ThemeSwitcher({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const { isDark, setPreference, colors } = useTheme();
  const { t } = useLocale();

  const target = isDark ? "light" : "dark";
  const targetLabel = isDark ? t("theme_light") : t("theme_dark");

  return (
    <Pressable
      onPress={() => setPreference(target)}
      className={cn(
        "h-9 shrink-0 flex-row items-center justify-center rounded-lg border border-border bg-card active:bg-muted",
        showLabel ? "gap-2 px-3" : "w-9",
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel={t("ui.theme_switcher.switch_to_targetlabel_theme", { targetLabel })}
    >
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={16} color={colors.foreground} />
      {showLabel ? <Text className="text-xs font-semibold">{targetLabel}</Text> : null}
    </Pressable>
  );
}
