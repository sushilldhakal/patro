import { useCallback, useContext, useRef, type ReactNode } from "react";
import { useFocusEffect } from "expo-router";
import Animated, {
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { EASE_OUT, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { ScrollRevealScope, pageScrollY, pageViewportH } from "@/lib/scroll-motion";

/** How far a block rises as it arrives, and how long it takes. */
const RISE = 32;
const ENTER_MS = 560;
/** Blocks that arrive together follow one another by this much, up to MAX_STAGGER of them. */
const STAGGER_MS = 80;
const MAX_STAGGER = 6;
/** A block counts as in view once its top is this far above the bottom of the screen. */
const VIEW_EDGE = 56;

/**
 * Content that rises into place and fades in: when its page opens, again every time you come back
 * to the page, and — for blocks below the fold — as they scroll into view, like a banking app's
 * cards. `index` staggers blocks that arrive together.
 *
 * It wraps its children in one view and animates only that view's opacity and translateY, so the
 * layout inside is untouched. Reduce Motion keeps the fade and drops the rise.
 */
export function Reveal({ children, index = 0 }: { children: ReactNode; index?: number }) {
  const reduced = useReducedMotionPref();
  const waitsForScroll = useContext(ScrollRevealScope);
  const ref = useAnimatedRef<Animated.View>();
  const progress = useSharedValue(0);
  const played = useSharedValue(false);
  const laidOut = useSharedValue(false);
  /** Bumped when the page is shown again, so the reaction below runs once more. */
  const epoch = useSharedValue(0);
  const delay = Math.min(index, MAX_STAGGER) * STAGGER_MS;
  const rise = reduced ? 0 : RISE;
  const duration = reduced ? 220 : ENTER_MS;
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      played.set(false);
      progress.set(0);
      epoch.set(epoch.get() + 1);
    }, [epoch, played, progress]),
  );

  useAnimatedReaction(
    () => pageScrollY.get() + epoch.get() * 1_000_000 + (laidOut.get() ? 10_000_000 : 0),
    () => {
      if (played.get() || !laidOut.get()) return;
      if (waitsForScroll) {
        const box = measure(ref);
        if (box !== null && box.pageY > pageViewportH.get() - VIEW_EDGE) return;
      }
      played.set(true);
      progress.set(withDelay(delay, withTiming(1, { duration, easing: EASE_OUT })));
    },
    [waitsForScroll, delay, duration],
  );

  /* One animated style and nothing plain beside it: a `style={[plain, animated]}` array drops the plain part. */
  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * rise }],
  }));

  return (
    <Animated.View ref={ref} collapsable={false} onLayout={() => laidOut.set(true)} style={style}>
      {children}
    </Animated.View>
  );
}
