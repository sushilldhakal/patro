import { Tabs, usePathname, useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { PanchangaTabsShell } from "@/components/panchanga/PanchangaTabsShell";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

/** Width of the left-edge strip that starts a swipe-back, in points. */
const EDGE_SWIPE_WIDTH = 20;

/**
 * Tab screens have no stack of their own, so there's no native swipe-back.
 * A drag that starts at the left edge and travels right goes back to the page
 * it came from (tabs keep history), or home when there's nothing to go back to.
 */
function useEdgeSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  return Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX(10)
    .failOffsetY([-40, 40])
    .onEnd((e) => {
      if (e.translationX < 60 && e.velocityX < 500) return;
      if (router.canGoBack()) router.back();
      else if (pathname !== "/") router.replace("/");
    });
}

/**
 * The swipe gets a strip of its own on top of the page. Attached to the whole
 * page instead, a drag at the edge landed on whatever scroll view was there
 * (a row of chips, the page itself) and that took it, so back never fired.
 */
function EdgeSwipeStrip({ bottom }: { bottom: number }) {
  const swipeBack = useEdgeSwipeBack();
  return (
    <GestureDetector gesture={swipeBack}>
      <View
        collapsable={false}
        style={{ position: "absolute", left: 0, top: 0, bottom, width: EDGE_SWIPE_WIDTH, zIndex: 50 }}
      />
    </GestureDetector>
  );
}

export default function TabsLayout() {
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const tabBarHeight = floatingNavTabBarHeight(isTablet, insets.bottom);

  return (
    <Tabs
      backBehavior="history"
      layout={({ children }) => (
        <View className="flex-1 bg-background" style={{ flex: 1 }}>
          <AppHeader />
          <View className="min-h-0 flex-1">
            {children}
            <EdgeSwipeStrip bottom={tabBarHeight} />
          </View>
        </View>
      )}
      screenLayout={({ route, children }) => (
        <PanchangaTabsShell stableTree={route.name.startsWith("panchanga")} routeName={route.name}>{children}</PanchangaTabsShell>
      )}
      tabBar={() => <FloatingNavBar />}
      screenOptions={{
        headerShown: false,
        // Tab screens stay mounted once visited, and each one's shell reads the
        // pathname — so without this every navigation re-rendered every page
        // seen so far, and the app got slower the more of it was opened.
        freezeOnBlur: true,
        // Opaque: a transparent scene lets the previous screen show through
        // (overlapping) while a newly opened tab is still mounting its content.
        sceneStyle: { backgroundColor: colors.background, flex: 1 },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBarHeight,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0, // design-ok: hide the stock tab bar; the floating bar draws its own shadow
          shadowOpacity: 0, // design-ok: hide the stock tab bar; the floating bar draws its own shadow
        },
      }}
    />
  );
}
