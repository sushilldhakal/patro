import { useEffect, useMemo, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useLocale } from "@/i18n/locale";
import {
  preloadAllPanchangaRoutes,
  preloadPanchangaRoute,
  resolveSidebarLinkPath,
} from "@/lib/panchanga-route-preload";
import { usePanchangaSidebarNav, type PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { KundaliSidebarSubnav, parseKundaliSectionFromHash } from "@/components/panchanga/KundaliSidebarSubnav";
import { parseKundaliProfileId } from "@vedic-patro/domain/jyotish/kundali/kundali-routes";
import { buildPageSearch, getLanguageForEra, parseEraFromUrl, type EraSelection } from "@vedic-patro/domain/calendar/era";
import { locationSearchFingerprint, locationToSearch, patroRouteLinkSearch, sameLocationParams, searchToLocation, validateLocationSearch } from "@/lib/url-state";
import type { CalendarEra } from "@/lib/patro-era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { PanchangaSidebarNav as SidebarNav, type PanchangaSidebarLinkArgs } from "@vedic-patro/ui/kit/panchanga";

const YEAR_SCOPED_PATHS = new Set([
  "/holidays",
  "/suryakranti",
  "/panchak-patro",
  "/panchanga/graha-asta",
  "/panchanga/graha-vakri",
  "/panchanga/chandra-grahan",
  "/panchanga/surya-grahan",
]);

function normalizeRoutePath(route: string): string {
  return route.replace(/\/$/, "");
}

function isYearScopedPath(path: string): boolean {
  if (YEAR_SCOPED_PATHS.has(normalizeRoutePath(path))) return true;
  return normalizeRoutePath(path).startsWith("/sait/");
}

function itemSearch(
  item: PanchangaSidebarItem,
  location: ReturnType<typeof usePanchangaLocation>["location"],
  active: EraSelection,
): Record<string, unknown> | undefined {
  if (item.id === "kundali" || item.id === "kundali-milan" || item.id === "avakahada" || item.id === "converter") {
    return undefined;
  }
  const path = item.params ? resolveSidebarLinkPath(item.to, item.params) : item.to;
  if (item.id === "panchak-patro" || isYearScopedPath(path)) {
    return buildPageSearch(
      { era: active.era, language: getLanguageForEra(active.era), year: active.year },
      locationToSearch(location) as Record<string, unknown>,
    ) as Record<string, unknown>;
  }
  return patroRouteLinkSearch(path, location, active.era as CalendarEra, { year: active.year, month: active.month });
}

function SidebarAnchor({ item, search, onPrefetch, className, children }: PanchangaSidebarLinkArgs & { item: PanchangaSidebarItem; search?: Record<string, unknown> }) {
  const linkProps = item.params
    ? { to: item.to as "/panchanga/element/$name" | "/sait/$category", params: item.params }
    : { to: item.to as "/" };
  return (
    <Link {...linkProps} {...(search ? { search } : {})} onMouseEnter={onPrefetch} onFocus={onPrefetch} className={className}>
      {children}
    </Link>
  );
}

/** Binds the shared sidebar drawing to TanStack Router, prefetch, and the location search. */
export function PanchangaSidebarNav({ className }: { className?: string }) {
  const { lang } = useLocale();
  const { location, setLocation } = usePanchangaLocation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rawSearch = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const validatedLocationSearch = useMemo(() => validateLocationSearch(rawSearch), [rawSearch]);
  const urlLocation = useMemo(() => searchToLocation(validatedLocationSearch), [validatedLocationSearch]);
  const locationForLinks = urlLocation ?? location;
  const seenUrlLocationRef = useRef<string | null>(null);

  useEffect(() => {
    const fp = locationSearchFingerprint(validatedLocationSearch);
    const prev = seenUrlLocationRef.current;
    seenUrlLocationRef.current = fp;
    if (prev !== null && fp === prev) return;
    if (!urlLocation) return;
    if (!sameLocationParams(urlLocation.params, location.params)) setLocation(urlLocation);
  }, [validatedLocationSearch, urlLocation, location, setLocation]);

  const hash = useRouterState({ select: (s) => s.location.hash });
  const fallbackLang = lang === "en" ? "en" : "ne";
  const activeEraSelection = parseEraFromUrl(rawSearch, fallbackLang);
  const nav = usePanchangaSidebarNav({ pathname });
  const kundaliProfileId = parseKundaliProfileId(pathname);
  const kundaliSectionId = parseKundaliSectionFromHash(hash);

  useEffect(() => {
    const run = () => preloadAllPanchangaRoutes();
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(run, 400);
    return () => globalThis.clearTimeout(id);
  }, []);

  return (
    <SidebarNav
      className={className}
      title={nav.navTitle}
      label={nav.navAria}
      sections={nav.sections.map((section) => ({
        id: section.id,
        title: section.title,
        expanded: section.expanded,
        hasActive: section.hasActive,
        onToggle: section.toggle,
        items: section.items.map(({ item, label, blurb, active }) => ({
          id: item.id,
          label,
          blurb,
          active,
          onPrefetch: () => preloadPanchangaRoute(resolveSidebarLinkPath(item.to, item.params)),
          renderLink: (args) => (
            <SidebarAnchor item={item} search={itemSearch(item, locationForLinks, activeEraSelection)} {...args} />
          ),
          trailing:
            item.id === "kundali" && kundaliProfileId != null ? (
              <KundaliSidebarSubnav profileId={kundaliProfileId} activeSectionId={kundaliSectionId} />
            ) : null,
        })),
      }))}
    />
  );
}
