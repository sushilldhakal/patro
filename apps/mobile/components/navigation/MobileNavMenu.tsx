import { usePathname } from "expo-router";
import { useMobileNavMenu } from "@vedic-patro/features/common";
import type { PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { MobileNavMenu as MobileNavMenuView, type MobileNavItem, type MobileNavSection } from "@vedic-patro/ui/kit/shell";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { resolveDrawerIcon, type DrawerIconName } from "@/lib/drawer-icons";
import { elementHref } from "@/lib/element-routes";
import { isNavActive, normalizeMobilePathname } from "@/lib/mobile-nav";
import { siteLinkHref } from "@/lib/related-page-links";
import { useThemeColors } from "@/lib/theme-context";

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

/** Drawer tiles. The drawing is `@vedic-patro/ui/kit/shell`; this file supplies the route and the icon. */
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

  const main: MobileNavSection = {
    id: "main",
    title: menu.mainTitle,
    items: [...menu.main, ...menu.appOnly.mainExtra].map(({ id, label }) =>
      tile(id, label, MAIN_HREF[id] ?? "/", resolveDrawerIcon(MAIN_ICON_SECTION[id] ?? "main", id)),
    ),
  };

  const sections: MobileNavSection[] = [
    main,
    ...menu.sections.map((section) => {
      const items = section.items.map(({ item, label }) =>
        tile(item.id, label, itemHref(item), resolveDrawerIcon(section.id, item.id)),
      );
      if (section.id === "patro") {
        items.push(tile("reminders", menu.appOnly.reminders, "/reminders", "calendar-clock"));
      }
      if (section.id === "graha") {
        items.unshift(tile("aakash-gochar", menu.appOnly.aakashGochar, "/aakash-gochar", resolveDrawerIcon("graha", "aakash-gochar")));
      }
      return { id: section.id, title: section.title, items };
    }),
  ];

  return <MobileNavMenuView label={menu.navAria} sections={sections} />;
}
