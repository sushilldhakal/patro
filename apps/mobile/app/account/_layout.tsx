import { Slot } from "expo-router";
import { View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";

/**
 * Account routes sit outside the (tabs) group, so they do not inherit the
 * chrome that layout supplies. Same header and floating nav as every other page.
 */
export default function AccountLayout() {
  return (
    <View className="flex-1 bg-background" style={{ flex: 1 }}>
      <AppHeader />
      <View className="min-h-0 flex-1">
        <Slot />
      </View>
      <FloatingNavBar />
    </View>
  );
}
