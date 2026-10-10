import { PANCHANGA_SHELL_PATHS } from "@vedic-patro/domain/panchanga-shell-paths";
import { normalizeMobilePathname } from "@/lib/mobile-nav";

/**
 * Routes the app shows inside the panchanga shell: everything the website's
 * `panchangaShellChildRoutes` has, plus the tab routes that only exist in the app.
 */
const APP_ONLY_SHELL_PATHS = [
  "/rashifal",
  "/reminders",
  "/panchanga/choghadiya",
  "/panchanga/hora",
  "/panchanga/lagna",
  "/panchanga/chandrabala",
  "/panchanga/tarabala",
  "/panchanga/panchaka-rahita",
  "/panchanga/pushkara",
  "/vivah-sait",
] as const;

export const PANCHANGA_SHELL_PATH_TEMPLATES: readonly string[] = [
  ...PANCHANGA_SHELL_PATHS,
  ...APP_ONLY_SHELL_PATHS,
];

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
