import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

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
  rows: { key: string; cells: string[]; sub?: string }[];
  onPressRow?: (key: string) => void;
}) {
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
            </View>
          ))}
        </Pressable>
      ))}
    </View>
  );
}
