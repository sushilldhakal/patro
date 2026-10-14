import { useEffect, useMemo, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/i18n/locale";
import {
  preloadAllPanchangaRoutes,
  preloadPanchangaRoute,
  resolveSidebarLinkPath,
} from "@/lib/panchanga-route-preload";
import {
  usePanchangaSidebarNav,
  type PanchangaSidebarItem,
} from "@vedic-patro/features/panchanga";
import {
  KundaliSidebarSubnav,
  parseKundaliSectionFromHash,
} from "@/components/panchanga/KundaliSidebarSubnav";
import { parseKundaliProfileId } from "@vedic-patro/domain/kundali/kundali-routes";
import {
  buildPageSearch,
  getLanguageForEra,
  parseEraFromUrl,
  type EraSelection,
} from "@vedic-patro/domain/era";
import { locationSearchFingerprint, locationToSearch, patroRouteLinkSearch, sameLocationParams, searchToLocation, validateLocationSearch } from "@/lib/url-state";
import type { CalendarEra } from "@/lib/patro-era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

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
  const normalized = normalizeRoutePath(path);
  if (YEAR_SCOPED_PATHS.has(normalized)) return true;
  return normalized.startsWith("/sait/");
}

function itemSearch(
  item: PanchangaSidebarItem,
  location: ReturnType<typeof usePanchangaLocation>["location"],
  active: EraSelection,
): Record<string, unknown> | undefined {
  if (item.id === "kundali" || item.id === "kundali-milan" || item.id === "avakahada" || item.id === "converter") {
    return undefined;
  }

  const path = item.params
    ? resolveSidebarLinkPath(item.to, item.params)
    : item.to;

  if (item.id === "panchak-patro" || isYearScopedPath(path)) {
    return buildPageSearch(
      {
        era: active.era,
        language: getLanguageForEra(active.era),
        year: active.year,
      },
      locationToSearch(location) as Record<string, unknown>,
    ) as Record<string, unknown>;
  }

  return patroRouteLinkSearch(path, location, active.era as CalendarEra, {
    year: active.year,
    month: active.month,
  });
}

function SidebarLink({
  item,
  active,
  label,
  blurb,
  search,
  onPrefetch,
  asListItem = true,
}: {
  item: PanchangaSidebarItem;
  active: boolean;
  label: string;
  blurb?: string;
  search?: Record<string, unknown>;
  onPrefetch: () => void;
  asListItem?: boolean;
}) {
  const linkProps = item.params
    ? { to: item.to as "/panchanga/element/$name" | "/sait/$category", params: item.params }
    : { to: item.to as "/" };

  const link = (
    <Link
      {...linkProps}
      {...(search ? { search } : {})}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={cn(
        "block text-left transition-colors",
        panchangaPageClasses.sidebar.link,
        active
          ? "bg-secondary/12 text-secondary ring-1 ring-secondary/25"
          : "text-foreground hover:bg-muted",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className={cn("block font-medium", panchangaPageClasses.sidebar.linkLabel)}>{label}</span>
      {blurb ? (
        <span className={cn("block", panchangaPageClasses.sidebar.linkBlurb)}>
          {blurb}
        </span>
      ) : null}
    </Link>
  );

  return asListItem ? <li>{link}</li> : link;
}

type SidebarSectionData = ReturnType<typeof usePanchangaSidebarNav>["sections"][number];

function SidebarSection({
  section,
  location,
  kundaliProfileId,
  kundaliSectionId,
  activeEraSelection,
}: {
  section: SidebarSectionData;
  location: ReturnType<typeof usePanchangaLocation>["location"];
  kundaliProfileId: string | null;
  kundaliSectionId: ReturnType<typeof parseKundaliSectionFromHash>;
  activeEraSelection: EraSelection;
}) {
  const { expanded, hasActive } = section;
  return (
    <section className={panchangaPageClasses.sidebar.section}>
      <button
        type="button"
        onClick={section.toggle}
        aria-expanded={expanded}
        className={cn(
          "flex text-left transition-colors",
          panchangaPageClasses.sidebar.sectionHead,
          expanded || hasActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          hasActive && !expanded && "bg-secondary/6 text-secondary",
        )}
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            expanded ? "rotate-0" : "-rotate-90",
            hasActive ? "text-secondary" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <span className={panchangaPageClasses.sidebar.sectionTitle}>{section.title}</span>
      </button>

      {section.items.length > 0 ? (
        <ul className={cn("flex flex-col", panchangaPageClasses.sidebar.list)}>
          {section.items.map(({ item, label, blurb, active }) => (
            <li key={item.id} className={cn("flex flex-col", panchangaPageClasses.sidebar.item)}>
              <SidebarLink
                item={item}
                active={active}
                label={label}
                blurb={blurb}
                search={itemSearch(item, location, activeEraSelection)}
                onPrefetch={() => preloadPanchangaRoute(resolveSidebarLinkPath(item.to, item.params))}
                asListItem={false}
              />
              {item.id === "kundali" && kundaliProfileId != null ? (
                <KundaliSidebarSubnav profileId={kundaliProfileId} activeSectionId={kundaliSectionId} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function PanchangaSidebarNav({ className }: { className?: string }) {
  const { lang } = useLocale();
  const { location, setLocation } = usePanchangaLocation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rawSearch = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const validatedLocationSearch = useMemo(
    () => validateLocationSearch(rawSearch),
    [rawSearch],
  );
  const urlLocation = useMemo(
    () => searchToLocation(validatedLocationSearch),
    [validatedLocationSearch],
  );
  const locationForLinks = urlLocation ?? location;
  const seenUrlLocationRef = useRef<string | null>(null);

  useEffect(() => {
    const fp = locationSearchFingerprint(validatedLocationSearch);
    const prev = seenUrlLocationRef.current;
    seenUrlLocationRef.current = fp;
    if (prev !== null && fp === prev) return;
    if (!urlLocation) return;
    if (!sameLocationParams(urlLocation.params, location.params)) {
      setLocation(urlLocation);
    }
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
    <nav
      className={cn(
        panchangaPageClasses.sidebar.nav,
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
        className,
      )}
      aria-label={nav.navAria}
    >
      <p className={panchangaPageClasses.sidebar.navTitle}>
        {nav.navTitle}
      </p>
      <div className={cn("flex max-h-[calc(100vh-6.5rem)] flex-col overflow-y-auto", panchangaPageClasses.sidebar.navBody)}>
        {nav.sections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            location={locationForLinks}
            kundaliProfileId={kundaliProfileId}
            kundaliSectionId={kundaliSectionId}
            activeEraSelection={activeEraSelection}
          />
        ))}
      </div>
    </nav>
  );
}
