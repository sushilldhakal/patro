import { createContext, useContext } from "react";
import { Dimensions, type ScaledSize } from "react-native";
import { makeMutable, type SharedValue } from "react-native-reanimated";

/**
 * The scroll offset of the page a block sits on, written on the UI thread by `PageScrollView`.
 * One value per page: a page that is not on screen keeps its own offset, and scrolling one page
 * never wakes the blocks of another.
 */
export const PageScrollContext = createContext<SharedValue<number> | null>(null);

/** Read by blocks outside any `PageScrollView`: never changes, so nothing there waits for a scroll. */
const NO_SCROLL = makeMutable(0);

export const pageViewportH = makeMutable(Dimensions.get("window").height);

Dimensions.addEventListener("change", ({ window }: { window: ScaledSize }) => {
  pageViewportH.set(window.height);
});

/**
 * This page's scroll offset, and whether there is one. Outside a `PageScrollView` there is nothing to
 * wait for, so a `Reveal` there plays when it mounts — a block waiting for a scroll that never comes
 * would stay invisible.
 */
export function usePageScrollY(): { scrollY: SharedValue<number>; scrolls: boolean } {
  const scrollY = useContext(PageScrollContext);
  return { scrollY: scrollY ?? NO_SCROLL, scrolls: scrollY !== null };
}
