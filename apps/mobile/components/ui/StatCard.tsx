import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

/** Label + value tile — mirrors the web StatCard. */
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
  const colors = useThemeColors();
  return (
    <View
      style={{
        ...(width ? { width: width as never } : {}),
        borderColor: highlight ? colorWithAlpha("#0b565a", 0.4) : colors.border,
        backgroundColor: highlight ? colorWithAlpha("#0b565a", 0.05) : colors.card,
      }}
      className="gap-1 rounded-xl border p-4"
    >
      <Text
        className="text-caption font-semibold uppercase tracking-wider text-muted-foreground"
        style={nepaliTextStyle(11)}
      >
        {label}
      </Text>
      <Text
        className="text-body font-semibold text-foreground"
        style={nepaliTextStyle(16)}
      >
        {value ?? "—"}
      </Text>
      {sub ? (
        <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
