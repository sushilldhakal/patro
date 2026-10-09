import { normalizeMobilePathname } from "@/lib/mobile-nav";

/**
 * Path templates for routes inside the web `panchangaShellRoute` layout.
 * Keep in sync with `panchangaShellChildRoutes` in dhakal-patro/src/router.tsx.
 * (`/panchanga/year` used to be left out because the shell wrapper remounted the
 * panchanga Stack; the wrapper is stable now, so it is in.)
 */
export const PANCHANGA_SHELL_PATH_TEMPLATES = [
  "/panchanga/year",
  "/panchanga/avakahada-chakra",
  "/rashifal",
  "/jyotish/rashifal",
  "/dainikkranti",
  "/converter",
  "/holidays",
  "/ritu",
  "/kundali",
  "/kundali/$profileId",
  "/jyotish/kundali-milan",
  "/suryakranti",
  "/abhijit-muhurta",
  "/panchak-patro",
  "/panchanga/details",
  "/panchanga/element/$name",
  "/panchanga/choghadiya",
  "/panchanga/hora",
  "/panchanga/lagna",
  "/panchanga/chandrabala",
  "/panchanga/tarabala",
  "/panchanga/panchaka-rahita",
  "/panchanga/pushkara",
  "/gochar",
  "/panchanga/graha-asta",
  "/panchanga/graha-vakri",
  "/panchanga/surya-grahan",
  "/panchanga/chandra-grahan",
  "/sait/$category",
  "/vivah-sait",
] as const;

function matchesTemplate(pathname: string, template: string): boolean {
  const pathSegments = pathname.split("/");
  const templateSegments = template.split("/");
  if (pathSegments.length !== templateSegments.length) return false;
  return templateSegments.every(
    (segment, i) => segment.startsWith("$") || segment === pathSegments[i],
  );
}

/** Desktop sidebar rail — same set as web `shouldShowPanchangaSidebar`. */
export function shouldShowPanchangaSidebar(pathname: string): boolean {
  const p = normalizeMobilePathname(pathname);
  if (PANCHANGA_SHELL_PATH_TEMPLATES.some((template) => matchesTemplate(p, template))) {
    return true;
  }
  // Expo tab alias for kundali milan
  if (p === "/kundali-milan") return true;
  return false;
}

/**
 * Routes that mount their own `PanchangaSplitShell` (e.g. kundali detail section subnav).
 * The tabs-level shell skips these to avoid a double rail.
 */
export function routeUsesOwnPanchangaSplitShell(pathname: string): boolean {
  const p = normalizeMobilePathname(pathname);
  return (
    p === "/kundali" ||
    p.startsWith("/kundali/") ||
    p === "/kundali-milan" ||
    p.startsWith("/jyotish/kundali-milan")
  );
}
