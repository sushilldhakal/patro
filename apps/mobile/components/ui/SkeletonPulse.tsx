import { useEffect, useRef, type ReactNode } from "react";
import { Animated, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Skeleton shimmer — uses RN Animated (not NativeWind `animate-pulse`, which
 * drives Reanimated shared values and triggers strict-mode render warnings).
 */
export function SkeletonPulse({ className, style, children }: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <View className={className} style={style}>
        {children}
      </View>
    </Animated.View>
  );
}
