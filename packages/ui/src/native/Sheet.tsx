import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { cssInterop } from "nativewind";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { cn } from "@vedic-patro/design-tokens/cn";
import { DURATION, EASE_OUT, SPRING_SHEET, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { kitIcons, sheetClass } from "../classes";
import type { SheetProps } from "../contract";
import { Icon } from "./Icon";
import { Text } from "./Text";

const MotionView = cssInterop(Animated.View, { className: "style" });

const FILL = { flex: 1 } as const;

/* A top sheet draws under the status bar (the modal is edge to edge), so its
   title and close button sat on the clock and battery. The kit cannot read the
   app's safe-area insets; this clears the bar on both platforms. */
const TOP_SHEET_INSET = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 12 : 56;

/** Let go past this fraction of the panel's height, or flick faster than this (px/s), and it dismisses. */
const DISMISS_FRACTION = 0.35;
const FLICK_VELOCITY = 800;
/** The bottom edge is a hard edge: a bounce past it would lift the panel off the screen's bottom. */
const PANEL_SPRING = { ...SPRING_SHEET, overshootClamping: true };

/** The further past the edge, the less the panel follows the finger. */
function rubberband(overshoot: number, dimension: number) {
  "worklet";
  if (dimension <= 0) return 0;
  const constant = 0.55;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * A panel that rises from the bottom; the back button and a tap on the backdrop close it, and so does
 * dragging its handle or header down. A top sheet, and any sheet under Reduce Motion, fades instead.
 */
export function Sheet({ open, onClose, title, closeLabel, maxHeightPercent, placement, children, className, nativeClassName, testID }: SheetProps) {
  const top = placement === "top";
  const reduced = useReducedMotionPref();
  const fadeOnly = top || reduced;
  /** A top sheet keeps the length of the fade the Modal gave it; the rest use the standard step. */
  const fadeMs = top ? DURATION.slow : DURATION.standard;

  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(Dimensions.get("window").height);
  const panelHeight = useSharedValue(0);
  const fade = useSharedValue(0);
  const scrim = useSharedValue(0);
  const dragFrom = useSharedValue(0);
  const dismissing = useSharedValue(false);

  const opened = useRef(false);
  const committed = useRef(false);
  const openRef = useRef(open);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const finishClose = useCallback(() => {
    if (openRef.current) return;
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
    scrim.set(withTiming(1, { duration: fadeMs, easing: EASE_OUT }));
    if (fadeOnly) fade.set(withTiming(1, { duration: fadeMs, easing: EASE_OUT }));
    else y.set(withSpring(0, PANEL_SPRING));
  }, [dismissing, fade, fadeMs, fadeOnly, scrim, y]);

  const animateClose = useCallback(() => {
    scrim.set(withTiming(0, { duration: fadeMs, easing: EASE_OUT }));
    if (fadeOnly) {
      fade.set(
        withTiming(0, { duration: fadeMs, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }),
      );
    } else {
      y.set(
        withTiming(panelHeight.get(), { duration: DURATION.standard, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }),
      );
    }
  }, [fade, fadeMs, fadeOnly, finishClose, panelHeight, scrim, y]);

  useEffect(() => {
    openRef.current = open;
    if (open) {
      if (!mounted) {
        // Opening from closed: start hidden, and open once the panel has been measured (onLayout).
        y.set(Dimensions.get("window").height);
        panelHeight.set(0);
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
  }, [open, mounted, animateOpen, animateClose, dismissing, fade, panelHeight, scrim, y]);

  const onPanelLayout = useCallback(
    (e: LayoutChangeEvent) => {
      panelHeight.set(e.nativeEvent.layout.height);
      if (!opened.current && openRef.current) {
        opened.current = true;
        animateOpen();
      }
    },
    [animateOpen, panelHeight],
  );

  /* The handle and header are the drag area; the scroll view below keeps its own touches. */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!fadeOnly)
        .activeOffsetY(10)
        .failOffsetX([-24, 24])
        .onStart(() => {
          // From where the eye last saw it, so grabbing mid-spring doesn't teleport the panel.
          dragFrom.set(y.get());
        })
        .onUpdate((e) => {
          if (dismissing.get()) return;
          const next = dragFrom.get() + e.translationY;
          const h = panelHeight.get();
          y.set(next >= 0 ? next : rubberband(next, h));
          if (h > 0) scrim.set(interpolate(y.get(), [0, h], [1, 0], Extrapolation.CLAMP));
        })
        .onEnd((e) => {
          if (dismissing.get()) return;
          const h = panelHeight.get();
          const far = h > 0 && y.get() > h * DISMISS_FRACTION;
          const flick = e.velocityY > FLICK_VELOCITY;
          if (far || flick) {
            dismissing.set(true);
            scrim.set(withTiming(0, { duration: fadeMs, easing: EASE_OUT }));
            y.set(
              withSpring(h, { ...PANEL_SPRING, velocity: e.velocityY }, (finished) => {
                if (finished) scheduleOnRN(finishClose);
              }),
            );
            scheduleOnRN(commitDismiss);
          } else {
            scrim.set(withTiming(1, { duration: fadeMs, easing: EASE_OUT }));
            y.set(withSpring(0, { ...PANEL_SPRING, velocity: e.velocityY }));
          }
        }),
    [commitDismiss, dismissing, dragFrom, fadeMs, fadeOnly, finishClose, panelHeight, scrim, y],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: scrim.get() }));
  const panelMotion = useAnimatedStyle(() => (fadeOnly ? { opacity: fade.get() } : { transform: [{ translateY: y.get() }] }));

  const head = (
    <>
      {top ? null : <View className={sheetClass.handle} />}
      {title || closeLabel ? (
        <View className={sheetClass.header}>
          {title ? (
            <Text as="h2" className={sheetClass.title}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {closeLabel ? (
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} className="p-1 active:opacity-70">
              <Icon node={kitIcons.x} size="md" tone="muted" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} testID={testID}>
      {/* A Modal is its own window on Android: gestures need their own root inside it. */}
      <GestureHandlerRootView style={FILL}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={cn("flex-1", top ? "justify-start" : "justify-end")}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <Pressable
              className={cn("absolute bottom-0 left-0 right-0 top-0", sheetClass.backdrop)}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
            />
          </Animated.View>
          <MotionView
            onLayout={onPanelLayout}
            className={cn(top ? sheetClass.panelTop : cn("pb-10", sheetClass.panel), className, nativeClassName)}
            accessibilityViewIsModal
            style={[{ maxHeight: `${maxHeightPercent ?? 85}%` }, top ? { paddingTop: TOP_SHEET_INSET } : null, panelMotion]}
          >
            {top ? (
              head
            ) : (
              <GestureDetector gesture={pan}>
                <View>{head}</View>
              </GestureDetector>
            )}
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {children}
            </ScrollView>
          </MotionView>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
