import { useWindowDimensions } from "react-native";
import { breakpoints, size } from "@vedic-patro/design-tokens";

export type Breakpoint = "phone" | "largePhone" | "tablet" | "desktop";

export const BREAKPOINTS = breakpoints;

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  let bp: Breakpoint = "phone";
  if (width >= BREAKPOINTS.lg) bp = "desktop";
  else if (width >= BREAKPOINTS.md) bp = "tablet";
  else if (width >= BREAKPOINTS.xs) bp = "largePhone";

  return {
    width,
    height,
    isLandscape,
    bp,
    isPhone: bp === "phone" || bp === "largePhone",
    isTablet: bp === "tablet" || bp === "desktop",
    isCompact: width < BREAKPOINTS.md,
    isNarrow: width < BREAKPOINTS.sm,
    isCalendarWide: width >= BREAKPOINTS.calendarWide,
    columns: width >= BREAKPOINTS.lg ? 2 : 1,
    calendarCellSize:
      width >= BREAKPOINTS.lg
        ? Math.min(size.calendarCell.desktop, Math.floor((width - 320) / 14))
        : width >= BREAKPOINTS.md
          ? Math.min(size.calendarCell.tablet, Math.floor((width - 200) / 10))
          : Math.min(size.calendarCell.phone, Math.floor((width - 48) / 7)),
  };
}
