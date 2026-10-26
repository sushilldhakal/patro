import { useEffect, useRef, type ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SPRING_SHEET, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { takeZoomOrigin } from "@/lib/zoom-origin";

/** Without a card to grow from, the screen settles up from this scale and this far down. */
const FALLBACK_SCALE = 0.92;
const FALLBACK_RISE = 24;
/** A card narrower than this share of the screen would start as a speck; stop at a quarter. */
const MIN_START_SCALE = 0.25;

/**
 * Wraps a screen so it grows out of the card that opened it and springs to full size, the way a
 * banking app opens a card into its detail. The stack's own transition is just a short fade; this
 * does the travelling. Pair it with `animation: "fade"` on the route.
 *
 * The card records where it is with `setZoomOrigin` right before navigating (see `PressCard`'s
 * `zoomToScreen`). Opened any other way it falls back to a small rise. Reduce Motion shows the
 * screen as it is.
 */
export function ZoomTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionPref();
  const { width, height } = useWindowDimensions();
  const origin = useRef(takeZoomOrigin()).current;
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) progress.set(withSpring(1, SPRING_SHEET));
  }, [progress, reduced]);

  const startScale = origin ? Math.min(1, Math.max(MIN_START_SCALE, origin.w / width)) : FALLBACK_SCALE;
  const fromX = origin ? origin.x + origin.w / 2 - width / 2 : 0;
  const fromY = origin ? origin.y + origin.h / 2 - height / 2 : FALLBACK_RISE;

  /* One animated style, everything in it: a `style={[plain, animated]}` array drops the plain part. */
  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      flex: 1,
      opacity: interpolate(t, [0, 0.35], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: (1 - t) * fromX },
        { translateY: (1 - t) * fromY },
        { scale: startScale + (1 - startScale) * t },
      ],
    };
  }, [fromX, fromY, startScale]);

  return <Animated.View style={style}>{children}</Animated.View>;
}
