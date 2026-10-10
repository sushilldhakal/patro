import { useCallback, useState } from "react";
import type { LayoutChangeEvent, ViewStyle } from "react-native";

export const CALENDAR_COLS = 7;
export const CALENDAR_GRID_GAP = 1;

export function calendarColumnWidth(containerWidth: number): number {
  if (containerWidth <= 0) return 0;
  return (containerWidth - CALENDAR_GRID_GAP * (CALENDAR_COLS - 1)) / CALENDAR_COLS;
}

/** Measure grid width once — header and body cells share the same column width. */
export function useCalendarGridWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);
  const colWidth = calendarColumnWidth(width);
  return { onLayout, colWidth, ready: colWidth > 0 };
}

export function calendarColStyle(colWidth: number, extra?: ViewStyle): ViewStyle {
  if (colWidth <= 0) {
    return { flex: 1, flexBasis: 0, minWidth: 0, ...extra };
  }
  return { width: colWidth, maxWidth: colWidth, minWidth: 0, ...extra };
}

/** Inset selection ring — avoids border changing column width. */
export function selectionRingStyle(color: string): ViewStyle {
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderColor: color,
    pointerEvents: "none",
  };
}
