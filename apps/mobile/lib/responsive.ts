import { Platform, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";
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

/** How the main menu draws: a fixed sidebar with labels (wide iPad window, landscape), a slim rail of
 *  icons with labels under them (iPad portrait), or the floating bottom bar (phones, a narrowed iPad
 *  window in Split View / Slide Over / Stage Manager). Goes by the window, so a resize switches it.
 *  The iPhone Duo keeps its own native bars; the website its own layout. */
export type NavMode = "sidebar" | "rail" | "floating";
export const NAV_SIDEBAR_WIDTH = 272;
export const NAV_RAIL_WIDTH = 112;
const NAV_RAIL_MIN_WIDTH = 700;
const NAV_SIDEBAR_MIN_WIDTH = 1100;

export function navModeFor(width: number, height: number): NavMode {
  if (IS_IPHONE_DUO || Platform.OS === "web" || !isLargeScreenSize(width, height) || width < NAV_RAIL_MIN_WIDTH) return "floating";
  return width >= NAV_SIDEBAR_MIN_WIDTH ? "sidebar" : "rail";
}

export function navSideWidth(mode: NavMode): number {
  return mode === "sidebar" ? NAV_SIDEBAR_WIDTH : mode === "rail" ? NAV_RAIL_WIDTH : 0;
}

/** Full-screen pages (weather, seasons): no sidebar or rail beside them, so they get the whole width;
 *  each has its own back arrow. */
const FULL_SCREEN_ROUTES: ReadonlySet<string> = new Set(["/weather", "/ritu"]);

export function useNavMode(): NavMode {
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  return FULL_SCREEN_ROUTES.has(pathname) ? "floating" : navModeFor(width, height);
}

/** The page area's width: the window less the fixed sidebar or rail. Size content from this, not the window. */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return width - navSideWidth(useNavMode());
}

export function useBreakpoint() {
  const { width: windowWidth, height } = useWindowDimensions();
  // Phone or big-screen UI is the window's; every width-based layout value below is the page area's.
  const large = isLargeScreenSize(windowWidth, height);
  const width = windowWidth - navSideWidth(useNavMode());
  const isLandscape = windowWidth > height;

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
    isPhone: !large,
    isTablet: large,
    isCompact: !large,
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
