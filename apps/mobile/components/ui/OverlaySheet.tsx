/**
 * A panel anchored to the bottom of a 3D canvas.
 *
 * The web puts these controls in a ~260px drawer floating beside the scene. At
 * phone width that is most of the canvas, and it covers the part of the picture
 * the controls are adjusting — so on this platform the panel takes the bottom
 * of the card instead, where the scene above it stays visible while a layer is
 * switched.
 *
 * Always dark glass, never themed: it floats over the sky's own black, so
 * light-mode tokens would come out near-invisible on it.
 *
 * Shared by the Learn playground and the Aakash Gochar sky, because both put
 * the same kind of thing in the same place and a second copy would drift.
 */

import { Pressable, ScrollView, View } from "react-native";
import { cssInterop } from "nativewind";
import Animated, {
  FadeIn,
  FadeOut,
  withSpring,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
} from "react-native-reanimated";
import { Ionicons } from "@/components/icons/Ionicons";

import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";

import { neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { DURATION, EASE_OUT, SPRING_SHEET, useReducedMotionPref } from "@vedic-patro/ui/motion";

const MotionView = cssInterop(Animated.View, { className: "style" });

/* The panel is mounted and unmounted by its parent, so the motion is a layout animation: it rises by
   its own height with the sheet spring, and leaves the way it came. The canvas clips what is below it. */
const SHEET_SPRING = { ...SPRING_SHEET, overshootClamping: true };
const sheetIn = (values: EntryAnimationsValues) => {
  "worklet";
  return {
    initialValues: { transform: [{ translateY: values.targetHeight }] },
    animations: { transform: [{ translateY: withSpring(0, SHEET_SPRING) }] },
  };
};
const sheetOut = (values: ExitAnimationsValues) => {
  "worklet";
  return {
    initialValues: { transform: [{ translateY: 0 }] },
    animations: {
      transform: [{ translateY: withTiming(values.currentHeight, { duration: DURATION.standard, easing: EASE_OUT }) }],
    },
  };
};
/** Reduce Motion: no travel, just a fade. */
const FADE_IN = FadeIn.duration(DURATION.standard).easing(EASE_OUT);
const FADE_OUT = FadeOut.duration(DURATION.standard).easing(EASE_OUT);

export function OverlaySheet({
  title,
  onClose,
  maxHeight,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Cap against the canvas, not the window — the sheet belongs to the scene. */
  maxHeight: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotionPref();
  return (
    <MotionView
      entering={reduced ? FADE_IN : sheetIn}
      exiting={reduced ? FADE_OUT : sheetOut}
      className="absolute inset-x-0 bottom-0 border-t border-white/15"
      style={{ backgroundColor: withAlpha(wheel.sky2, 0.95), maxHeight }}
    >
      <View className="flex-row items-center justify-between px-3 pb-1 pt-2.5">
        <Text
          className="text-caption font-bold uppercase tracking-wide"
          style={[nepaliTextStyle(11), { color: withAlpha(neutral.white, 0.75) }]}
        >
          {title}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          className="h-7 w-7 items-center justify-center rounded-full border border-white/20"
        >
          <Ionicons name="close" size={14} color={withAlpha(neutral.white, 0.75)} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 px-3 pb-3.5">
        {children}
      </ScrollView>
    </MotionView>
  );
}

/** A titled run of chips inside a sheet. */
export function SheetSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text
        className="text-caption font-bold uppercase tracking-wide"
        style={[nepaliTextStyle(10), { color: withAlpha(neutral.white, 0.55) }]}
      >
        {heading}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">{children}</View>
    </View>
  );
}

export default OverlaySheet;
