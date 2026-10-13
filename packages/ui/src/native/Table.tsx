import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { kitIcons, tableClass } from "../classes";
import type { TableColumn, TableProps } from "../contract";
import { Icon } from "./Icon";
import { Text } from "./Text";

function SortArrow({ sorted }: { sorted: TableColumn["sorted"] }) {
  if (sorted === "asc") return <Icon node={kitIcons.chevronUp} size="xs" />;
  if (sorted === "desc") return <Icon node={kitIcons.chevronDown} size="xs" />;
  return (
    <View className="opacity-40">
      <Icon node={kitIcons.chevronsUpDown} size="xs" />
    </View>
  );
}

/**
 * Columns keep their width and the table scrolls sideways when they do not fit
 * the screen; when they do fit, they share the spare room in proportion to
 * their widths, so the table fills its card as it does on the website.
 */
export function Table<Row>({
  columns,
  rows,
  rowKey,
  renderCell,
  empty,
  classes = {},
  className,
  nativeClassName,
  testID,
}: TableProps<Row>): ReactNode {
  const c = { ...tableClass, ...classes };
  const [viewport, setViewport] = useState(0);
  const total = columns.reduce((sum, col) => sum + col.width, 0);
  const fill = viewport > 0 && viewport >= total;
  const layout = (width: number) => (fill ? { flexGrow: width, flexShrink: 0, flexBasis: width } : { width });

  return (
    <View className={cn("overflow-hidden", c.root, className, nativeClassName)} testID={testID}>
      <ScrollView
        horizontal
        scrollEnabled={!fill}
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
      >
        <View style={{ width: fill ? viewport : total }}>
          <View className={cn("w-full flex-row", c.head)}>
            {columns.map((col) => {
              const header =
                typeof col.header === "string" ? (
                  <Text numberOfLines={1} className={cn("shrink", c.headText)}>
                    {col.header}
                  </Text>
                ) : (
                  col.header
                );
              return col.onPress ? (
                <Pressable
                  key={col.key}
                  onPress={col.onPress}
                  accessibilityRole="button"
                  style={layout(col.width)}
                  className={cn("flex-row items-center gap-1 active:opacity-70", c.headCell)}
                >
                  {header}
                  <SortArrow sorted={col.sorted} />
                </Pressable>
              ) : (
                <View key={col.key} style={layout(col.width)} className={cn("flex-row items-center", c.headCell)}>
                  {header}
                </View>
              );
            })}
          </View>
          {rows.length === 0 ? (
            <View className={c.emptyCell}>
              {typeof empty === "string" ? <Text className={c.emptyText}>{empty}</Text> : empty}
            </View>
          ) : (
            rows.map((row) => (
              <View key={rowKey(row)} className={cn("w-full flex-row", c.row)}>
                {columns.map((col) => (
                  <View key={col.key} style={layout(col.width)} className={cn("items-start justify-center", c.cell)}>
                    {renderCell(row, col)}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
