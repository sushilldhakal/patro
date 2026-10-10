import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { PanchangaTabsShell } from "@/components/panchanga/PanchangaTabsShell";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";

export default function TabsLayout() {
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const tabBarHeight = floatingNavTabBarHeight(isTablet, insets.bottom);

  return (
    <Tabs
      layout={({ children }) => (
        <View className="flex-1 bg-background" style={{ flex: 1 }}>
          <AppHeader />
          <View className="min-h-0 flex-1">{children}</View>
        </View>
      )}
      screenLayout={({ route, children }) => (
        <PanchangaTabsShell stableTree={route.name.startsWith("panchanga")} routeName={route.name}>{children}</PanchangaTabsShell>
      )}
      tabBar={() => <FloatingNavBar />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent", flex: 1 },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBarHeight,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    />
  );
}
