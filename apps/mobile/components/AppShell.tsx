import type { ComponentRef } from "react";
import { useZoomScrollLocked } from "@vedic-patro/ui/kit/panchanga";
import type { RefObject } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useScrollToTopOnRouteChange } from "@/lib/page-scroll";
import { SCROLL_EVENT_THROTTLE, ScrollRevealScope, onPageScroll } from "@/lib/scroll-motion";
import { Reveal } from "@/components/ui/Reveal";
import { SiteFooter } from "@/components/branding/SiteFooter";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import { useInPanchangaTabsShell, usePanchangaTabsShellScrollHost } from "@/components/panchanga/PanchangaTabsShell";
import {
  floatingNavBottomPadding,
  PAGE_HORIZONTAL_PADDING,
  PAGE_HORIZONTAL_PADDING_WIDE,
  pageTopPadding,
} from "@/lib/mobile-nav";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useDeferredMount } from "@/lib/use-deferred-mount";
import { spec } from "@vedic-patro/design-tokens";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { usePageRefreshControl } from "@/components/ui/PageRefreshControl";

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
  scrollRef?: RefObject<ComponentRef<typeof ScrollView> | null>;
  /** @deprecated Sidebar comes from `PanchangaTabsShell` for shell routes. */
  panchangaSidebar?: boolean;
}) {
  const { isTablet, isNarrow, isCompact } = useBreakpoint();
  const pageScrollRef = useScrollToTopOnRouteChange();
  const refreshControl = usePageRefreshControl();
  const zoomLocked = useZoomScrollLocked();
  const inShell = useInPanchangaTabsShell();
  const shellScrollHost = usePanchangaTabsShellScrollHost();
  /* A tab switch or push waits for the new screen's whole first render before
     anything moves, so a heavy page felt like a frozen tap. The frame (padding,
     header) draws at once and the page body mounts right after it. */
  const bodyReady = useDeferredMount();
  const body = bodyReady ? children : null;
  const pagePadH = inShell ? 0 : isNarrow ? PAGE_HORIZONTAL_PADDING : PAGE_HORIZONTAL_PADDING_WIDE;
  const pagePadTop = inShell ? 0 : pageTopPadding(isCompact);
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
        {header ? <Reveal index={0}>{header}</Reveal> : null}
        {body ? <Reveal index={1}>{body}</Reveal> : null}
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
        <View className="min-h-0 flex-1">{body}</View>
      </View>
    );
  }

  return (
    <ScrollView
      scrollEnabled={!zoomLocked}
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
      refreshControl={refreshControl}
      // iOS does not resize the window for the keyboard (Android does, via
      // softwareKeyboardLayoutMode "resize"), so without this a focused field
      // low on the page — converter, password, profile forms — sat under it.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      onScroll={onPageScroll}
      scrollEventThrottle={SCROLL_EVENT_THROTTLE}
    >
      <ScrollRevealScope.Provider value>
        {header ? <Reveal index={0}>{header}</Reveal> : null}
        {body ? <Reveal index={1}>{body}</Reveal> : null}
        {bodyReady ? (
          <Reveal index={2}>
            <RelatedPageLinks />
            <SiteFooter />
          </Reveal>
        ) : null}
      </ScrollRevealScope.Provider>
    </ScrollView>
  );
}

export { LangToggle, LanguageSwitcher } from "@/components/LanguageSwitcher";
