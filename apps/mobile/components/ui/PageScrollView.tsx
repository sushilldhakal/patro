import { forwardRef, useContext, useEffect, type ComponentRef, type ReactNode } from "react";
import { View, type ScrollView, type ScrollViewProps } from "react-native";
import { useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { PageScrollContext } from "@/lib/scroll-motion";
import { reportNavScroll } from "@/lib/nav-compact";
import { reportHomeScroll } from "@/lib/home-sticky";
import { registerOverlayPage, reportOverlayScroll, resetOverlayHeader, useOverlayHeaderActive, useOverlayHeaderRowsHeight } from "@/lib/overlay-header";

const InteropScrollView = cssInterop(Animated.ScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

type Props = Omit<ScrollViewProps, "onScroll" | "scrollEventThrottle"> & { children?: ReactNode };

/**
 * A page's main vertical scroll. Its offset is written on the UI thread (`useAnimatedScrollHandler`),
 * never through JS, and handed to everything inside through `PageScrollContext` — so a `Reveal`, a
 * collapsing header or `useOnScreen` follows the finger even while JS is busy rendering the page.
 *
 * The ref is the underlying ScrollView (`scrollTo` works as before).
 */
export const PageScrollView = forwardRef<ComponentRef<typeof ScrollView>, Props>(function PageScrollView(
  { children, ...props },
  ref,
) {
  const scrollY = useSharedValue(0);
  // The page's main scroll (not one nested in another) drives the floating top bar while it is
  // the focused page (lib/overlay-header.ts).
  const nested = useContext(PageScrollContext) !== null;
  const focused = useIsFocused();
  const drives = useSharedValue(false);
  useEffect(() => {
    if (nested || !focused) return;
    // Back on this page: show the second row (or follow the content near the top).
    resetOverlayHeader(Math.max(0, scrollY.get()));
    drives.set(true);
    const unregister = registerOverlayPage();
    return () => {
      drives.set(false);
      unregister();
    };
  }, [nested, focused, scrollY, drives]);
  const overlay = useOverlayHeaderActive();
  const rowsH = useOverlayHeaderRowsHeight();
  const insets = useSafeAreaInsets();
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
    if (drives.get()) {
      const maxY = Math.max(0, e.contentSize.height - e.layoutMeasurement.height);
      // Clamped, so the bounce at either end never moves the bar.
      reportOverlayScroll(Math.min(Math.max(e.contentOffset.y, 0), maxY));
    }
    // The furthest the page can scroll. The bounce past the end (the page
    // overshoots, then springs back up) is not a scroll up — if it reached
    // the direction logic as an upward run it would show the sticky row and
    // unfold the floating bar at the bottom of the page, where the user is
    // not scrolling up at all. So both reporters get the limit and clamp
    // the offset to it; only a real upward drag past the end brings them back.
    const maxY = Math.max(0, e.contentSize.height - e.layoutMeasurement.height);
    // Folds the floating bar to its icons while scrolling down (lib/nav-compact.ts).
    reportNavScroll(e.contentOffset.y, maxY);
    // Pins the home screen's second row once the first row has scrolled away
    // (lib/home-sticky.ts). A no-op on every other page.
    reportHomeScroll(e.contentOffset.y, maxY);
  });
  return (
    <InteropScrollView
      // The animated component forwards its ref to the native ScrollView inside it.
      ref={ref as never}
      {...props}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Room for the floating top bar (status bar + its rows). 0 while no bar floats (home, tablet). */}
      {overlay && !nested && rowsH > 0 ? <View style={{ height: insets.top + rowsH }} /> : null}
      <PageScrollContext.Provider value={scrollY}>{children}</PageScrollContext.Provider>
    </InteropScrollView>
  );
});
