import { Tabs, usePathname, useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { PanchangaTabsShell } from "@/components/panchanga/PanchangaTabsShell";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";

/** Width of the left-edge strip that starts a swipe-back, in points. */
const EDGE_SWIPE_WIDTH = 28;

/**
 * Tab screens have no stack of their own, so there's no native swipe-back.
 * A drag that starts at the left edge and travels right goes back one step
 * (or home when there's nothing to go back to).
 */
function useEdgeSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  return Gesture.Pan()
    .runOnJS(true)
    .hitSlop({ left: 0, width: EDGE_SWIPE_WIDTH })
    .activeOffsetX(16)
    .failOffsetY([-24, 24])
    .onEnd((e) => {
      if (e.translationX < 72 && e.velocityX < 600) return;
      if (router.canGoBack()) router.back();
      else if (pathname !== "/") router.replace("/");
    });
}

export default function TabsLayout() {
  const swipeBack = useEdgeSwipeBack();
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const tabBarHeight = floatingNavTabBarHeight(isTablet, insets.bottom);

  return (
    <Tabs
      backBehavior="history"
      layout={({ children }) => (
        <GestureDetector gesture={swipeBack}>
          <View className="flex-1 bg-background" style={{ flex: 1 }}>
            <AppHeader />
            <View className="min-h-0 flex-1">{children}</View>
          </View>
        </GestureDetector>
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
        sceneStyle: { backgroundColor: "transparent", flex: 1 },
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
