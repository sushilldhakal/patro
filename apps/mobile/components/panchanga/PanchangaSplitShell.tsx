import type { ReactNode } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { DURATION, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { floatingNavBottomPadding, PANCHANGA_SIDEBAR_MIN_WIDTH, PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { useScrollToTopOnRouteChange } from "@/lib/page-scroll";
import { useThemeColors } from "@/lib/theme-context";
import { PanchangaSidebarNav } from "./PanchangaSidebarNav";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { usePageRefreshControl } from "@/components/ui/PageRefreshControl";

export const PANCHANGA_SIDEBAR_RAIL_WIDTH = 224;

/** Matches web `calendar:block` on `PanchangaShellLayout` sidebar. */
export function useShowPanchangaSidebar(): boolean {
  const { width } = useWindowDimensions();
  return width >= PANCHANGA_SIDEBAR_MIN_WIDTH;
}

/**
 * Pages opened from the iPad rail are siblings, so a push slide would imply
 * depth that is not there. Phones keep the stack's own animation. Reduce
 * Motion fades every one of these stacks.
 */
export function useRailPageAnimation(): {
  animation: "fade";
  animationDuration: number;
  animationMatchesGesture: true;
} | null {
  const reduced = useReducedMotionPref();
  const rail = useShowPanchangaSidebar();
  if (!reduced && !rail) return null;
  return {
    animation: "fade",
    animationDuration: DURATION.standard,
    animationMatchesGesture: true,
  };
}

type KundaliSectionNavProps = {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
};

type Props = {
  children: ReactNode;
  /** When false, main column is a flex View (nested screens scroll themselves). */
  mainScroll?: boolean;
  compact?: boolean;
  kundaliSectionNav?: KundaliSectionNavProps;
};

export function PanchangaSplitShell({
  children,
  mainScroll = true,
  compact,
  kundaliSectionNav,
}: Props) {
  const colors = useThemeColors();
  const { isTablet } = useBreakpoint();
  const showSidebar = useShowPanchangaSidebar();
  const pageScrollRef = useScrollToTopOnRouteChange();
  const refreshControl = usePageRefreshControl();

  const mainInner = (
    <View className={mainScroll ? "gap-4" : "min-h-0 flex-1"}>{children}</View>
  );

  const mainPadding = {
    paddingBottom: floatingNavBottomPadding(isTablet),
    paddingHorizontal: PAGE_HORIZONTAL_PADDING,
  };

  if (!showSidebar) {
    if (mainScroll) {
      return (
        <ScrollView
          ref={pageScrollRef}
          refreshControl={refreshControl}
          className="flex-1 bg-background"
          contentContainerClassName="mx-auto w-full max-w-page-wide pt-3 md:pt-4"
          contentContainerStyle={mainPadding}
          showsVerticalScrollIndicator={false}
        >
          {mainInner}
        </ScrollView>
      );
    }
    return (
      <View className="mx-auto w-full max-w-page-wide flex-1 bg-background pt-3 md:pt-4" style={mainPadding}>
        {mainInner}
      </View>
    );
  }

  const mainColumn = mainScroll ? (
    <ScrollView
      ref={pageScrollRef}
      refreshControl={refreshControl}
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-page-wide pt-3 md:pt-4"
      contentContainerStyle={mainPadding}
      showsVerticalScrollIndicator={false}
    >
      {mainInner}
    </ScrollView>
  ) : (
    <View className="min-w-0 flex-1 bg-background pt-3 md:pt-4" style={mainPadding}>
      {mainInner}
    </View>
  );

  return (
    <View className="flex-1 flex-row bg-background">
      <View
        className="pb-3 pr-2 pt-4"
        style={{
          width: PANCHANGA_SIDEBAR_RAIL_WIDTH,
          paddingLeft: PAGE_HORIZONTAL_PADDING,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        {/* The floating tab bar sits over the bottom of the rail too, so the list needs the
            same bottom room as the main column or its last entries can never scroll clear. */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: floatingNavBottomPadding(isTablet) }}
        >
          <PanchangaSidebarNav
            className="w-full border-0"
            compact={compact}
            kundaliSectionNav={kundaliSectionNav}
          />
        </ScrollView>
      </View>
      {mainColumn}
    </View>
  );
}
