import { useCallback, useState } from "react";
import type { View } from "react-native";
import { measure, useAnimatedReaction, useAnimatedRef, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { pageViewportH, usePageScrollY } from "@/lib/scroll-motion";

/**
 * Whether a block is on the screen (or within `margin` px of it), updated as the page scrolls.
 * Attach `ref` and `onLayout` to the block. It starts true, and stays true on a page that does not
 * report its scroll, so the worst case is a block that is never paused, not one that never draws.
 */
export function useOnScreen(margin = 200, initial = true) {
  const ref = useAnimatedRef<View>();
  const [onScreen, setOnScreen] = useState(initial);
  const last = useSharedValue(initial);
  const laidOut = useSharedValue(false);
  const { scrollY } = usePageScrollY();

  useAnimatedReaction(
    () => scrollY.get() + (laidOut.get() ? 10_000_000 : 0),
    () => {
      if (!laidOut.get()) return;
      const box = measure(ref);
      if (box === null) return;
      const visible = box.pageY < pageViewportH.get() + margin && box.pageY + box.height > -margin;
      if (visible !== last.get()) {
        last.set(visible);
        scheduleOnRN(setOnScreen, visible);
      }
    },
    [margin, scrollY],
  );

  const onLayout = useCallback(() => laidOut.set(true), [laidOut]);
  return { ref, onLayout, onScreen };
}
