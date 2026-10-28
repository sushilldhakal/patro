/**
 * Back goes where you came from, across tabs.
 *
 * A page inside a tab's stack (a tithi page under the panchanga tab) opened
 * from another tab (a home card) used to land on top of whatever that stack
 * held from earlier, so swiping back showed some old page (the nakshatra seen
 * an hour ago) instead of home. The tab stack now remembers, for a page
 * pushed from outside the tab, the page it was opened from, and going back
 * from it returns there.
 */
import { useEffect } from "react";
import { router, usePathname, type Href } from "expo-router";

/** The last pathnames, newest last (kept by `useTrackPathname` in the root layout). */
const history: string[] = [];
/** Stack route key → the pathname it was opened from, for pages opened from another tab. */
const originByKey = new Map<string, string>();
/** Stack route keys already focused once: only the first focus says where a page was opened from. */
const seen = new Set<string>();

/** Kept once, at the root: every pathname the app shows, in order. */
export function useTrackPathname() {
  const pathname = usePathname();
  useEffect(() => {
    if (history[history.length - 1] === pathname) return;
    history.push(pathname);
    if (history.length > 20) history.shift();
  }, [pathname]);
}

function inTab(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

type ListenerArgs = { route: { key: string; name: string } };
type RemoveEvent = { data?: { action?: { type?: string } } };

/**
 * `screenListeners` for a tab's stack. `prefix` is the tab's path (`/panchanga`).
 * The tab's own first page needs nothing: from there back is the tab history.
 */
export function crossTabBackListeners(prefix: string) {
  return ({ route }: ListenerArgs) => ({
    focus: () => {
      if (route.name === "index" || seen.has(route.key)) return;
      seen.add(route.key);
      // The pathname updates just after the focus; read it once it has.
      setTimeout(() => {
        const prev = history[history.length - 2];
        const now = history[history.length - 1];
        if (now && inTab(prefix, now) && prev && !inTab(prefix, prev)) originByKey.set(route.key, prev);
      }, 120);
    },
    beforeRemove: (e: RemoveEvent) => {
      const origin = originByKey.get(route.key);
      originByKey.delete(route.key);
      seen.delete(route.key);
      const type = e.data?.action?.type;
      // Only a back (swipe, back button) returns; leaving the tab (pop to top) does not.
      if (!origin || (type !== "POP" && type !== "GO_BACK")) return;
      setTimeout(() => router.navigate(origin as Href), 0);
    },
  });
}
