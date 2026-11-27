import { useWindowDimensions } from "react-native";
import { breakpoints, size } from "@vedic-patro/design-tokens";

export type Breakpoint = "phone" | "largePhone" | "tablet" | "desktop";

export const BREAKPOINTS = breakpoints;

export type LayoutMode = "mobile" | "tablet" | "desktop";

/**
 * The big-screen UI's switch, for every device in both orientations: 600pt wide and more, except a
 * phone turned sideways (under 500pt tall). Phones (either way up) and a folded tri-fold get the
 * phone UI; an unfolded tri-fold, every iPad (mini included) and Android tablets get the big one.
 */
export function isLargeScreenSize(width: number, height: number): boolean {
  const isPhoneLandscape = width >= 600 && height < 500;
  return width >= 600 && !isPhoneLandscape;
}

export function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = isLargeScreenSize(width, height);
  // A third tier for the widest screens (13" iPad Pro, a tri-fold in landscape).
  const mode: LayoutMode = !isLargeScreen ? "mobile" : width >= 1024 ? "desktop" : "tablet";
  return { mode, isLargeScreen, isPortrait: height >= width, isLandscape: width > height, width, height };
}

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
    // Phone or big-screen UI: the one rule (isLargeScreenSize), so a phone on its side stays a phone.
    isPhone: !isLargeScreenSize(width, height),
    isTablet: isLargeScreenSize(width, height),
    isCompact: !isLargeScreenSize(width, height),
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
