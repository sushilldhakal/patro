import { Children } from "react";
import { View, useWindowDimensions } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import type { GridColumns, GridProps } from "../contract";

/** Matches the website's breakpoints (`screens` in the design tokens). */
const FROM: [keyof Exclude<GridColumns, number>, number][] = [
  ["lg", 1024],
  ["md", 768],
  ["sm", 640],
  ["compact", 480],
  ["xs", 400],
];

function columnsAt(cols: GridColumns, width: number): number {
  if (typeof cols === "number") return cols;
  for (const [key, min] of FROM) {
    const n = cols[key];
    if (n && width >= min) return n;
  }
  return cols.base;
}

/**
 * React Native has no CSS grid: the cells go in rows of `cols`, each cell `flex: 1` so every
 * column is exactly the same width (percent widths can add up to a hair over 100% and wrap a
 * column). A short last row is padded with empty cells so its columns line up.
 */
export function Grid({ cols, gap = 0, gapX, gapY, label, className, nativeClassName, children, testID }: GridProps) {
  const { width } = useWindowDimensions();
  const n = Math.max(1, columnsAt(cols, width));
  const x = gapX ?? gap;
  const y = gapY ?? gap;
  const items = Children.toArray(children);
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  return (
    <View className={cn(className, nativeClassName)} accessibilityLabel={label} testID={testID} style={{ gap: y }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: x }}>
          {row.map((child, c) => (
            <View key={c} style={{ flex: 1, flexBasis: 0, minWidth: 0 }}>
              {child}
            </View>
          ))}
          {Array.from({ length: n - row.length }, (_, k) => (
            <View key={`pad-${k}`} style={{ flex: 1, flexBasis: 0, minWidth: 0 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
