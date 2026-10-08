import type { ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";

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
 * colour (not the orange primary), h-8 / h-9 / h-10 with `text-sm` labels.
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
  const base = "flex-row items-center justify-center gap-2 rounded-lg border border-transparent active:opacity-80";
  const sizes = {
    sm: "h-8 px-2.5",
    md: "h-9 px-3",
    lg: "h-10 px-4",
  };
  const variants = {
    default: "bg-secondary",
    outline: "border-border bg-background",
    ghost: "bg-transparent",
    secondary: "bg-secondary",
  };
  const textVariants = {
    default: "text-secondary-foreground font-medium",
    outline: "text-foreground font-medium",
    ghost: "text-foreground font-medium",
    secondary: "text-secondary-foreground font-medium",
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
