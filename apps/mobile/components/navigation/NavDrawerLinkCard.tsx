import { Pressable, useWindowDimensions, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { ReactNode } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DrawerIconName } from "@/lib/drawer-icons";

/** Compact drawer tile — 3 per row under 540px, 4 per row above. */
export function NavDrawerLinkCard({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: DrawerIconName;
  active?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const threeCol = width < 540;
  return (
    <Pressable
      onPress={onPress}
      /* Fixed height + flat percentage width so a long label cannot grow the
       * tile. 3 columns under 540px; 4 columns from there up. */
      style={{ width: threeCol ? "31.3%" : "22.8%", height: 100 }}
      className="shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden bg-transparent px-0.5 py-1 active:opacity-70"
    >
      <View
        className="size-12 items-center justify-center rounded-full"
        style={{ backgroundColor: active ? colors.tabActive : colors.muted }}
      >
        <AppNavIcon name={icon} size={26} color={active ? colors.secondary : colors.danger} />
      </View>
      <Text
        className={cn(
          "text-caption w-full text-center font-bold text-foreground",
          active && "text-secondary",
        )}
        numberOfLines={2}
        style={nepaliTextStyle(13)}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DrawerNavSection({
  title,
  children,
  first,
}: {
  title: string;
  children: ReactNode;
  first?: boolean;
}) {
  const { lang } = useLocale();
  const colors = useThemeColors();
  return (
    <View
      className={cn("px-3 pb-5", first ? "pt-1" : "border-t border-border/50 pt-4")}
    >
      <View className="mb-3">
        <Text
          className="text-caption font-semibold tracking-wide text-foreground"
          style={lang === "en" ? undefined : nepaliTextStyle(14)}
        >
          {title}
        </Text>
        <View
          className="mt-1.5 h-0.5 w-7 rounded-full"
          style={{ backgroundColor: colors.primary }}
        />
      </View>
      <View className="flex-row flex-wrap gap-2.5">{children}</View>
    </View>
  );
}
