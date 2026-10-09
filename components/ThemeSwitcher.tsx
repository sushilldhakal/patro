import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useTheme, type ThemePreference } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const BTN =
  "h-9 items-center justify-center rounded-lg border border-border bg-card active:bg-muted shrink-0";

const OPTIONS: {
  value: ThemePreference;
  icon: keyof typeof Ionicons.glyphMap;
  ne: string;
  en: string;
}[] = [
  { value: "system", icon: "phone-portrait-outline", ne: "सिस्टम", en: "System" },
  { value: "light", icon: "sunny-outline", ne: "उज्यालो", en: "Light" },
  { value: "dark", icon: "moon-outline", ne: "अँध्यारो", en: "Dark" },
];

/**
 * `showLabel` renders a System | Light | Dark segmented control; otherwise a compact
 * icon button that cycles System → Light → Dark.
 */
export function ThemeSwitcher({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const { preference, setPreference, colors } = useTheme();
  const { pick } = useLocale();

  if (showLabel) {
    return (
      <View
        className={cn("flex-row overflow-hidden rounded-lg border border-border bg-card", className)}
        accessibilityRole="radiogroup"
      >
        {OPTIONS.map((o) => {
          const selected = preference === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setPreference(o.value)}
              className="h-9 flex-row items-center gap-1.5 px-2.5 active:opacity-80"
              style={selected ? { backgroundColor: `${colors.secondary}26` } : undefined}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={pick(o.ne, o.en)}
            >
              <Ionicons
                name={o.icon}
                size={14}
                color={selected ? colors.secondary : colors.mutedForeground}
              />
              <Text
                className="text-caption font-semibold"
                style={{ color: selected ? colors.secondary : colors.foreground }}
              >
                {pick(o.ne, o.en)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const index = OPTIONS.findIndex((o) => o.value === preference);
  const current = OPTIONS[index === -1 ? 0 : index];
  const next = OPTIONS[(index + 1) % OPTIONS.length];

  return (
    <Pressable
      onPress={() => setPreference(next.value)}
      className={cn(BTN, "w-9", className)}
      accessibilityRole="button"
      accessibilityLabel={pick(
        `थिम: ${current.ne}। ${next.ne} मा बदल्नुहोस्`,
        `Theme: ${current.en}. Switch to ${next.en}`,
      )}
    >
      <Ionicons name={current.icon} size={16} color={colors.foreground} />
    </Pressable>
  );
}
