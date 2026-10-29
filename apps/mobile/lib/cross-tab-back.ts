/**
 * Back goes where you came from, across tabs.
 *
 * A page inside a tab's stack (a kundali profile, a learn article) opened
 * from another tab used to land on top of whatever that stack held from
 * earlier, so swiping back showed some old page instead of the one it was
 * opened from. The tab stack now remembers, for a page pushed from outside the
 * tab, the page it was opened from, and going back from it returns there. (The
 * panchanga pages need none of this: they are in the root stack.)
 *
 * Two signals say a page was opened from outside: the pathname moving from
 * outside the tab into it, and the page's first focus. They arrive in either
 * order, so each waits briefly for the other instead of trusting a timer.
 */
import { useEffect, useRef } from "react";
import { router, usePathname, type Href } from "expo-router";

/** How far apart the pathname change and the focus may land and still be one navigation. */
const PAIR_WINDOW_MS = 2000;

/** Stack route key → the pathname it was opened from, for pages opened from another tab. */
const originByKey = new Map<string, string>();
/** Stack route keys already focused once: only the first focus says where a page was opened from. */
const seen = new Set<string>();
/** Per tab prefix: an entry from outside still waiting for its page's focus. */
const pendingEntry = new Map<string, { origin: string; at: number }>();
/** Per tab prefix: a first focus still waiting to learn whether it came from outside. */
const pendingFocus = new Map<string, { key: string; at: number }>();
/** The tab prefixes with listeners (`/kundali`, `/learn`). */
const prefixes = new Set<string>();

function inTab(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function pair(prefix: string) {
  const entry = pendingEntry.get(prefix);
  const focus = pendingFocus.get(prefix);
  if (!entry || !focus) return;
  // Too far apart: the older one is stale (a focus from a move inside the tab); keep the newer waiting.
  if (Math.abs(entry.at - focus.at) > PAIR_WINDOW_MS) {
    if (entry.at < focus.at) pendingEntry.delete(prefix);
    else pendingFocus.delete(prefix);
    return;
  }
  pendingEntry.delete(prefix);
  pendingFocus.delete(prefix);
  originByKey.set(focus.key, entry.origin);
}

function onPathChange(prev: string, now: string) {
  const at = Date.now();
  for (const prefix of prefixes) {
    // A tab's own first page needs nothing: from there back is the tab history.
    if (inTab(prefix, now) && now !== prefix && !inTab(prefix, prev)) {
      pendingEntry.set(prefix, { origin: prev, at });
      pair(prefix);
    } else {
      // A move inside the tab (or out of it): any waiting focus was not an entry from outside.
      pendingEntry.delete(prefix);
      if (inTab(prefix, now)) pendingFocus.delete(prefix);
    }
  }
}

/** Kept once, at the root: notices every pathname change. */
export function useTrackPathname() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    const prev = last.current;
    last.current = pathname;
    if (prev != null && prev !== pathname) onPathChange(prev, pathname);
  }, [pathname]);
}

type ListenerArgs = { route: { key: string; name: string } };
type RemoveEvent = { data?: { action?: { type?: string } } };

/**
 * `screenListeners` for a tab's stack. `prefix` is the tab's path (`/kundali`).
 */
export function crossTabBackListeners(prefix: string) {
  prefixes.add(prefix);
  return ({ route }: ListenerArgs) => ({
    focus: () => {
      if (route.name === "index" || seen.has(route.key)) return;
      seen.add(route.key);
      pendingFocus.set(prefix, { key: route.key, at: Date.now() });
      pair(prefix);
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
