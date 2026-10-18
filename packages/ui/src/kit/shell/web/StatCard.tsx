import { cn } from "@vedic-patro/design-tokens/cn";
import { spec } from "@vedic-patro/design-tokens";
import { Box, Text } from "@vedic-patro/ui";
import type { StatCardProps } from "../contract";

/** Label, value and optional caption. Same spec on both platforms. */
export function StatCard({ label, value, sub, highlight, className }: StatCardProps) {
  return (
    <Box className={cn(spec.statCard, highlight && spec.statCardHighlight, className)}>
      <Text className={spec.label}>{label}</Text>
      <Text className={spec.statValue}>{value ?? "—"}</Text>
      {sub ? <Text className={spec.caption}>{sub}</Text> : null}
    </Box>
  );
}
