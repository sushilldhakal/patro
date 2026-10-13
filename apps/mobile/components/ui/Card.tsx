import { View, type ViewProps } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { spec } from "@vedic-patro/design-tokens";

type CardProps = ViewProps & {
  className?: string;
  /** Page-level card (`cardRoomy`) or dense row (`cardCompact`). Default: `card`. */
  size?: "default" | "roomy" | "compact";
};

const SIZE_SPEC = { default: spec.card, roomy: spec.cardRoomy, compact: spec.cardCompact } as const;

export function Card({ className, size = "default", ...props }: CardProps) {
  return <View className={cn(SIZE_SPEC[size], className)} {...props} />;
}
