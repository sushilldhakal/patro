import { useEffect, useRef } from "react";
import type { ScrollView, View } from "react-native";
import { usePathname } from "expo-router";

/**
 * The page's main vertical scroller, registered by `AppShell` and the panchanga
 * shell so a deep component (e.g. the Shanti "view shanti" button) can scroll a
 * sibling section into view without being handed a ref — the native equivalent
 * of web's `scrollIntoView`.
 */
let scroller: ScrollView | null = null;

export function setPageScroller(node: ScrollView | null) {
  if (node) scroller = node;
  else if (scroller === node) scroller = null;
}

export function scrollViewIntoView(target: View | null, offset = 12) {
  const host = scroller;
  if (!host || !target) return;
  /* measureLayout wants a native ref, not a numeric node handle (newer RN). */
  const content = (host as unknown as { getInnerViewRef?: () => unknown }).getInnerViewRef?.();
  if (!content) return;
  target.measureLayout(
    content as Parameters<View["measureLayout"]>[0],
    (_x, y) => host.scrollTo({ y: Math.max(y - offset, 0), animated: true }),
    () => {},
  );
}

export function scrollPageToTop(animated = false) {
  scroller?.scrollTo({ y: 0, animated });
}

/**
 * Returns a ref-callback pair for a page ScrollView that jumps back to the top
 * whenever the route changes. Tab screens stay mounted, so without this a page
 * opened from a link kept whatever scroll offset it was left at.
 */
export function useScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const node = useRef<ScrollView | null>(null);
  const last = useRef(pathname);
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    node.current?.scrollTo({ y: 0, animated: false });
  }, [pathname]);
  return (n: ScrollView | null) => {
    node.current = n;
    setPageScroller(n);
  };
}
