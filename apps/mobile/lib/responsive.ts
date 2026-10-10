import { useWindowDimensions } from "react-native";

export type Breakpoint = "phone" | "largePhone" | "tablet" | "desktop";

export const BREAKPOINTS = {
  xs: 400,
  sm: 640,
  md: 768,
  calendarWide: 992,
  lg: 1024,
  xl: 1280,
} as const;

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
        ? Math.min(72, Math.floor((width - 320) / 14))
        : width >= BREAKPOINTS.md
          ? Math.min(64, Math.floor((width - 200) / 10))
          : Math.min(52, Math.floor((width - 48) / 7)),
  };
}
