import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { FLOATING_NAV, isNavActive, normalizeMobilePathname } from "@/lib/mobile-nav";
import { getPanchangaSidebarSections } from "@vedic-patro/features/panchanga";
import { resolveNavIcon } from "@vedic-patro/icons";
import { sidebarHref } from "@/components/panchanga/PanchangaSidebarNav";
import { useNavPress } from "@/lib/use-nav-press";
import { useLocale } from "@/lib/i18n";
import { requestOpenMenu } from "@/lib/menu-request";
import { navSideWidth, type NavMode } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { withAlpha } from "@vedic-patro/design-tokens";
import { haptics } from "@vedic-patro/ui/motion";

/**
 * The fixed main menu on a big screen, in place of the floating bottom bar: a sidebar with the icon
 * and name side by side (wide window, iPad landscape), or a slim rail with the name under the icon
 * (iPad portrait). Same tabs as the bar, and "More" opens the side menu for everything else.
 */
export function AppSidebar({ mode }: { mode: Exclude<NavMode, "floating"> }) {
  const pathname = usePathname();
  const navPress = useNavPress();
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const wide = mode === "sidebar";
  const iconSize = wide ? 22 : 24;
  // The page's own group (hora → the daily tables, vivah → the ceremonies…), the same set the
  // floating bar switches to, so its neighbours are one tap away.
  const path = normalizeMobilePathname(pathname);
  const inGroup = (href: string) => path === href || path.startsWith(`${href}/`);
  const sections = getPanchangaSidebarSections();
  const group =
    path === "/sait"
      ? sections.find((sec) => sec.id === "sait")
      : sections.find((sec) => sec.items.some((entry) => inGroup(sidebarHref(entry))));

  const item = (key: string, label: string, icon: ReactNode, active: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={wide ? "flex-row items-center gap-3 rounded-2xl px-3 py-3 active:opacity-70" : "items-center gap-1 rounded-2xl px-1 py-2.5 active:opacity-70"}
      style={active ? { backgroundColor: withAlpha(colors.foreground, 0.08) } : undefined}
    >
      {icon}
      <Text
        numberOfLines={1}
        // One line, English or Nepali: a long name shrinks a little instead of breaking in two.
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        className={`${wide ? "flex-1 text-base" : "text-center text-caption"} font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}
        style={nepaliTextStyle()}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View
      className="border-r border-border bg-card"
      style={{ width: navSideWidth(mode), paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, paddingLeft: insets.left }}
    >
      <ScrollView contentContainerClassName={wide ? "gap-1 px-3" : "gap-1 px-1.5"} showsVerticalScrollIndicator={false}>
        {FLOATING_NAV.map((nav) => {
          const active = isNavActive(pathname, nav.href);
          return item(
            nav.href,
            pick(nav.ne, nav.en),
            <AppNavIcon name={nav.icon} size={iconSize} color={active ? colors.foreground : colors.mutedForeground} />,
            active,
            () => navPress(nav.href),
          );
        })}
        {group ? (
          <>
            <View className="mx-2 my-2 h-px bg-border" />
            <Text
              numberOfLines={1}
              className={`${wide ? "px-3 text-sm" : "text-center text-caption"} font-bold uppercase text-muted-foreground`}
              style={nepaliTextStyle()}
            >
              {t(group.titleKey)}
            </Text>
            {group.items.map((entry) => {
              const href = sidebarHref(entry);
              const active = inGroup(href);
              return item(
                `${group.id}:${entry.id}`,
                t(entry.labelKey),
                <AppNavIcon name={resolveNavIcon(group.id, entry.id)} size={iconSize} color={active ? colors.foreground : colors.mutedForeground} />,
                active,
                () => navPress(href),
              );
            })}
            <View className="mx-2 my-2 h-px bg-border" />
          </>
        ) : null}
        {item(
          "more",
          t("ui.more.more"),
          <Ionicons name="grid-outline" size={iconSize} color={colors.mutedForeground} />,
          false,
          () => {
            haptics.tick();
            requestOpenMenu();
          },
        )}
      </ScrollView>
    </View>
  );
}
