import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

/**
 * Push a route, entering the panchanga tab's nested Stack safely.
 *
 * On native, a single `router.push("/panchanga/<page>")` from another tab only
 * switches to the panchanga tab and leaves its Stack on `/panchanga` (the
 * sidebar works because it pushes from inside that Stack). Landing on the tab
 * root first and then pushing gives the Stack a known state, and the back
 * button returns to the daily page.
 */
export function pushHref(router: Router, pathname: string, href: string): void {
  const intoPanchangaStack = href.startsWith("/panchanga/") && !pathname.startsWith("/panchanga");
  if (!intoPanchangaStack) {
    router.push(href as never);
    return;
  }
  router.navigate("/panchanga" as never);
  setTimeout(() => router.push(href as never), 60);
}
