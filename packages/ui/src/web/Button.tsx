import { cn } from "@vedic-patro/domain/utils";
import { buttonClass } from "../classes";
import type { ButtonProps } from "../contract";

/** The website's interaction states on top of the shared look (same as its shadcn Button). */
export const buttonWebClass = {
  base: "inline-flex shrink-0 select-none whitespace-nowrap bg-clip-padding outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  variant: {
    default: "hover:bg-secondary/80",
    secondary: "hover:bg-secondary/80",
    outline: "hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
    ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
    destructive: "hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30",
  },
} as const;

export function Button({
  label,
  onPress,
  variant = "default",
  size = "md",
  icon,
  disabled,
  type = "button",
  className,
  webClassName,
  textClassName,
  testID,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onPress}
      data-testid={testID}
      className={cn(
        buttonClass.base,
        buttonWebClass.base,
        buttonClass.size[size],
        buttonClass.variant[variant],
        buttonWebClass.variant[variant],
        buttonClass.label,
        buttonClass.text[variant],
        disabled && buttonClass.disabled,
        className,
        webClassName,
      )}
    >
      {icon}
      <span className={textClassName}>{label}</span>
    </button>
  );
}
