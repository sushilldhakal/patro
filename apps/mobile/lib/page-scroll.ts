import { useEffect, useRef, type ComponentRef } from "react";
import type { ScrollView, View } from "react-native";
import { useIsFocused, usePathname } from "expo-router";

/**
 * The page's main vertical scroller, registered by `AppShell` and the panchanga
 * shell so a deep component (e.g. the Shanti "view shanti" button) can scroll a
 * sibling section into view without being handed a ref — the native equivalent
 * of web's `scrollIntoView`.
 */
let scroller: ComponentRef<typeof ScrollView> | null = null;

export function setPageScroller(node: ComponentRef<typeof ScrollView> | null) {
  if (node) scroller = node;
}

export function scrollViewIntoView(target: ComponentRef<typeof View> | null, offset = 12) {
  const host = scroller;
  if (!host || !target) return;
  /* measureLayout wants a native ref, not a numeric node handle (newer RN). */
  const content = (host as unknown as { getInnerViewRef?: () => unknown }).getInnerViewRef?.();
  if (!content) return;
  target.measureLayout(
    content as Parameters<ComponentRef<typeof View>["measureLayout"]>[0],
    (_x, y) => host.scrollTo({ y: Math.max(y - offset, 0), animated: true }),
    () => {},
  );
}

export function scrollPageToTop(animated = false) {
  scroller?.scrollTo({ y: 0, animated });
}

/** Ref for a page ScrollView that keeps its offset: it is the page scroller whenever its screen is focused. */
export function usePageScrollerRef() {
  const focused = useIsFocused();
  const node = useRef<ComponentRef<typeof ScrollView> | null>(null);
  useEffect(() => {
    if (focused) setPageScroller(node.current);
  }, [focused]);
  return (n: ComponentRef<typeof ScrollView> | null) => {
    node.current = n;
    if (focused) setPageScroller(n);
  };
}

/**
 * Returns a ref-callback pair for a page ScrollView that jumps back to the top
 * whenever the route changes. Tab screens stay mounted, so without this a page
 * opened from a link kept whatever scroll offset it was left at.
 *
 * Only while the screen is focused: a page under a pushed one keeps its offset,
 * so swiping back lands where you left it, and becomes the page scroller again.
 */
export function useScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const focused = useIsFocused();
  const node = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const last = useRef(pathname);
  useEffect(() => {
    if (!focused) return;
    setPageScroller(node.current);
    if (last.current === pathname) return;
    last.current = pathname;
    node.current?.scrollTo({ y: 0, animated: false });
  }, [pathname, focused]);
  return (n: ComponentRef<typeof ScrollView> | null) => {
    node.current = n;
    if (focused) setPageScroller(n);
  };
}
