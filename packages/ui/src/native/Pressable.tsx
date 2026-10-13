import { Pressable as RNPressable } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import type { PressableProps } from "../contract";

export function Pressable({ onPress, disabled, label, role = "button", selected, className, nativeClassName, children, testID }: PressableProps) {
  return (
    <RNPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: role === "tab" ? Boolean(selected) : undefined, checked: role === "checkbox" ? Boolean(selected) : undefined }}
      hitSlop={8}
      testID={testID}
      className={cn("active:opacity-70", disabled && "opacity-50", className, nativeClassName)}
    >
      {children}
    </RNPressable>
  );
}
