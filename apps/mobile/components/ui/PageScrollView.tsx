import { forwardRef, type ComponentRef, type ReactNode } from "react";
import type { ScrollView, ScrollViewProps } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { PageScrollContext } from "@/lib/scroll-motion";

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
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  return (
    <InteropScrollView
      // The animated component forwards its ref to the native ScrollView inside it.
      ref={ref as never}
      {...props}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <PageScrollContext.Provider value={scrollY}>{children}</PageScrollContext.Provider>
    </InteropScrollView>
  );
});
