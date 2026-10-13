import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { spec } from "@vedic-patro/design-tokens";

/** Label + value tile. Same spec as the website's StatCard. */
export function StatCard({
  label,
  value,
  sub,
  highlight,
  width,
}: {
  label: string;
  value?: string | null;
  sub?: string;
  highlight?: boolean;
  width?: string;
}) {
  return (
    <View
      style={width ? { width: width as never } : undefined}
      className={cn(spec.statCard, highlight && spec.statCardHighlight)}
    >
      <Text variant="label" style={nepaliTextStyle()}>
        {label}
      </Text>
      <Text variant="statValue" style={nepaliTextStyle()}>
        {value ?? "—"}
      </Text>
      {sub ? (
        <Text variant="caption" style={nepaliTextStyle()}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
