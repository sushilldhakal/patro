import { useState } from "react";
import { Pressable, View } from "react-native";
import { usePathname } from "expo-router";
import { useMobileNavMenu, type NavMenuCategory } from "@vedic-patro/features/common";
import type { NavCategoryId, PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { MobileNavMenu as MobileNavMenuView, type MobileNavItem, type MobileNavSection } from "@vedic-patro/ui/kit/shell";
import { SelectionFill } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import { resolveDrawerIcon, type DrawerIconName } from "@/lib/drawer-icons";
import { elementHref } from "@/lib/element-routes";
import { isNavActive, normalizeMobilePathname } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { siteLinkHref } from "@/lib/related-page-links";
import { useThemeColors } from "@/lib/theme-context";

/** Routes of the Main entries this menu still shows, in this app. */
const MAIN_HREF: Record<string, string> = {
  home: "/",
  panchanga: "/panchanga",
  vastu: "/vastu",
  learn: "/learn",
  shanti: "/shanti-vidhi",
  more: "/more",
};

/** Sidebar items whose route in this app differs from the website's `to`. */
const ITEM_HREF: Record<string, string> = {
  "kundali-milan": "/kundali-milan",
  rashifal: "/rashifal",
};

function itemHref(item: PanchangaSidebarItem): string {
  if (item.params?.name) return elementHref(item.params.name);
  if (item.params?.category) return siteLinkHref(`sait:${item.params.category}`);
  return ITEM_HREF[item.id] ?? item.to;
}

function itemActive(pathname: string, href: string): boolean {
  pathname = normalizeMobilePathname(pathname);
  if (href === "/") return pathname === "/" || pathname === "/index";
  return isNavActive(pathname, href);
}

/**
 * The side menu: three tabs (calendar & time, jyotish & muhurta, daily auspicious times), each with its
 * sidebar sections as tile grids. The tile drawing is `@vedic-patro/ui/kit/shell`; this file supplies the
 * routes, icons and the app's own extra entries (home, daily panchanga, reminders, 3D sky, vastu, learn…).
 */
export function MobileNavMenu({ onNavigate }: { onNavigate: (href: string) => void }) {
  const menu = useMobileNavMenu();
  const pathname = usePathname();
  const colors = useThemeColors();

  const tile = (id: string, label: string, href: string, icon: DrawerIconName): MobileNavItem => {
    const active = itemActive(pathname, href);
    return {
      key: id,
      label,
      active,
      icon: <AppNavIcon name={icon} size={28} color={active ? colors.secondary : colors.danger} />,
      onPress: () => onNavigate(href),
    };
  };
  const mainLabel = (id: string) =>
    [...menu.main, ...menu.appOnly.mainExtra].find((m) => m.id === id)?.label ?? id;
  const mainTile = (id: string) => tile(id, mainLabel(id), MAIN_HREF[id]!, resolveDrawerIcon("main", id));

  const sectionsOf = (category: NavMenuCategory): MobileNavSection[] => {
    const sections: MobileNavSection[] = category.sections.map((section) => {
      const items = section.items.map(({ item, label }) =>
        tile(item.id, label, itemHref(item), resolveDrawerIcon(section.id, item.id)),
      );
      if (section.id === "patro") {
        items.unshift(mainTile("home"));
        items.push(tile("reminders", menu.appOnly.reminders, "/reminders", resolveDrawerIcon("patro", "reminders")));
      }
      if (section.id === "graha") {
        items.unshift(tile("aakash-gochar", menu.appOnly.aakashGochar, "/aakash-gochar", resolveDrawerIcon("graha", "aakash-gochar")));
      }
      if (section.id === "tables") items.unshift(mainTile("panchanga"));
      return { id: section.id, title: section.title, items };
    });
    if (category.id === "jyotish") {
      sections.push({ id: "more", title: mainLabel("more"), items: ["vastu", "learn", "shanti", "more"].map(mainTile) });
    }
    return sections;
  };

  const all = menu.categories.map((category) => ({ category, sections: sectionsOf(category) }));
  // Open on the tab that holds the page being looked at.
  const [tab, setTab] = useState<NavCategoryId>(
    () => all.find(({ sections }) => sections.some((s) => s.items.some((i) => i.active)))?.category.id ?? "calendar",
  );
  const current = all.find(({ category }) => category.id === tab) ?? all[0]!;

  return (
    <View className="gap-1">
      <View accessibilityRole="tablist" className="mx-4 flex-row rounded-2xl bg-muted p-1">
        {all.map(({ category }) => {
          const active = category.id === tab;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={category.title}
              onPress={() => {
                if (active) return;
                haptics.tick();
                setTab(category.id);
              }}
              className="min-h-11 flex-1 items-center justify-center rounded-xl px-1 py-2"
            >
              <SelectionFill active={active} className="rounded-xl bg-card" />
              <Text
                numberOfLines={1}
                className={active ? "text-caption font-bold text-secondary" : "text-caption font-semibold text-muted-foreground"}
                style={nepaliTextStyle(14)}
              >
                {category.shortTitle}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mx-4 mt-3 text-body font-bold text-foreground" style={nepaliTextStyle(17)}>
        {current.category.title}
      </Text>
      <MobileNavMenuView label={menu.navAria} sections={current.sections} />
    </View>
  );
}
