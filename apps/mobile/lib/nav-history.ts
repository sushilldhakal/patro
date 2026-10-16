import { useEffect } from "react";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

/** Most pages remembered; older ones fall off the front. */
const MAX_ENTRIES = 50;

/** Pages in the order they were opened, the one on screen last. */
const history: string[] = [];
/** Set while a swipe-back is navigating, so the page it lands on isn't recorded again. */
let goingBack = false;

/** The path plus the query params that aren't already a segment of the path. */
function hrefOf(pathname: string, params: Record<string, string | string[] | undefined>): string {
  const segments = new Set(pathname.split("/").filter(Boolean).map(decodeURIComponent));
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && !segments.has(String(Array.isArray(v) ? v[0] : v)))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(Array.isArray(v) ? v[0] : v))}`)
    .join("&");
  return query ? `${pathname}?${query}` : pathname;
}

/** Records each page the app shows. Mount once, in the tabs layout. */
export function useTrackNavHistory() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const href = hrefOf(pathname, params);
  useEffect(() => {
    if (goingBack) {
      goingBack = false;
      return;
    }
    if (history[history.length - 1] === href) return;
    history.push(href);
    if (history.length > MAX_ENTRIES) history.shift();
  }, [href]);
}

/**
 * Back to the page that was open before this one. `router.back()` alone pops
 * the current tab's own stack, so a graha page opened from home went back to
 * the panchanga screen first; this goes to whatever was really shown before.
 * Home when there is nothing earlier.
 */
export function goBackInHistory(router: Router, currentPath: string) {
  history.pop();
  const previous = history[history.length - 1];
  if (!previous) {
    if (currentPath !== "/") router.navigate("/");
    return;
  }
  goingBack = true;
  router.navigate(previous as never);
}
