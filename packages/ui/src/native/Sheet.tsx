import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kitIcons, sheetClass } from "../classes";
import type { SheetProps } from "../contract";
import { Icon } from "./Icon";
import { haptics, useReducedMotionPref } from "./motion";
import { Text } from "./Text";

/* A top sheet draws under the status bar (the modal is edge to edge), so its
   title and close button sat on the clock and battery. The kit cannot read the
   app's safe-area insets; this clears the bar on both platforms. */
const TOP_SHEET_INSET = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 12 : 56;

/** In: a spring that settles without overshoot. Out: a short ease, since nobody watches a sheet leave. */
const OPEN_SPRING = { duration: 340, dampingRatio: 1 } as const;
const CLOSE_TIMING = { duration: 200, easing: Easing.bezier(0.32, 0.72, 0, 1) } as const;
/** A release past a quarter of the panel, or a flick, dismisses it. */
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY = 900;

/**
 * A panel that rises from the bottom (or drops from the top, or appears in the centre). The
 * backdrop fades while the panel springs in, closing plays out before it unmounts, and a bottom
 * sheet can be dragged down by its handle or title to dismiss. The back button and a tap on the
 * backdrop close it too. With Reduce Motion it only fades.
 */
export function Sheet({ open, onClose, title, closeLabel, maxHeightPercent, placement, children, className, nativeClassName, testID }: SheetProps) {
  const top = placement === "top";
  const center = placement === "center";
  const reduced = useReducedMotionPref();

  /* Stays mounted after `open` turns false, until the exit animation has finished. */
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  /** 0 hidden, 1 shown. */
  const shown = useSharedValue(0);
  /** The finger's drag, in points below the resting place. */
  const drag = useSharedValue(0);
  const height = useSharedValue(600);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      drag.set(0);
      shown.set(reduced ? withTiming(1, { duration: 160 }) : withSpring(1, OPEN_SPRING));
    } else {
      shown.set(
        withTiming(0, reduced ? { duration: 140 } : CLOSE_TIMING, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, mounted, reduced, shown, drag]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const panelStyle = useAnimatedStyle(() => {
    const p = shown.get();
    if (reduced) return { opacity: p };
    if (center) return { opacity: p, transform: [{ scale: 0.96 + 0.04 * p }] };
    const off = (1 - p) * (height.get() + 24);
    return { transform: [{ translateY: top ? -off : off + drag.get() }] };
  });

  const pan = Gesture.Pan()
    .enabled(!top && !center)
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      // Down follows the finger; up resists, so the panel only gives a little.
      drag.set(e.translationY > 0 ? e.translationY : e.translationY / 6);
    })
    .onEnd((e) => {
      const pastEdge = e.translationY > height.get() * DISMISS_FRACTION;
      if (pastEdge || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(haptics.snap);
        scheduleOnRN(onClose);
        return;
      }
      drag.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityY }));
    });

  const onPanelLayout = (e: LayoutChangeEvent) => height.set(e.nativeEvent.layout.height);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} testID={testID}>
      {/* A modal is its own native root: gestures inside it need their own handler root. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={cn("flex-1", top ? "justify-start" : center ? "justify-center px-5" : "justify-end")}>
          {/* Colour and shape sit on plain views: NativeWind classes on a reanimated view are
              dropped, which left the panel see-through and the backdrop without a size to tap. */}
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <Pressable className={cn("flex-1", sheetClass.backdrop)} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} />
          </Animated.View>
          <Animated.View
            accessibilityViewIsModal
            onLayout={onPanelLayout}
            style={[{ maxHeight: `${maxHeightPercent ?? 85}%` }, panelStyle]}
          >
            <View
              className={cn(top ? sheetClass.panelTop : center ? sheetClass.panelCenter : cn("pb-10", sheetClass.panel), className, nativeClassName)}
              style={[{ flexShrink: 1 }, top ? { paddingTop: TOP_SHEET_INSET } : null]}
            >
              {/* The handle and title are the drag area; the list below keeps its own scrolling. */}
              <GestureDetector gesture={pan}>
                <View>
                  {top || center ? null : <View className={sheetClass.handle} />}
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
                </View>
              </GestureDetector>
              <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                {children}
              </ScrollView>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
