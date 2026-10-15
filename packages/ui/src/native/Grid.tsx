import { Children, useCallback, useState } from "react";
import { View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
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
 * React Native has no CSS grid. The container is measured once and every cell gets the same exact
 * pixel width (`flex` / percent widths leave the row height to be guessed before the text has a
 * width, and tiles then overlap whatever comes next). Until the first measurement the cells share
 * the row with `flex: 1`. A short last row is padded so its columns line up.
 */
export function Grid({ cols, gap = 0, gapX, gapY, label, className, nativeClassName, children, testID }: GridProps) {
  const { width: screen } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);
  const n = Math.max(1, columnsAt(cols, screen));
  const x = gapX ?? gap;
  const y = gapY ?? gap;
  const cell = width > 0 ? Math.floor(((width - x * (n - 1)) / n) * 100) / 100 : 0;
  const cellStyle = cell > 0 ? { width: cell, maxWidth: cell, minWidth: 0 } : { flex: 1, flexBasis: 0, minWidth: 0 };
  const items = Children.toArray(children);
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  return (
    <View className={cn(className, nativeClassName)} accessibilityLabel={label} testID={testID} onLayout={onLayout} style={{ gap: y }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: x }}>
          {row.map((child, c) => (
            <View key={c} style={cellStyle}>
              {child}
            </View>
          ))}
          {Array.from({ length: n - row.length }, (_, k) => (
            <View key={`pad-${k}`} style={cellStyle} />
          ))}
        </View>
      ))}
    </View>
  );
}
