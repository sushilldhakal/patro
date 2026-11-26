import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";

/**
 * A plain rate table for the forex and metals pages: a header row, then one row per line, each
 * optionally tappable. Columns after the first are right-aligned numbers.
 */
export function RateTable({
  head,
  rows,
  onPressRow,
}: {
  head: string[];
  /** `change` shows under the last cell, green ▲ or red ▼. */
  rows: { key: string; cells: string[]; sub?: string; change?: { text: string; up: boolean } | null }[];
  onPressRow?: (key: string) => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <View className="flex-row border-b border-border bg-muted px-3 py-2">
        {head.map((h, i) => (
          <Text
            key={h}
            className={`flex-1 text-xs font-bold text-muted-foreground ${i ? "text-right" : ""}`}
          >
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, n) => (
        <Pressable
          key={r.key}
          disabled={!onPressRow}
          onPress={() => onPressRow?.(r.key)}
          accessibilityRole={onPressRow ? "button" : undefined}
          className={`flex-row items-center px-3 py-2.5 active:opacity-70 ${n ? "border-t border-border" : ""}`}
        >
          {r.cells.map((c, i) => (
            <View key={i} className="flex-1">
              <Text
                className={`text-sm tabular-nums text-foreground ${i ? "text-right" : "font-semibold"}`}
                numberOfLines={1}
              >
                {c}
              </Text>
              {i === 0 && r.sub ? (
                <Text
                  className="text-xs text-muted-foreground"
                  numberOfLines={1}
                >
                  {r.sub}
                </Text>
              ) : null}
              {i === r.cells.length - 1 && r.change ? (
                <Text
                  className="text-right text-xs font-semibold tabular-nums"
                  style={{ color: r.change.up ? colors.success : colors.destructive }}
                  numberOfLines={1}
                >
                  {r.change.up ? "▲" : "▼"} {r.change.text}
                </Text>
              ) : null}
            </View>
          ))}
        </Pressable>
      ))}
    </View>
  );
}
