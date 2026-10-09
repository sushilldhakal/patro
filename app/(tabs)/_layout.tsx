import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { PanchangaTabsShell } from "@/components/panchanga/PanchangaTabsShell";
import { floatingNavTabBarHeight } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export default function TabsLayout() {
  const { resolvedTheme } = useTheme();
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const tabBarHeight = floatingNavTabBarHeight(isTablet, insets.bottom);

  return (
    <Tabs
      layout={({ children }) => (
        <View
          className={cn("flex-1 bg-background", resolvedTheme === "dark" && "dark")}
          style={{ flex: 1 }}
        >
          <AppHeader />
          <View className="min-h-0 flex-1">{children}</View>
        </View>
      )}
      screenLayout={({ children }) => (
        <PanchangaTabsShell>{children}</PanchangaTabsShell>
      )}
      tabBar={() => <FloatingNavBar />}
      screenOptions={{
        headerShown: false,
        animation: "fade",
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
