import { useCallback, useState } from "react";
import { useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { cardGridColumns } from "@vedic-patro/ui";

/**
 * Card columns from the width the list actually has, not the window's.
 *
 * On an iPad most pages sit beside the sidebar, so the window's width overstated the room and a
 * list packed three or four cramped cards into it. Put `onLayout` on the row that wraps the cards;
 * until it has been measured the window's width (less the page gutters) stands in.
 * `width` is the per-card width to give each cell (a percent, leaving room for the row's gap).
 */
export function useMeasuredCardColumns(most = 4) {
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    setMeasured((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);
  const cols = cardGridColumns(measured > 0 ? measured : windowWidth - 32, most);
  const width = (cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`) as `${number}%`;
  return { onLayout, cols, width };
}
