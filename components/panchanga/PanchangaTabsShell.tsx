import { createContext, useContext, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { usePathname } from "expo-router";
import { useScrollToTopOnRouteChange } from "@/lib/page-scroll";
import {
  floatingNavBottomPadding,
  normalizeMobilePathname,
  PAGE_HORIZONTAL_PADDING,
} from "@/lib/mobile-nav";
import {
  routeUsesOwnPanchangaSplitShell,
  shouldShowPanchangaSidebar,
} from "@/lib/panchanga-shell-paths";
import { useBreakpoint } from "@/lib/responsive";
import { PanchangaSidebarNav } from "./PanchangaSidebarNav";
import { PANCHANGA_SIDEBAR_RAIL_WIDTH, useShowPanchangaSidebar } from "./PanchangaSplitShell";
import { useThemeColors } from "@/lib/theme-context";

/** Matches web `PanchangaShellLayout` `gap-6` between sidebar and main column. */
const SHELL_SIDEBAR_GAP = 24;

const PanchangaTabsShellContext = createContext(false);
const PanchangaTabsShellScrollContext = createContext(false);

/** True when the active tab route uses the shared panchanga shell inset (web `PageShell` in-shell). */
export function useInPanchangaTabsShell() {
  return useContext(PanchangaTabsShellContext);
}

/** True when this layout owns the main vertical scroll (screens should not nest another page ScrollView). */
export function usePanchangaTabsShellScrollHost() {
  return useContext(PanchangaTabsShellScrollContext);
}

function ShellMainScroll({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: object;
}) {
  const pageScrollRef = useScrollToTopOnRouteChange();
  return (
    <ScrollView
      ref={pageScrollRef}
      className="min-h-0 min-w-0 flex-1 bg-background"
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function isPanchangaShellRoute(pathname: string): boolean {
  return (
    shouldShowPanchangaSidebar(pathname) && !routeUsesOwnPanchangaSplitShell(pathname)
  );
}

/**
 * Wraps tab screens so the panchanga sidebar stays mounted across shell-route
 * navigations (web `PanchangaShellLayout` parity).
 */
/** Tabs whose screens are a nested navigator — their leaf route is only known from the URL. */
const NESTED_TAB_NAMES = new Set(["panchanga", "kundali", "learn", "documents"]);

export function PanchangaTabsShell({
  children,
  stableTree = false,
  routeName,
}: {
  children: ReactNode;
  /** The tab route this wrapper belongs to (`route.name`). */
  routeName?: string;
  /** True for the panchanga tab itself: keep one element tree whatever the route (see below). */
  stableTree?: boolean;
}) {
  const livePathname = normalizeMobilePathname(usePathname());
  /* A flat tab (gochar, holidays, …) is wrapped once per tab, so decide from the
   * tab's own route rather than the global URL: otherwise a wrapper can read the
   * previous page's path for a frame and render without the sidebar rail. */
  const pathname =
    routeName && !NESTED_TAB_NAMES.has(routeName) && !routeName.includes("[")
      ? routeName === "index"
        ? "/"
        : `/${routeName}`
      : livePathname;
  const colors = useThemeColors();
  const { isTablet } = useBreakpoint();
  const wideEnough = useShowPanchangaSidebar();
  const shellRoute = isPanchangaShellRoute(pathname);
  const showRail = shellRoute && wideEnough;
  const scrollBottom = floatingNavBottomPadding(isTablet);

  /* The panchanga tab hosts a nested Stack, so this wrapper must not change
   * element type between routes: a View↔ScrollView swap remounted the whole
   * Stack and dropped it back on `/panchanga`, and flipping a ScrollView's
   * content sizing under a freshly pushed screen left it blank on iPad.
   * For this tab the host is therefore always plain Views, and never a scroll
   * host — every screen in it scrolls itself (`AppShell`, or the daily page's
   * own ScrollView). Only the padding and the optional sidebar rail change. */
  if (stableTree) {
    return (
      <PanchangaTabsShellContext.Provider value={showRail}>
        <PanchangaTabsShellScrollContext.Provider value={false}>
          <View
            className="min-h-0 flex-1"
            style={
              showRail
                ? {
                    backgroundColor: colors.background,
                    paddingHorizontal: PAGE_HORIZONTAL_PADDING,
                    paddingTop: 16,
                  }
                : undefined
            }
          >
            <View className="min-h-0 flex-1 flex-row" style={{ gap: showRail ? SHELL_SIDEBAR_GAP : 0 }}>
              {showRail ? (
                <View
                  key="rail"
                  className="min-h-0"
                  style={{
                    width: PANCHANGA_SIDEBAR_RAIL_WIDTH,
                    paddingBottom: 12,
                    borderRightWidth: 1,
                    borderRightColor: colors.border,
                    backgroundColor: colors.background,
                  }}
                >
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                    <PanchangaSidebarNav className="w-full border-0" />
                  </ScrollView>
                </View>
              ) : null}
              <View key="main" className="min-h-0 min-w-0 flex-1">
                {children}
              </View>
            </View>
          </View>
        </PanchangaTabsShellScrollContext.Provider>
      </PanchangaTabsShellContext.Provider>
    );
  }

  if (!shellRoute) {
    return (
      <PanchangaTabsShellContext.Provider value={false}>
        <PanchangaTabsShellScrollContext.Provider value={false}>
          <View className="min-h-0 flex-1">{children}</View>
        </PanchangaTabsShellScrollContext.Provider>
      </PanchangaTabsShellContext.Provider>
    );
  }

  if (!showRail) {
    return (
      <PanchangaTabsShellContext.Provider value={true}>
        <PanchangaTabsShellScrollContext.Provider value={true}>
          <ShellMainScroll
            contentContainerStyle={{
              paddingHorizontal: PAGE_HORIZONTAL_PADDING,
              paddingTop: 12,
              paddingBottom: scrollBottom,
            }}
          >
            {children}
          </ShellMainScroll>
        </PanchangaTabsShellScrollContext.Provider>
      </PanchangaTabsShellContext.Provider>
    );
  }

  return (
    <PanchangaTabsShellContext.Provider value={true}>
      <PanchangaTabsShellScrollContext.Provider value={true}>
        <View
          className="min-h-0 flex-1 bg-background"
          style={{
            paddingHorizontal: PAGE_HORIZONTAL_PADDING,
            paddingTop: 16,
          }}
        >
          <View className="min-h-0 flex-1 flex-row" style={{ gap: SHELL_SIDEBAR_GAP }}>
            <View
              className="min-h-0"
              style={{
                width: PANCHANGA_SIDEBAR_RAIL_WIDTH,
                paddingBottom: 12,
                borderRightWidth: 1,
                borderRightColor: colors.border,
                backgroundColor: colors.background,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                <PanchangaSidebarNav className="w-full border-0" />
              </ScrollView>
            </View>
            <ShellMainScroll contentContainerStyle={{ paddingBottom: scrollBottom }}>
              {children}
            </ShellMainScroll>
          </View>
        </View>
      </PanchangaTabsShellScrollContext.Provider>
    </PanchangaTabsShellContext.Provider>
  );
}
