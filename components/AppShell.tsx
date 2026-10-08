import type { RefObject } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { setPageScroller } from "@/lib/page-scroll";
import { SiteFooter } from "@/components/branding/SiteFooter";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import { useInPanchangaTabsShell, usePanchangaTabsShellScrollHost } from "@/components/panchanga/PanchangaTabsShell";
import { floatingNavBottomPadding, PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";

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
  const { isTablet } = useBreakpoint();
  const inShell = useInPanchangaTabsShell();
  const shellScrollHost = usePanchangaTabsShellScrollHost();
  const pagePadH = inShell ? 0 : PAGE_HORIZONTAL_PADDING;
  const pagePadTop = inShell ? 0 : 16;
  const header = showHeader ? (
    <View className="mb-4 flex-row items-start justify-between gap-3 py-1">
      <View className="min-w-0 flex-1">
        <Text
          className="text-2xl font-bold text-foreground"
          style={[nepaliTextStyle(24), { paddingTop: 2, paddingBottom: 2 }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="mt-1 text-sm text-muted-foreground"
            style={[nepaliTextStyle(14), { paddingTop: 1 }]}
          >
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
        className="mx-auto w-full max-w-[1400px] flex-1 bg-background"
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
        setPageScroller(node);
      }}
      className="flex-1 bg-background"
      contentContainerClassName="mx-auto w-full max-w-[1400px]"
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
