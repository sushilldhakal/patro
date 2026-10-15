import { View } from "react-native";
import { usePathname } from "expo-router";
import { useMobileNavMenu } from "@vedic-patro/features/common";
import type { PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { resolveDrawerIcon, type DrawerIconName } from "@/lib/drawer-icons";
import { elementHref } from "@/lib/element-routes";
import { isNavActive, normalizeMobilePathname } from "@/lib/mobile-nav";
import { siteLinkHref } from "@/lib/related-page-links";
import { DrawerNavSection, NavDrawerLinkCard } from "./NavDrawerLinkCard";

type Tile = { id: string; href: string; label: string; icon: DrawerIconName };

/** Main row routes in this app (ids from the shared menu). */
const MAIN_HREF: Record<string, string> = {
  home: "/",
  panchanga: "/panchanga",
  kundali: "/kundali",
  dainikkranti: "/dainikkranti",
  "kundali-milan": "/jyotish/kundali-milan",
  rashifal: "/rashifal",
  "panchanga-year": "/panchanga/year",
  vastu: "/vastu",
  learn: "/learn",
  documents: "/documents",
  shanti: "/shanti-vidhi",
  more: "/more",
};

/** Sidebar items whose route in this app differs from the website's `to`. */
const ITEM_HREF: Record<string, string> = {
  "kundali-milan": "/kundali-milan",
  rashifal: "/rashifal",
};

/** Icon each Main tile is drawn with (the website's drawer icons). */
const MAIN_ICON_SECTION: Record<string, string> = {
  kundali: "jyotish",
  dainikkranti: "patro",
  "kundali-milan": "jyotish",
  rashifal: "jyotish",
  "panchanga-year": "patro",
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

export function MobileNavMenu({
  onNavigate,
}: {
  onNavigate: (href: string) => void;
}) {
  const menu = useMobileNavMenu();
  const pathname = usePathname();

  const mainTiles: Tile[] = [...menu.main, ...menu.appOnly.mainExtra].map(({ id, label }) => ({
    id,
    label,
    href: MAIN_HREF[id] ?? "/",
    icon: resolveDrawerIcon(MAIN_ICON_SECTION[id] ?? "main", id),
  }));

  const renderTile = (tile: Tile) => (
    <NavDrawerLinkCard
      key={tile.id}
      label={tile.label}
      icon={tile.icon}
      active={itemActive(pathname, tile.href)}
      onPress={() => onNavigate(tile.href)}
    />
  );

  return (
    <View className="gap-1 pb-2 pt-2">
      <DrawerNavSection first title={menu.mainTitle}>
        {mainTiles.map(renderTile)}
      </DrawerNavSection>
      {menu.sections.map((section) => {
        const tiles: Tile[] = section.items.map(({ item, label }) => ({
          id: item.id,
          label,
          href: itemHref(item),
          icon: resolveDrawerIcon(section.id, item.id),
        }));
        // Tiles only the app has.
        if (section.id === "patro") {
          tiles.push({ id: "reminders", label: menu.appOnly.reminders, href: "/reminders", icon: "calendar-clock" });
        }
        if (section.id === "graha") {
          tiles.unshift({
            id: "aakash-gochar",
            label: menu.appOnly.aakashGochar,
            href: "/aakash-gochar",
            icon: resolveDrawerIcon("graha", "aakash-gochar"),
          });
        }
        return (
          <DrawerNavSection key={section.id} title={section.title}>
            {tiles.map(renderTile)}
          </DrawerNavSection>
        );
      })}
    </View>
  );
}
