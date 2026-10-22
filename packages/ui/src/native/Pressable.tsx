import { useState } from "react";
import { Pressable as RNPressable } from "react-native";
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { PressableProps } from "../contract";
import { CSS_EASE_OUT, DURATION, PRESS_SCALE, useReducedMotionPref } from "./motion";

const ScalePressable = cssInterop(Animated.createAnimatedComponent(RNPressable), { className: "style" });
const FadeView = cssInterop(Animated.View, { className: "style" });

/**
 * The control's own corner classes (`rounded-xl`, `md:rounded-2xl`, …), so the
 * highlight drawn inside it has the same corners. Without them it was a square
 * of muted grey behind a rounded chip.
 */
function cornerClasses(...classNames: Array<string | undefined>): string {
  return classNames
    .flatMap((c) => (c ?? "").split(/\s+/))
    .filter((c) => /^(?:[\w-]+:)*rounded(?:-|$)/.test(c))
    .join(" ");
}

/** Segmented active fill. Opacity only, so Reduce Motion keeps it. */
const FILL_MS = 150;

export type NativePressableProps = PressableProps & {
  /**
   * Full-width list rows opt out of the press scale and highlight their
   * background instead. A scaling row reads as the whole screen squishing.
   */
  suppressPressScale?: boolean;
};

export function Pressable({
  onPress,
  disabled,
  label,
  role = "button",
  selected,
  className,
  nativeClassName,
  children,
  testID,
  suppressPressScale = false,
}: NativePressableProps) {
  const reduced = useReducedMotionPref();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const scale = !reduced && !suppressPressScale && pressed && !disabled;
  const highlight = !disabled && (hovered || (suppressPressScale && pressed));

  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: role === "tab" ? Boolean(selected) : undefined, checked: role === "checkbox" ? Boolean(selected) : undefined }}
      hitSlop={8}
      pressRetentionOffset={16}
      testID={testID}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={cn("active:opacity-70", disabled && "opacity-50", className, nativeClassName)}
      style={{
        transform: [{ scale: scale ? PRESS_SCALE : 1 }],
        transitionProperty: "transform",
        transitionDuration: reduced || suppressPressScale ? 0 : DURATION.fast,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    >
      <FadeView
        pointerEvents="none"
        className={cn("bg-muted", cornerClasses(className, nativeClassName))}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: highlight ? 1 : 0,
          transitionProperty: "opacity",
          transitionDuration: DURATION.fast,
          transitionTimingFunction: CSS_EASE_OUT,
        }}
      />
      {children}
    </ScalePressable>
  );
}

/** The active pill of a segmented control. Fades in 150ms; the label stays put. */
export function SelectionFill({ active, className }: { active: boolean; className?: string }) {
  return (
    <FadeView
      pointerEvents="none"
      className={cn(className)}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        opacity: active ? 1 : 0,
        transitionProperty: "opacity",
        transitionDuration: FILL_MS,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    />
  );
}
