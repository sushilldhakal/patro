import { Stack } from "expo-router";
import { View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { useRailPageAnimation } from "@/components/panchanga/PanchangaSplitShell";
import { useThemeColors } from "@/lib/theme-context";

/**
 * Account routes sit outside the (tabs) group, so they do not inherit the
 * chrome that layout supplies. Same header and floating nav as every other page.
 * The profile page's inner pages push over it with the platform's slide. A wide layout, and Reduce
 * Motion, fade.
 */
export default function AccountLayout() {
  const colors = useThemeColors();
  const fade = useRailPageAnimation();
  return (
    <View className="flex-1 bg-background" style={{ flex: 1 }}>
      <AppHeader />
      <View className="min-h-0 flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: colors.background },
            // The profile page's inner pages (profiles, notifications, language, appearance, offline data)
            // slide in and swipe back like any sub-page; a wide layout and Reduce Motion fade instead.
            animation: "default",
            gestureEnabled: true,
            ...(fade ?? {}),
          }}
        />
      </View>
      <FloatingNavBar />
    </View>
  );
}
