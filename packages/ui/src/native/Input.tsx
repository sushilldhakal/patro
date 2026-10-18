import { TextInput } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { InputProps } from "../contract";

export function Input({ value, onChange, onSubmit, placeholder, type = "text", multiline, disabled, autoFocus, label, className, nativeClassName, testID }: InputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      editable={!disabled}
      autoFocus={autoFocus}
      multiline={multiline}
      secureTextEntry={type === "password"}
      keyboardType={type === "email" ? "email-address" : type === "number" ? "numeric" : "default"}
      autoCapitalize={type === "text" || type === "search" ? undefined : "none"}
      returnKeyType={type === "search" ? "search" : undefined}
      accessibilityLabel={label}
      testID={testID}
      className={cn(className, nativeClassName)}
    />
  );
}
