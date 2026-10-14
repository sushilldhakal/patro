import type { ReactNode } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { floatingNavBottomPadding, PANCHANGA_SIDEBAR_MIN_WIDTH, PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { useScrollToTopOnRouteChange } from "@/lib/page-scroll";
import { useThemeColors } from "@/lib/theme-context";
import { PanchangaSidebarNav } from "./PanchangaSidebarNav";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";

export const PANCHANGA_SIDEBAR_RAIL_WIDTH = 224;

/** Matches web `calendar:block` on `PanchangaShellLayout` sidebar. */
export function useShowPanchangaSidebar(): boolean {
  const { width } = useWindowDimensions();
  return width >= PANCHANGA_SIDEBAR_MIN_WIDTH;
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
          className="flex-1 bg-background"
          contentContainerClassName="mx-auto w-full max-w-page-wide pt-4"
          contentContainerStyle={mainPadding}
          showsVerticalScrollIndicator={false}
        >
          {mainInner}
        </ScrollView>
      );
    }
    return (
      <View className="mx-auto w-full max-w-page-wide flex-1 bg-background pt-4" style={mainPadding}>
        {mainInner}
      </View>
    );
  }

  const mainColumn = mainScroll ? (
    <ScrollView
      ref={pageScrollRef}
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-page-wide pt-4"
      contentContainerStyle={mainPadding}
      showsVerticalScrollIndicator={false}
    >
      {mainInner}
    </ScrollView>
  ) : (
    <View className="min-w-0 flex-1 bg-background pt-4" style={mainPadding}>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-4">
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
