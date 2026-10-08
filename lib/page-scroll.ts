import type { ScrollView, View } from "react-native";

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
