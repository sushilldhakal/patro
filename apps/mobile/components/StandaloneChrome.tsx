import type { ReactNode } from "react";
import { View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";

/**
 * Routes outside the (tabs) group (legal pages, password reset, email
 * verification, a day's detail) do not inherit the chrome that layout gives
 * every other page. Without it they had no header and drew under the status
 * bar / notch. Same header and floating nav as everywhere else.
 */
export function StandaloneChrome({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-background" style={{ flex: 1 }}>
      <AppHeader />
      <View className="min-h-0 flex-1">{children}</View>
      <FloatingNavBar />
    </View>
  );
}
