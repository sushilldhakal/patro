import { useCallback, useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useGestureProgress, useSpringPan } from "@vedic-patro/ui/gestures";
import { brand, radius } from "@vedic-patro/design-tokens";
import { LucideNative, type LucideIconNode } from "@/components/icons/LucideNative";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";

type Props = {
  children: ReactNode;
  /** The action under the row, e.g. "Delete" (the accessibility label when `icon` is shown). */
  actionLabel: string;
  onAction: () => void;
  /** Width of the revealed action. */
  actionWidth?: number;
  /** An icon in place of the label (a bin for delete). */
  icon?: LucideIconNode;
  /** Swiping all the way to the left edge runs the action without a tap, as in Mail. */
  fullSwipe?: boolean;
};

/**
 * A row that slides left under the finger to show one action, resists past either end, and springs
 * open or shut on release with the flick's velocity. With `fullSwipe` the action widens as the row
 * is dragged and a drag (or flick) most of the way across runs it. Only a sideways drag claims the
 * touch (see `useSpringPan`), so the page keeps scrolling and buttons inside the row still work.
 *
 * Swiping is a shortcut: give the row a visible way to do the same thing as well.
 */
export function SwipeableRow({ children, actionLabel, onAction, actionWidth = 88, icon, fullSwipe = false }: Props) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const snapPoints = useMemo(
    () => ({ x: fullSwipe ? [-width, -actionWidth, 0] : [-actionWidth, 0] }),
    [actionWidth, fullSwipe, width],
  );
  const closed = fullSwipe ? 2 : 1;
  // Stable, so the pan isn't rebuilt on every render.
  const onSnap = useCallback((_axis: "x" | "y", index: number) => {
    if (index === 0) onAction();
  }, [onAction]);
  const { gesture, x, style, snapTo } = useSpringPan({
    axis: "x",
    snapPoints,
    initialIndex: closed,
    onSnap: fullSwipe ? onSnap : undefined,
  });
  const revealed = useGestureProgress(x, [0, -actionWidth]);

  /* One animated style, everything in it: a `style={[plain, animated]}` array drops the plain part. */
  const actionStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: Math.max(actionWidth, -x.get()),
    opacity: interpolate(revealed.get(), [0, 0.5, 1], [0, 0.6, 1], Extrapolation.CLAMP),
  }), [actionWidth]);

  return (
    <View style={styles.clip}>
      <Animated.View style={actionStyle} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[styles.actionButton, { backgroundColor: colors.danger, width: actionWidth }]}
          onPress={() => {
            snapTo({ x: closed });
            onAction();
          }}
        >
          {icon ? (
            <LucideNative node={icon} size={24} color={brand.offWhite} strokeWidth={2.2} />
          ) : (
            <Text className="text-sm font-semibold text-white" style={nepaliTextStyle(14)}>
              {actionLabel}
            </Text>
          )}
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
  // Pinned to the right edge, so the bin stays under the finger's side while the red widens.
  actionButton: { flex: 1, alignSelf: "flex-end", alignItems: "center", justifyContent: "center" },
});
