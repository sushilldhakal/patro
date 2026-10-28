import type { ReactNode } from "react";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useReducedMotionPref } from "@vedic-patro/ui/motion";
import { usePageScrollY } from "@/lib/scroll-motion";

/** How much slower than the page the hero leaves: 0.35 of the scroll distance. */
const PARALLAX = 0.35;
/** Scrolled one hero-height up, it has shrunk this much and kept this much opacity. */
const SHRINK = 0.06;
const MIN_OPACITY = 0.3;
/** Pulled down past the top (iOS bounce), it grows at most this much. */
const STRETCH = 0.05;

/**
 * The top block of a page, tied to its scroll the way a banking app's balance is: scrolling up it
 * drifts away slower than the page, shrinks a little and fades, and the content below slides over
 * it; pulled down past the top it swells slightly. Runs on the UI thread from the page's own
 * scroll value (`PageScrollView`), only transform and opacity. Reduce Motion keeps the fade only.
 *
 * Outside a `PageScrollView` it is a plain view.
 */
export function ScrollHero({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionPref();
  const { scrollY } = usePageScrollY();
  const height = useSharedValue(1);

  const style = useAnimatedStyle(() => {
    const y = scrollY.get();
    const h = Math.max(height.get(), 1);
    const opacity = interpolate(y, [0, h], [1, MIN_OPACITY], Extrapolation.CLAMP);
    if (reduced) return { opacity };
    const scale =
      y < 0
        ? interpolate(-y, [0, h], [1, 1 + STRETCH], Extrapolation.CLAMP)
        : interpolate(y, [0, h], [1, 1 - SHRINK], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY: y > 0 ? Math.min(y, h) * PARALLAX : 0 }, { scale }],
    };
  }, [reduced]);

  return (
    <Animated.View style={style} onLayout={(e) => height.set(e.nativeEvent.layout.height)}>
      {children}
    </Animated.View>
  );
}
