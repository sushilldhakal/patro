import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { css } from "react-native-reanimated";

type Props = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Opacity 0.45 → 1 and back: each leg is 900 ms, so the whole pulse is 1.8 s. */
const PULSE = css.keyframes({
  from: { opacity: 0.45 },
  to: { opacity: 1 },
});

const PULSE_STYLE = {
  opacity: 0.45,
  animationName: PULSE,
  animationDuration: "900ms",
  animationDirection: "alternate",
  animationIterationCount: "infinite",
  animationTimingFunction: "ease-in-out",
} as const;

/**
 * Skeleton shimmer — a Reanimated CSS keyframe loop, so it runs on the UI thread and keeps pulsing
 * while JS is busy drawing the content that replaces it. (Not NativeWind `animate-pulse`, which
 * drives Reanimated shared values and triggers strict-mode render warnings.)
 */
export function SkeletonPulse({ className, style, children }: Props) {
  return (
    <Animated.View style={PULSE_STYLE}>
      <View className={className} style={style}>
        {children}
      </View>
    </Animated.View>
  );
}
