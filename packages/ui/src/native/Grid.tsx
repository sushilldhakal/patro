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
 * React Native has no CSS grid: cells go in wrapping rows, each `100 / cols` % wide,
 * with half the gap as padding on every side and the same amount pulled back out
 * with a negative margin, so the outer edge stays flush and the gaps stay `gap`.
 */
export function Grid({ cols, gap = 0, gapX, gapY, label, className, nativeClassName, children, testID }: GridProps) {
  const { width } = useWindowDimensions();
  const n = Math.max(1, columnsAt(cols, width));
  const x = (gapX ?? gap) / 2;
  const y = (gapY ?? gap) / 2;
  return (
    <View className={cn(className, nativeClassName)} accessibilityLabel={label} testID={testID}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -x, marginVertical: -y }}>
        {Children.toArray(children).map((child, i) => (
          <View key={i} style={{ width: `${100 / n}%`, paddingHorizontal: x, paddingVertical: y }}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}
