import { View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { spec } from "@vedic-patro/design-tokens";
import { Text } from "@vedic-patro/ui";
import type { StatCardProps } from "../contract";

/**
 * Label, value and optional caption. `width` is a computed percentage, so it
 * sits on a View: Box has no style prop.
 */
export function StatCard({ label, value, sub, highlight, className, width }: StatCardProps) {
  return (
    <View style={width ? { width: width as never } : undefined} className={cn(spec.statCard, highlight && spec.statCardHighlight, className)}>
      <Text className={spec.label}>{label}</Text>
      <Text className={spec.statValue}>{value ?? "—"}</Text>
      {sub ? <Text className={spec.caption}>{sub}</Text> : null}
    </View>
  );
}
