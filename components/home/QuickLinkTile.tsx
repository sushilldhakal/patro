import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import type { DrawerIconName } from "@/lib/drawer-icons";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

export type QuickLink = {
  href: string;
  label: string;
  icon: DrawerIconName;
  /** Shown only on tablets, like the web's `md:` tiles. */
  description?: string;
};

/**
 * One shortcut — web `QuickLinkCard`. Phone: a content-sized chip (icon + label,
 * no description). Tablet: a square tile with the label and description.
 */
export function QuickLinkTile({ link }: { link: QuickLink }) {
  const router = useRouter();
  const colors = useThemeColors();
  const { isTablet } = useBreakpoint();

  if (isTablet) {
    return (
      <Pressable
        onPress={() => router.push(link.href as never)}
        accessibilityRole="button"
        className="aspect-square items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2.5 py-3 active:opacity-80"
        style={{ width: "18.5%", minWidth: 120 }}
      >
        <AppNavIcon name={link.icon} size={28} color={colors.danger} />
        <Text className="text-center text-sm font-bold text-foreground" style={nepaliTextStyle(14)} numberOfLines={2}>
          {link.label}
        </Text>
        {link.description ? (
          <Text className="text-center text-[11px] leading-snug text-muted-foreground" style={nepaliTextStyle(11)} numberOfLines={2}>
            {link.description}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(link.href as never)}
      accessibilityRole="button"
      className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 active:opacity-80"
      style={{ maxWidth: "100%" }}
    >
      <AppNavIcon name={link.icon} size={20} color={colors.danger} />
      <Text className="shrink text-sm font-bold text-foreground" style={nepaliTextStyle(14)} numberOfLines={1}>
        {link.label}
      </Text>
    </Pressable>
  );
}

/** Section heading + wrapping tiles — left-aligned on phones, centred on tablets (as on the web). */
export function QuickLinkSection({ title, links }: { title: string; links: QuickLink[] }) {
  const { isTablet } = useBreakpoint();
  return (
    <View>
      <Text
        className={
          isTablet
            ? "mb-3 text-center text-sm font-bold uppercase tracking-wider text-muted-foreground"
            : "mb-3 text-base font-bold text-foreground"
        }
        style={nepaliTextStyle(isTablet ? 14 : 16)}
      >
        {title}
      </Text>
      <View className={isTablet ? "flex-row flex-wrap items-stretch justify-center gap-3" : "flex-row flex-wrap items-stretch gap-2"}>
        {links.map((link) => (
          <QuickLinkTile key={link.href} link={link} />
        ))}
      </View>
    </View>
  );
}
