import { useContext, type ReactNode } from "react";
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

/** How far a block rises as it arrives. */
const RISE = 32;
/** Reduce Motion keeps a plain fade of this length. */
const REDUCED_FADE_MS = 220;
/** Blocks that arrive together follow one another by this much, up to MAX_STAGGER of them. */
const STAGGER_MS = 80;
const MAX_STAGGER = 6;
/** A block counts as in view once its top is this far above the bottom of the screen. */
const VIEW_EDGE = 56;

/**
 * Content that rises into place and fades in once: when its page first opens and — for blocks below
 * the fold — as they first scroll into view. Coming back to a page (a swipe-back, a tab switch)
 * shows it as it was, the way a native app does; replaying it on every visit was motion the user
 * paid for dozens of times a session. `index` staggers blocks that arrive together.
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
  const delay = Math.min(index, MAX_STAGGER) * STAGGER_MS;
  const rise = reduced ? 0 : RISE;

  useAnimatedReaction(
    () => pageScrollY.get() + (laidOut.get() ? 10_000_000 : 0),
    () => {
      if (played.get() || !laidOut.get()) return;
      if (waitsForScroll) {
        const box = measure(ref);
        if (box !== null && box.pageY > pageViewportH.get() - VIEW_EDGE) return;
      }
      played.set(true);
      progress.set(
        withDelay(
          delay,
          withTiming(1, { duration: reduced ? REDUCED_FADE_MS : 560, easing: EASE_OUT }),
        ),
      );
    },
    [waitsForScroll, delay, reduced],
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
