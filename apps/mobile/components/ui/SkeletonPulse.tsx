import { useEffect, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotionPref } from "@vedic-patro/ui/motion";

type Props = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** The pulse as it has always been: 0.45 → 1 → 0.45, each leg 900 ms. */
const LOW = 0.45;
const HIGH = 1;
const LEG_MS = 900;
/** Reduce Motion: a still skeleton at the midpoint. */
const MID = (LOW + HIGH) / 2;

/**
 * Skeleton shimmer — a Reanimated shared value, so the pulse runs on the UI thread and keeps going while
 * JS is busy drawing the content that replaces it. (Not NativeWind `animate-pulse`, which drives Reanimated
 * shared values and triggers strict-mode render warnings.)
 */
export function SkeletonPulse({ className, style, children }: Props) {
  const reduced = useReducedMotionPref();
  const opacity = useSharedValue(reduced ? MID : LOW);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(opacity);
      opacity.set(MID);
      return;
    }
    opacity.set(LOW);
    opacity.set(withRepeat(withSequence(withTiming(HIGH, { duration: LEG_MS }), withTiming(LOW, { duration: LEG_MS })), -1));
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View style={animated}>
      <View className={className} style={style}>
        {children}
      </View>
    </Animated.View>
  );
}
