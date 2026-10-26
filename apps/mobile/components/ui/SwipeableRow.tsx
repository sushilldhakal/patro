import { useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useGestureProgress, useSpringPan } from "@vedic-patro/ui/gestures";
import { radius } from "@vedic-patro/design-tokens";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";

type Props = {
  children: ReactNode;
  /** The action under the row, e.g. "Delete". */
  actionLabel: string;
  onAction: () => void;
  /** Width of the revealed action. */
  actionWidth?: number;
};

/**
 * A row that slides left under the finger to show one action, resists past either end, and springs
 * open or shut on release with the flick's velocity. Only a sideways drag claims the touch (see
 * `useSpringPan`), so the page keeps scrolling and switches and buttons inside the row still work.
 *
 * Swiping is a shortcut: give the row a visible way to do the same thing as well.
 */
export function SwipeableRow({ children, actionLabel, onAction, actionWidth = 88 }: Props) {
  const colors = useThemeColors();
  const snapPoints = useMemo(() => ({ x: [-actionWidth, 0] }), [actionWidth]);
  const { gesture, x, style, snapTo } = useSpringPan({ axis: "x", snapPoints, initialIndex: 1 });
  const revealed = useGestureProgress(x, [0, -actionWidth]);

  /* One animated style, everything in it: a `style={[plain, animated]}` array drops the plain part. */
  const actionStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: actionWidth,
    opacity: interpolate(revealed.get(), [0, 0.5, 1], [0, 0.6, 1], Extrapolation.CLAMP),
  }), [actionWidth]);

  return (
    <View style={styles.clip}>
      <Animated.View style={actionStyle} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[styles.actionButton, { backgroundColor: colors.danger }]}
          onPress={() => {
            snapTo({ x: 1 });
            onAction();
          }}
        >
          <Text className="text-sm font-semibold text-white" style={nepaliTextStyle(14)}>
            {actionLabel}
          </Text>
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={style}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden", borderRadius: radius.xl },
  actionButton: { flex: 1, alignItems: "center", justifyContent: "center" },
});
