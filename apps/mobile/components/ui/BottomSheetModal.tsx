import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/lib/theme-context";

import { neutral, radius, space, withAlpha } from "@vedic-patro/design-tokens";
import {
  DURATION,
  EASE_OUT,
  ENTER_SCALE,
  SPRING_SHEET,
  haptics,
  useReducedMotionPref,
} from "@vedic-patro/ui/motion";
/** The centred (tablet) card still fades and scales in over these. */
const OPEN_MS = 280;
const CLOSE_MS = 220;
/** The strip at the top of the sheet that drags it; below it, inner scroll views keep their touches. */
const GRAB_ZONE = 64;
/** Let go past this fraction of the sheet's height, or flick faster than this (px/s), and it dismisses. */
const DISMISS_FRACTION = 0.35;
const FLICK_VELOCITY = 600;
/** The bottom edge is a hard edge: a bounce past it would lift the sheet off the screen's bottom. */
const SHEET_SPRING = { ...SPRING_SHEET, overshootClamping: true };

/** The further past the edge, the less the sheet follows the finger. */
function rubberband(overshoot: number, dimension: number) {
  "worklet";
  if (dimension <= 0) return 0;
  const constant = 0.55;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

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

/**
 * Bottom drawer with backdrop fade + sheet spring in sync (avoids RN `animationType="slide"` flash).
 * Drag the top of the sheet down to dismiss it. Reduce Motion: the sheet fades instead of moving.
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
  const reduced = useReducedMotionPref();
  const isCenter = variant === "center";
  /** The centred card, and every sheet under Reduce Motion, fade rather than travel. */
  const fadeOnly = isCenter || reduced;

  const [mounted, setMounted] = useState(visible);
  /** Sheet offset from its resting place; starts below the screen until it has been measured. */
  const y = useSharedValue(Dimensions.get("window").height);
  const sheetHeight = useSharedValue(0);
  /** Extra distance to travel off screen: the sheet is lifted by the keyboard inset. */
  const lift = useSharedValue(0);
  const fade = useSharedValue(0);
  const scrim = useSharedValue(0);
  const dragFrom = useSharedValue(0);
  const dismissing = useSharedValue(false);

  const opened = useRef(false);
  const committed = useRef(false);
  const visibleRef = useRef(visible);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    lift.set(keyboardInset > 0 ? keyboardInset : 0);
  }, [lift, keyboardInset]);

  /** Close finished (or was never started): take the modal down. */
  const finishClose = useCallback(() => {
    if (visibleRef.current) return;
    opened.current = false;
    committed.current = false;
    setMounted(false);
  }, []);

  /** A drag let go past the threshold: tell the parent now, the spring carries on off screen. */
  const commitDismiss = useCallback(() => {
    haptics.snap();
    committed.current = true;
    onCloseRef.current();
  }, []);

  const animateOpen = useCallback(() => {
    dismissing.set(false);
    committed.current = false;
    scrim.set(withTiming(1, { duration: DURATION.standard, easing: EASE_OUT }));
    if (fadeOnly) {
      fade.set(withTiming(1, { duration: isCenter ? OPEN_MS : DURATION.standard, easing: EASE_OUT }));
    } else {
      y.set(withSpring(0, SHEET_SPRING));
    }
  }, [dismissing, fade, fadeOnly, isCenter, scrim, y]);

  const animateClose = useCallback(() => {
    scrim.set(withTiming(0, { duration: DURATION.standard, easing: EASE_OUT }));
    if (fadeOnly) {
      fade.set(
        withTiming(0, { duration: isCenter ? CLOSE_MS : DURATION.standard, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }),
      );
    } else {
      y.set(
        withTiming(sheetHeight.get() + lift.get(), { duration: CLOSE_MS, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }),
      );
    }
  }, [fade, fadeOnly, finishClose, isCenter, lift, scrim, sheetHeight, y]);

  useEffect(() => {
    visibleRef.current = visible;
    if (visible) {
      if (!mounted) {
        // Opening from closed: start hidden, and open once the sheet has been measured (onLayout).
        y.set(Dimensions.get("window").height);
        sheetHeight.set(0);
        fade.set(0);
        scrim.set(0);
        dismissing.set(false);
        opened.current = false;
        committed.current = false;
        setMounted(true);
      } else if (opened.current) {
        // Reopened while still closing: come back from wherever it is.
        animateOpen();
      }
      return;
    }
    if (!mounted || committed.current) return;
    if (!opened.current) {
      setMounted(false);
      return;
    }
    animateClose();
  }, [visible, mounted, animateOpen, animateClose, dismissing, fade, scrim, sheetHeight, y]);

  const onSheetLayout = useCallback(
    (e: LayoutChangeEvent) => {
      sheetHeight.set(e.nativeEvent.layout.height);
      if (!opened.current && visibleRef.current) {
        opened.current = true;
        animateOpen();
      }
    },
    [animateOpen, sheetHeight],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!fadeOnly)
        .hitSlop({ top: 0, height: GRAB_ZONE })
        .activeOffsetY(10)
        .failOffsetX([-24, 24])
        .onStart(() => {
          // From where the eye last saw it, so grabbing mid-spring doesn't teleport the sheet.
          dragFrom.set(y.get());
        })
        .onUpdate((e) => {
          if (dismissing.get()) return;
          const next = dragFrom.get() + e.translationY;
          const h = sheetHeight.get();
          y.set(next >= 0 ? next : rubberband(next, h));
          if (h > 0) scrim.set(interpolate(y.get(), [0, h], [1, 0], Extrapolation.CLAMP));
        })
        .onEnd((e) => {
          if (dismissing.get()) return;
          const h = sheetHeight.get();
          const far = h > 0 && y.get() > h * DISMISS_FRACTION;
          const flick = e.velocityY > FLICK_VELOCITY;
          if (far || flick) {
            dismissing.set(true);
            scrim.set(withTiming(0, { duration: DURATION.standard, easing: EASE_OUT }));
            y.set(
              withSpring(h + lift.get(), { ...SHEET_SPRING, velocity: e.velocityY }, (finished) => {
                if (finished) scheduleOnRN(finishClose);
              }),
            );
            scheduleOnRN(commitDismiss);
          } else {
            scrim.set(withTiming(1, { duration: DURATION.standard, easing: EASE_OUT }));
            y.set(withSpring(0, { ...SHEET_SPRING, velocity: e.velocityY }));
          }
        }),
    [commitDismiss, dismissing, dragFrom, fadeOnly, finishClose, lift, scrim, sheetHeight, y],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));
  const sheetMotion = useAnimatedStyle(() => {
    if (isCenter) {
      const p = fade.get();
      return reduced
        ? { opacity: p }
        : { opacity: p, transform: [{ scale: interpolate(p, [0, 1], [ENTER_SCALE, 1]) }] };
    }
    if (reduced) return { opacity: fade.get() };
    return { transform: [{ translateY: y.get() }] };
  });

  if (!mounted) return null;

  const themedSheetStyle: ViewStyle = isCenter
    ? {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      }
    : {
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: "hidden",
        paddingBottom: Math.max(insets.bottom, 8),
      };

  const body = (
    <View style={[styles.root, isCenter && styles.rootCenter]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={onSheetLayout}
          style={[
            isCenter ? styles.sheetCenter : styles.sheet,
            !isCenter && {
              maxHeight,
              marginBottom: keyboardInset > 0 ? keyboardInset : 0,
            },
            isCenter && {
              maxHeight,
            },
            themedSheetStyle,
            sheetStyle,
            sheetMotion,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* A Modal is its own window on Android: gestures need their own root inside it. */}
      <GestureHandlerRootView style={styles.gestureRoot}>
        {keyboardAvoiding && keyboardInset <= 0 ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {body}
          </KeyboardAvoidingView>
        ) : (
          body
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: withAlpha(neutral.black, 0.45),
  },
  sheet: {
    width: "100%",
  },
  rootCenter: {
    justifyContent: "center",
    paddingHorizontal: space["2xl"],
  },
  sheetCenter: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: radius["2xl"],
    overflow: "hidden",
  },
});
