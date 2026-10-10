/**
 * Route registry and matching helpers — the single source for SEO title/
 * description keys, sitemap entries, prerender targets, noindex flags,
 * panchanga-sidebar visibility, and the active-route predicates used by
 * Header's dropdowns and MobileBottomNav's tabs. router.tsx still owns actual
 * route construction (paths here are descriptive, not registered) — see
 * PANCHANGA_SHELL_PATHS there for why sidebar visibility is derived, not
 * hand-listed.
 *
 * Dynamic routes (/learn/$slug, /panchanga/element/$name, /sait/$category) are
 * NOT enumerated here — they expand from their own metadata (learn-topics-meta.ts,
 * panchanga-elements.ts) in public-indexable-paths.ts, same as before.
 */
import { PANCHANGA_SHELL_PATHS } from "@/lib/panchanga-shell-paths";
import { isKundaliRoute } from "@/lib/kundali/kundali-routes";

export type SitemapChangefreq = "daily" | "weekly" | "monthly";

export interface SitemapConfig {
  changefreq: SitemapChangefreq;
  priority: string;
}

export interface RouteMeta {
  id: string;
  path: string;
  /** i18n key prefix, e.g. "seo.routes.gochar" → seo.routes.gochar.title/.description/.keywords */
  seoKey?: string;
  sitemap?: SitemapConfig;
  /** Pages that should not be prerendered at build time (SSR-only or redirect shells). */
  prerender?: boolean;
  noindex?: boolean;
}

export const ROUTES: RouteMeta[] = [
  { id: "home", path: "/", seoKey: "seo.routes.home", sitemap: { changefreq: "daily", priority: "1.0" }, prerender: true },
  { id: "panchanga-og-preview", path: "/panchanga/og-preview", noindex: true },
  { id: "panchanga", path: "/panchanga", seoKey: "seo.routes.panchanga", sitemap: { changefreq: "daily", priority: "0.9" }, prerender: true },
  { id: "panchanga-year", path: "/panchanga/year", seoKey: "seo.routes.panchanga_year", sitemap: { changefreq: "weekly", priority: "0.7" }, prerender: true },
  { id: "avakahada-chakra", path: "/panchanga/avakahada-chakra", seoKey: "seo.routes.avakahada", sitemap: { changefreq: "monthly", priority: "0.6" }, prerender: true },
  { id: "gochar", path: "/gochar", seoKey: "seo.routes.gochar", sitemap: { changefreq: "daily", priority: "0.8" }, prerender: true },
  { id: "aakash-gochar", path: "/aakash-gochar", seoKey: "seo.routes.aakash_gochar", sitemap: { changefreq: "daily", priority: "0.7" }, prerender: true },
  { id: "graha-sthiti-legacy", path: "/panchanga/graha-sthiti" },
  { id: "graha-asta", path: "/panchanga/graha-asta", seoKey: "seo.routes.graha_asta", sitemap: { changefreq: "weekly", priority: "0.7" }, prerender: true },
  { id: "graha-vakri", path: "/panchanga/graha-vakri", seoKey: "seo.routes.graha_vakri", sitemap: { changefreq: "weekly", priority: "0.7" }, prerender: true },
  { id: "surya-grahan", path: "/panchanga/surya-grahan", seoKey: "seo.routes.surya_grahan", sitemap: { changefreq: "monthly", priority: "0.7" }, prerender: true },
  { id: "chandra-grahan", path: "/panchanga/chandra-grahan", seoKey: "seo.routes.chandra_grahan", sitemap: { changefreq: "monthly", priority: "0.7" }, prerender: true },
  { id: "panchanga-details", path: "/panchanga/details", seoKey: "seo.routes.panchanga_details", sitemap: { changefreq: "monthly", priority: "0.7" }, prerender: true },
  { id: "vivah-sait", path: "/vivah-sait", seoKey: "seo.routes.vivah_sait", sitemap: { changefreq: "weekly", priority: "0.8" }, prerender: true },
  { id: "dainikkranti", path: "/dainikkranti", seoKey: "seo.routes.dainikkranti", sitemap: { changefreq: "weekly", priority: "0.8" }, prerender: true },
  { id: "chandrakranti-legacy", path: "/chandrakranti", seoKey: "seo.routes.dainikkranti" },
  { id: "dainikkranti-ne-legacy", path: "/दैनिकक्रान्ति", seoKey: "seo.routes.dainikkranti" },
  { id: "shanti-vidhi", path: "/shanti-vidhi", seoKey: "seo.routes.shanti_vidhi", sitemap: { changefreq: "monthly", priority: "0.6" }, prerender: true },
  { id: "converter", path: "/converter", seoKey: "seo.routes.converter", sitemap: { changefreq: "monthly", priority: "0.8" }, prerender: true },
  { id: "holidays", path: "/holidays", seoKey: "seo.routes.holidays", sitemap: { changefreq: "weekly", priority: "0.8" }, prerender: true },
  { id: "ritu", path: "/ritu", seoKey: "seo.routes.ritu", sitemap: { changefreq: "weekly", priority: "0.7" }, prerender: true },
  { id: "kundali", path: "/kundali", seoKey: "seo.routes.kundali", sitemap: { changefreq: "monthly", priority: "0.7" }, prerender: true },
  { id: "kundali-detail", path: "/kundali/$profileId", noindex: true },
  { id: "kundali-milan", path: "/jyotish/kundali-milan", seoKey: "seo.routes.kundali_milan", sitemap: { changefreq: "monthly", priority: "0.7" }, prerender: true },
  { id: "rashifal", path: "/jyotish/rashifal", seoKey: "seo.routes.rashifal", sitemap: { changefreq: "daily", priority: "0.75" }, prerender: true },
  { id: "vastu", path: "/vastu", seoKey: "seo.routes.vastu", sitemap: { changefreq: "monthly", priority: "0.7" }, prerender: true },
  { id: "learn", path: "/learn", seoKey: "seo.routes.learn", sitemap: { changefreq: "weekly", priority: "0.8" }, prerender: true },
  { id: "learn-article", path: "/learn/$slug" },
  { id: "documents", path: "/documents", seoKey: "seo.routes.documents", sitemap: { changefreq: "weekly", priority: "0.7" }, prerender: true },
  { id: "document-detail", path: "/documents/$slug" },
  { id: "document-chapter-detail", path: "/documents/$slug/$chapter" },
  { id: "suryakranti", path: "/suryakranti", seoKey: "seo.routes.suryakranti", sitemap: { changefreq: "weekly", priority: "0.7" }, prerender: true },
  { id: "sun-times-legacy", path: "/sun-times" },
  { id: "abhijit-muhurta", path: "/abhijit-muhurta", seoKey: "seo.routes.abhijit_muhurta", sitemap: { changefreq: "weekly", priority: "0.7" }, prerender: true },
  { id: "panchak-patro", path: "/panchak-patro", seoKey: "seo.routes.panchak_patro", sitemap: { changefreq: "monthly", priority: "0.7" }, prerender: true },
  { id: "learn-history", path: "/learn/history" },
  { id: "history-legacy", path: "/history" },
  { id: "element", path: "/panchanga/element/$name" },
  { id: "sait", path: "/sait/$category" },
  { id: "account", path: "/account", seoKey: "seo.routes.account", noindex: true, prerender: true },
  { id: "verify-email", path: "/verify-email", seoKey: "seo.routes.verify_email", noindex: true, prerender: true },
  { id: "reset-password", path: "/reset-password", seoKey: "seo.routes.reset_password", noindex: true, prerender: true },
  { id: "privacy", path: "/privacy", seoKey: "seo.routes.privacy", sitemap: { changefreq: "monthly", priority: "0.3" }, prerender: true },
  { id: "terms", path: "/terms", seoKey: "seo.routes.terms", sitemap: { changefreq: "monthly", priority: "0.3" }, prerender: true },
];

export const ROUTE_SEO_KEYS: Record<string, string> = Object.fromEntries(
  ROUTES.filter((r) => r.seoKey).map((r) => [r.path, r.seoKey as string]),
);

export const STATIC_SITEMAP_ENTRIES: { path: string; changefreq: SitemapChangefreq; priority: string }[] =
  ROUTES.filter((r) => r.sitemap).map((r) => ({ path: r.path, ...(r.sitemap as SitemapConfig) }));

export const PRERENDER_EXTRA_PATHS: string[] = ROUTES.filter((r) => r.prerender && !r.sitemap).map((r) => r.path);

const STATIC_NOINDEX_PATHS = new Set(ROUTES.filter((r) => r.noindex).map((r) => r.path));

/** True for exact noindex routes above, plus any /kundali/:id (dynamic, per-user). */
export function isNoindexPath(pathname: string): boolean {
  return STATIC_NOINDEX_PATHS.has(pathname) || /^\/kundali\/[^/]+/.test(pathname);
}

// ---------------------------------------------------------------------------
// Active-route matching — Header's dropdown highlighting, MobileBottomNav's
// tab highlighting, and the panchanga sidebar shell all read from here so
// there's one definition of "is this pathname a panchanga/jyotish page."

export { isKundaliRoute };

/** Header's "पञ्चाङ्ग" dropdown + broad panchanga-domain check (includes dainikkranti). */
export function isPanchangaRoute(pathname: string): boolean {
  return (
    pathname === "/panchanga" ||
    pathname.startsWith("/panchanga/") ||
    pathname === "/suryakranti" ||
    pathname === "/sun-times" ||
    pathname === "/abhijit-muhurta" ||
    pathname === "/dainikkranti" ||
    pathname === "/chandrakranti" ||
    pathname === "/दैनिकक्रान्ति" ||
    decodeURIComponent(pathname) === "/दैनिकक्रान्ति"
  );
}

/** Header's "ज्योतिष" dropdown; also MobileBottomNav's Kundali tab (same routes). */
export function isJyotishRoute(pathname: string): boolean {
  return isKundaliRoute(pathname) || pathname.startsWith("/jyotish/");
}

/** MobileBottomNav's Panchanga tab — narrower than {@link isPanchangaRoute}: dainikkranti gets its own tab. */
export function isPanchangaTabRoute(pathname: string): boolean {
  return (
    pathname === "/panchanga" ||
    pathname.startsWith("/panchanga/") ||
    pathname === "/suryakranti" ||
    pathname === "/abhijit-muhurta"
  );
}

/** MobileBottomNav's Daily (dainikkranti) tab. */
export function isDainikkrantiTabRoute(pathname: string): boolean {
  return pathname.startsWith("/dainikkranti");
}

/** Header's "वास्तु" link. */
export function isVastuRoute(pathname: string): boolean {
  return pathname === "/vastu" || pathname.startsWith("/vastu/");
}

/** MobileBottomNav's Learn tab. */
export function isLearnRoute(pathname: string): boolean {
  return pathname === "/learn" || pathname.startsWith("/learn/");
}

/** True if `template`'s static segments match `pathname` (dynamic "$param" segments match anything). */
function matchesTemplate(pathname: string, template: string): boolean {
  const pathSegments = pathname.split("/");
  const templateSegments = template.split("/");
  if (pathSegments.length !== templateSegments.length) return false;
  return templateSegments.every(
    (segment, i) => segment.startsWith("$") || segment === pathSegments[i],
  );
}

/**
 * Routes that show the left panchanga sidebar on desktop (≥992px). Derived
 * from PANCHANGA_SHELL_PATHS (router.tsx), not hand-listed here — reads it
 * lazily (inside the function body) since router.tsx imports this module
 * indirectly (via route-loading.tsx), and the import is circular.
 */
export function shouldShowPanchangaSidebar(pathname: string): boolean {
  return PANCHANGA_SHELL_PATHS.some((template) => matchesTemplate(pathname, template));
}

/** Client navigations that keep the persistent panchanga shell mounted. */
export function isPanchangaShellNavigation(from: string, to: string): boolean {
  return shouldShowPanchangaSidebar(from) && shouldShowPanchangaSidebar(to);
}
