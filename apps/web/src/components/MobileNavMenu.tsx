import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Sprout, type LucideIcon } from "lucide-react";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useLocale } from "@/i18n/locale";
import { featureIcon, navEntryIcon } from "@/lib/nav-icons";
import { resolveSidebarLinkPath } from "@/lib/panchanga-route-preload";
import { useCurrentRitu } from "@/lib/ritu-display";
import { currentPatroYearLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";
import { parseEraFromUrl } from "@vedic-patro/domain/era";
import type { FeatureId } from "@vedic-patro/icons";
import { useMobileNavMenu } from "@vedic-patro/features/common";
import type { PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
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
  if (item.id === "panchak-patro") {
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

  const sections: MobileNavSection[] = [
    {
      id: "main",
      title: menu.mainTitle,
      items: MAIN_ROUTES.map((route) => ({
        key: route.id,
        label: mainLabel[route.id] ?? route.id,
        icon: <TileIcon icon={featureIcon(route.id)} />,
        active: isActive(pathname, route.to),
        onPress: go(route.to, route.withSearch ? (patroRouteLinkSearch(route.to, location, era, browse) as Record<string, unknown>) : undefined),
      })),
    },
    ...menu.sections.map((section): MobileNavSection => ({
      id: section.id,
      title: section.title,
      items: section.items.map(({ item, label }): MobileNavItem => {
        const search = itemSearch(item, location, era, browse);
        const to = item.params ? resolveSidebarLinkPath(item.to, item.params) : item.to;
        const icon = item.id === "ritu"
          ? rituLoading || !ritu?.emoji
            ? <Sprout size={28} strokeWidth={1.75} className={TILE_ICON} aria-hidden />
            : <span className="text-sm leading-none" aria-hidden>{ritu.emoji}</span>
          : <TileIcon icon={navEntryIcon(section.id, item.id)} />;
        return {
          key: item.id,
          label,
          icon,
          active: isActive(pathname, to),
          onPress: go(item.to, search, item.params),
        };
      }),
    })),
  ];

  return <MobileNavMenuView label={menu.navAria} sections={sections} />;
}
