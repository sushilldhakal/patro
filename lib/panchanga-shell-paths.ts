import { normalizeMobilePathname } from "@/lib/mobile-nav";

/**
 * Path templates for routes inside the web `panchangaShellRoute` layout.
 * Keep in sync with `panchangaShellChildRoutes` in dhakal-patro/src/router.tsx —
 * `/panchanga/year` is the one deliberate exception; see the comment above it.
 */
export const PANCHANGA_SHELL_PATH_TEMPLATES = [
  /* NOT `/panchanga/year` — on purpose, unlike the web list this mirrors.
   *
   * `(tabs)/_layout.tsx`'s `screenLayout` wraps the panchanga tab's whole
   * nested Stack, not each leaf screen — so `PanchangaTabsShell` switching
   * between a plain `View` (shellRoute false) and a `ScrollView` (shellRoute
   * true) is a React *element type* change at the position holding that
   * entire Stack. React remounts across a type change; the Stack — including
   * whatever screen a `router.push` had just navigated it to — went with it,
   * landing back on `/panchanga`, its default initial route, a beat after
   * the push. `/panchanga` itself (this tab's index) is the one screen here
   * that is never a shell route, so this only bites a push that starts from
   * the daily page — confirmed the hard way, the button below the wheel
   * pushing to `/panchanga/year` reverted to the daily page every time.
   * `/kundali/$profileId` next door doesn't hit this: both it and `/kundali`
   * are already carved out via `routeUsesOwnPanchangaSplitShell`, which
   * incidentally keeps them on the same wrapper type too.
   *
   * Excluding this route from the shell list keeps it on the same `View`
   * branch as `/panchanga`, so nothing changes type mid-navigation. The
   * trade is losing the desktop sidebar rail on this one page; `year.tsx`'s
   * `AppShell` already renders its own `ScrollView` when it isn't hosted by
   * the shell, so nothing else here needed to change. */
  "/panchanga/avakahada-chakra",
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
