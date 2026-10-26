import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGestureProgress, useSpringPan } from "@vedic-patro/ui/gestures";
import { SPRING_SHEET } from "@vedic-patro/ui/motion";
import { useThemeColors } from "@/lib/theme-context";

import { neutral, radius, space, withAlpha } from "@vedic-patro/design-tokens";

/** The strip you grab to drag the sheet: tall enough for a thumb, with the pill centred in it. */
const GRABBER_HEIGHT = 28;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Applied to the sliding panel (not the backdrop). */
  sheetStyle?: ViewStyle;
  maxHeight?: ViewStyle["maxHeight"];
  keyboardAvoiding?: boolean;
  /** Lift the sheet above the software keyboard (use instead of double-stacking with KAV). */
  keyboardInset?: number;
  /** Phone: slide from bottom. Tablet pickers: fade + scale centered. */
  variant?: "bottom" | "center";
};

/** `maxHeight` as pixels. A percentage has nothing to resolve against inside a content-sized sheet. */
function toPixels(value: ViewStyle["maxHeight"], windowHeight: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.endsWith("%")) return (windowHeight * parseFloat(value)) / 100;
  return windowHeight * 0.88;
}

/**
 * Bottom drawer that springs up with its backdrop and follows a drag on its grabber: pull it down
 * and it either settles back or, if you drag or flick far enough, goes away. Past the top it
 * resists. Backdrop and sheet both read one position, so they cannot drift apart.
 *
 * Centred variant (tablets): fades and scales in on the same spring.
 */
export function BottomSheetModal({
  visible,
  onClose,
  children,
  sheetStyle,
  maxHeight = "88%",
  keyboardAvoiding = false,
  keyboardInset = 0,
  variant = "bottom",
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const isCenter = variant === "center";
  const windowHeight = Dimensions.get("window").height;
  const maxPx = toPixels(maxHeight, windowHeight);

  /* How far down is "gone": the sheet's own height once measured, the window until then. */
  const [closedY, setClosedY] = useState(windowHeight);
  const [measured, setMeasured] = useState(false);
  const snapPoints = useMemo(() => ({ y: [0, closedY] }), [closedY]);
  const onSnap = useCallback(
    (_axis: "x" | "y", index: number) => {
      if (index === 1) onClose();
    },
    [onClose],
  );
  const { gesture, y, snapTo } = useSpringPan({
    axis: "y",
    snapPoints,
    initialIndex: 1,
    onSnap,
    spring: SPRING_SHEET,
  });

  /* Centred variant: one 0-to-1 value. */
  const open = useSharedValue(0);
  const backdropProgress = useGestureProgress(y, [closedY, 0]);

  const opened = useRef(false);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (isCenter) {
        open.set(withSpring(1, SPRING_SHEET));
      } else if (measured && !opened.current) {
        opened.current = true;
        snapTo({ y: 0 });
      }
      return;
    }
    opened.current = false;
    if (!mounted) return;
    /* Back to the first-open state, so a sheet whose content changed height measures afresh. */
    const unmount = () => {
      setMounted(false);
      setMeasured(false);
      setClosedY(windowHeight);
      y.set(windowHeight);
    };
    if (isCenter) {
      open.set(
        withSpring(0, SPRING_SHEET, (finished) => {
          if (finished) scheduleOnRN(unmount);
        }),
      );
    } else {
      snapTo({ y: 1 }, unmount);
    }
    // snapTo is rebuilt every render; its inputs are the dependencies below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted, measured, isCenter, closedY]);

  /* Everything each animated view needs is in its one animated style, with nothing plain beside
     it: a `style={[plain, animated]}` array drops the plain part. */
  const backdropStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: withAlpha(neutral.black, 0.45),
    opacity: isCenter ? open.get() : backdropProgress.get(),
  }));
  const panelStyle = useAnimatedStyle(() => {
    if (isCenter) {
      return {
        width: "100%",
        maxWidth: 420,
        alignSelf: "center",
        opacity: open.get(),
        transform: [{ scale: interpolate(open.get(), [0, 1], [0.96, 1], Extrapolation.CLAMP) }],
      };
    }
    return {
      width: "100%",
      marginBottom: keyboardInset > 0 ? keyboardInset : 0,
      transform: [{ translateY: y.get() }],
    };
  });

  if (!mounted) return null;

  const themedSheetStyle: ViewStyle = isCenter
    ? {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius["2xl"],
        overflow: "hidden",
        maxHeight: maxPx,
      }
    : {
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: "hidden",
        paddingBottom: Math.max(insets.bottom, 8),
        maxHeight: maxPx,
      };

  const body = (
    <View style={[styles.root, isCenter && styles.rootCenter]}>
      <Animated.View pointerEvents="none" style={backdropStyle} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <Animated.View
        style={panelStyle}
        onLayout={(event) => {
          if (isCenter) return;
          const h = Math.ceil(event.nativeEvent.layout.height);
          if (h > 0 && h !== closedY) setClosedY(h);
          if (!measured) setMeasured(true);
        }}
      >
        <View style={[themedSheetStyle, sheetStyle]}>
          {isCenter ? null : (
            <GestureDetector gesture={gesture}>
              <View style={styles.grabber} accessible accessibilityLabel="Drag to dismiss" collapsable={false}>
                <View style={[styles.pill, { backgroundColor: colors.border }]} />
              </View>
            </GestureDetector>
          )}
          {children}
        </View>
      </Animated.View>
    </View>
  );

  /* A Modal is its own window on Android: gestures inside it need their own root. */
  const rooted = <GestureHandlerRootView style={styles.fill}>{body}</GestureHandlerRootView>;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {keyboardAvoiding && keyboardInset <= 0 ? (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {rooted}
        </KeyboardAvoidingView>
      ) : (
        rooted
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  rootCenter: {
    justifyContent: "center",
    paddingHorizontal: space["2xl"],
  },
  grabber: {
    height: GRABBER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
  },
});
