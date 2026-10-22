import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { buttonClass } from "../classes";
import type { ButtonProps } from "../contract";
import { Pressable } from "./Pressable";
import { Text } from "./Text";

export function Button({
  label,
  children,
  ariaLabel,
  onPress,
  variant = "default",
  size = "md",
  icon,
  disabled,
  className,
  nativeClassName,
  textClassName,
  testID,
}: ButtonProps) {
  return (
    <Pressable
      label={label ? undefined : ariaLabel}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={cn(
        buttonClass.base,
        "active:opacity-80",
        buttonClass.size[size],
        buttonClass.variant[variant],
        disabled && buttonClass.disabled,
        className,
        nativeClassName,
      )}
    >
      {icon ? <View>{icon}</View> : null}
      {children ?? <Text className={cn(buttonClass.label, buttonClass.text[variant], textClassName)}>{label}</Text>}
    </Pressable>
  );
}
