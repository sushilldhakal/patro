import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Leaf, type LucideIcon } from "lucide-react";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useLocale } from "@/i18n/locale";
import { featureIcon, navEntryIcon } from "@/lib/nav-icons";
import { resolveSidebarLinkPath } from "@/lib/panchanga-route-preload";
import { useCurrentRitu } from "@/lib/ritu-display";
import { currentPatroYearLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";
import { parseEraFromUrl } from "@vedic-patro/domain/calendar/era";
import type { FeatureId } from "@vedic-patro/icons";
import { useMobileNavMenu } from "@vedic-patro/features/common";
import type { NavCategoryId, PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { cn } from "@vedic-patro/design-tokens/cn";
import { navMenuClasses } from "@vedic-patro/design-tokens/classes/shell/nav-menu-classes";
import { MobileNavMenu as MobileNavMenuView, type MobileNavItem, type MobileNavSection } from "@vedic-patro/ui/kit/shell";

const TILE_ICON = "shrink-0 text-danger dark:text-danger";

const MAIN_ROUTES: { id: FeatureId; to: string; withSearch?: boolean }[] = [
  { id: "home", to: "/" },
  { id: "panchanga", to: "/panchanga", withSearch: true },
  { id: "kundali", to: "/kundali" },
  { id: "dainikkranti", to: "/dainikkranti", withSearch: true },
  { id: "kundali-milan", to: "/jyotish/kundali-milan" },
  { id: "rashifal", to: "/jyotish/rashifal" },
  { id: "panchanga-year", to: "/panchanga/year", withSearch: true },
  { id: "vastu", to: "/vastu" },
  { id: "learn", to: "/learn" },
  { id: "documents", to: "/documents" },
];

function TileIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={28} strokeWidth={1.75} className={TILE_ICON} aria-hidden />;
}

function itemSearch(
  item: PanchangaSidebarItem,
  location: ReturnType<typeof usePanchangaLocation>["location"],
  era: ReturnType<typeof useCalendarEra>,
  urlBrowse: { year?: number; month?: number },
): Record<string, unknown> | undefined {
  if (item.id === "kundali" || item.id === "kundali-milan" || item.id === "rashifal" || item.id === "avakahada" || item.id === "converter") {
    return undefined;
  }
  if (item.id === "panchak-patro" || item.id === "adhik-maas") {
    return currentPatroYearLinkSearch(location, era) as Record<string, unknown>;
  }
  const path = item.params ? resolveSidebarLinkPath(item.to, item.params) : item.to;
  return patroRouteLinkSearch(path, location, era, urlBrowse) as Record<string, unknown>;
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Drawer tiles. The drawing is `@vedic-patro/ui/kit/shell`; this file supplies the route and the icon. */
export function MobileNavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const menu = useMobileNavMenu();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { lang } = useLocale();
  const era = useCalendarEra();
  const { location } = usePanchangaLocation();
  const rawSearch = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const urlBrowse = parseEraFromUrl(rawSearch, lang === "en" ? "en" : "ne");
  const { current: ritu, loading: rituLoading } = useCurrentRitu(location);
  const mainLabel = Object.fromEntries(menu.main.map((m) => [m.id, m.label])) as Record<string, string>;
  const browse = { year: urlBrowse.year, month: urlBrowse.month };

  const go = (to: string, search?: Record<string, unknown>, params?: Record<string, string>) => () => {
    navigate({ to, search, params } as never);
    onNavigate?.();
  };

  const mainTile = (id: FeatureId): MobileNavItem => {
    const route = MAIN_ROUTES.find((r) => r.id === id)!;
    return {
      key: route.id,
      label: mainLabel[route.id] ?? route.id,
      icon: <TileIcon icon={featureIcon(route.id)} />,
      active: isActive(pathname, route.to),
      onPress: go(route.to, route.withSearch ? (patroRouteLinkSearch(route.to, location, era, browse) as Record<string, unknown>) : undefined),
    };
  };

  /* The same three tabs as the app's side menu: each category's sidebar sections, with home at the
     head of the calendar tab, the daily panchanga at the head of the day tables, and vastu and
     learn closing the jyotish tab. */
  const categories = menu.categories.map((category) => {
    const sections: MobileNavSection[] = category.sections.map((section) => {
      const items = section.items.map(({ item, label }): MobileNavItem => {
        const search = itemSearch(item, location, era, browse);
        const to = item.params ? resolveSidebarLinkPath(item.to, item.params) : item.to;
        const icon = item.id === "ritu"
          ? rituLoading || !ritu?.emoji
            ? <Leaf size={28} strokeWidth={1.75} className={TILE_ICON} aria-hidden />
            : <span className="text-sm leading-none" aria-hidden>{ritu.emoji}</span>
          : <TileIcon icon={navEntryIcon(section.id, item.id)} />;
        return {
          key: item.id,
          label,
          icon,
          active: isActive(pathname, to),
          onPress: go(item.to, search, item.params),
        };
      });
      if (section.id === "patro") items.unshift(mainTile("home"));
      if (section.id === "tables") items.unshift(mainTile("panchanga"));
      return { id: section.id, title: section.title, items };
    });
    if (category.id === "jyotish") {
      sections.push({ id: "more", title: menu.appOnly.mainExtra.find((m) => m.id === "more")?.label ?? "", items: [mainTile("vastu"), mainTile("learn")] });
    }
    return { category, sections };
  });

  // Open on the tab that holds the page being looked at.
  const [tab, setTab] = useState<NavCategoryId>(
    () => categories.find(({ sections }) => sections.some((s) => s.items.some((i) => i.active)))?.category.id ?? "calendar",
  );
  const current = categories.find(({ category }) => category.id === tab) ?? categories[0]!;

  return (
    <div className="flex flex-col gap-1">
      <div role="tablist" aria-label={menu.navAria} className={navMenuClasses.tabs}>
        {categories.map(({ category }) => {
          const active = category.id === tab;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={category.title}
              onClick={() => setTab(category.id)}
              className={cn(navMenuClasses.tab, active ? navMenuClasses.tabOn : navMenuClasses.tabOff)}
            >
              {category.shortTitle}
            </button>
          );
        })}
      </div>
      <h2 className={navMenuClasses.categoryTitle}>{current.category.title}</h2>
      <MobileNavMenuView label={menu.navAria} sections={current.sections} />
    </div>
  );
}
