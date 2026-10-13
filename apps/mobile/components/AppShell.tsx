import type { RefObject } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useScrollToTopOnRouteChange } from "@/lib/page-scroll";
import { SiteFooter } from "@/components/branding/SiteFooter";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import { useInPanchangaTabsShell, usePanchangaTabsShellScrollHost } from "@/components/panchanga/PanchangaTabsShell";
import {
  floatingNavBottomPadding,
  PAGE_HORIZONTAL_PADDING,
  PAGE_HORIZONTAL_PADDING_WIDE,
  PAGE_PADDING_Y,
} from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { spec } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { cn } from "@vedic-patro/domain/utils";

export function AppShell({
  title,
  subtitle,
  children,
  headerRight,
  scroll = true,
  showHeader = true,
  scrollRef,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  scroll?: boolean;
  showHeader?: boolean;
  /** Exposes the internal ScrollView for callers that need to scroll to a
   *  measured child (e.g. a chapter jump-list on a merged Learn page). */
  scrollRef?: RefObject<ScrollView | null>;
  /** @deprecated Sidebar comes from `PanchangaTabsShell` for shell routes. */
  panchangaSidebar?: boolean;
}) {
  const { isTablet, isNarrow } = useBreakpoint();
  const pageScrollRef = useScrollToTopOnRouteChange();
  const inShell = useInPanchangaTabsShell();
  const shellScrollHost = usePanchangaTabsShellScrollHost();
  const pagePadH = inShell ? 0 : isNarrow ? PAGE_HORIZONTAL_PADDING : PAGE_HORIZONTAL_PADDING_WIDE;
  const pagePadTop = inShell ? 0 : PAGE_PADDING_Y;
  const header = showHeader ? (
    <View className={cn("flex-row", shellClasses.pageHeaderRow)}>
      <View className="min-w-0 flex-1">
        <Text className={spec.pageTitle} style={nepaliTextStyle()}>
          {title}
        </Text>
        {subtitle ? (
          <Text className={spec.pageSubtitle} style={nepaliTextStyle()}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {headerRight}
    </View>
  ) : null;

  if (shellScrollHost) {
    return (
      <View className="min-h-0 w-full">
        {header}
        {children}
      </View>
    );
  }

  if (!scroll) {
    return (
      <View
        className="mx-auto w-full max-w-page flex-1 bg-background"
        style={{
          paddingBottom: floatingNavBottomPadding(isTablet),
          paddingHorizontal: pagePadH,
          paddingTop: pagePadTop,
        }}
      >
        {header}
        <View className="min-h-0 flex-1">{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={(node) => {
        if (scrollRef) scrollRef.current = node;
        pageScrollRef(node);
      }}
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-page"
      contentContainerStyle={{
        paddingBottom: floatingNavBottomPadding(isTablet),
        paddingHorizontal: pagePadH,
        paddingTop: pagePadTop,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {header}
      {children}
      <RelatedPageLinks />
      <SiteFooter />
    </ScrollView>
  );
}

export { LangToggle, LanguageSwitcher } from "@/components/LanguageSwitcher";
