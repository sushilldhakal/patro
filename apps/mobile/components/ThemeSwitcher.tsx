import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

/**
 * One button that flips between light and dark, like the website's ThemeToggle:
 * in dark it offers Light (sun), in light it offers Dark (moon). `showLabel`
 * adds the name of the theme it will switch to. Choosing a theme here replaces
 * the "follow the system" preference, as it does on the website.
 */
export function ThemeSwitcher({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const { isDark, setPreference, colors } = useTheme();
  const { pick } = useLocale();

  const target = isDark ? "light" : "dark";
  const targetLabel = isDark ? pick("उज्यालो", "Light") : pick("अँध्यारो", "Dark");

  return (
    <Pressable
      onPress={() => setPreference(target)}
      className={cn(
        "h-9 shrink-0 flex-row items-center justify-center rounded-lg border border-border bg-card active:bg-muted",
        showLabel ? "gap-2 px-3" : "w-9",
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel={pick(`${targetLabel} थिममा बदल्नुहोस्`, `Switch to ${targetLabel} theme`)}
    >
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={16} color={colors.foreground} />
      {showLabel ? <Text className="text-xs font-semibold">{targetLabel}</Text> : null}
    </Pressable>
  );
}
