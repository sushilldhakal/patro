import type { ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import { Text } from "@/components/ui/Text";
import { cn } from "@vedic-patro/domain/utils";
import { spec } from "@vedic-patro/design-tokens";

type Props = PressableProps & {
  label: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  textClassName?: string;
  /** Leading icon, as web's `<Button><Icon /> label</Button>`. */
  icon?: ReactNode;
};

/**
 * Same buttons as web's shadcn `Button`: the default is the *teal* secondary
 * colour (not the orange primary), h-8 / h-9 / h-10 with `text-sm` labels (weight 400, like the web).
 */
export function Button({
  label,
  variant = "default",
  size = "md",
  className,
  textClassName,
  disabled,
  icon,
  ...props
}: Props) {
  const base = cn(spec.button, "active:opacity-80");
  const sizes = {
    sm: spec.buttonSm,
    md: spec.buttonMd,
    lg: spec.buttonLg,
  };
  const variants = {
    default: "bg-secondary",
    outline: "border-border bg-background",
    ghost: "bg-transparent",
    secondary: "bg-secondary",
  };
  const textVariants = {
    default: "text-secondary-foreground",
    outline: "text-foreground",
    ghost: "text-foreground",
    secondary: "text-secondary-foreground",
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(base, sizes[size], variants[variant], disabled && "opacity-50", className)}
      {...props}
    >
      {icon ? <View>{icon}</View> : null}
      <Text className={cn("text-sm", textVariants[variant], textClassName)}>{label}</Text>
    </Pressable>
  );
}
