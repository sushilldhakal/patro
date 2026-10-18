import { cn } from "@vedic-patro/design-tokens/cn";
import type { PressableProps } from "../contract";

export function Pressable({ onPress, disabled, label, role = "button", selected, className, webClassName, children, testID }: PressableProps) {
  return (
    <button
      type="button"
      role={role === "button" ? undefined : role}
      aria-label={label}
      aria-selected={role === "tab" ? Boolean(selected) : undefined}
      aria-checked={role === "checkbox" ? Boolean(selected) : undefined}
      disabled={disabled}
      onClick={onPress}
      data-testid={testID}
      className={cn("text-left", disabled ? "cursor-not-allowed" : "cursor-pointer", className, webClassName)}
    >
      {children}
    </button>
  );
}
