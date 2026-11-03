import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DuoToolbar } from "@/components/navigation/DuoToolbar";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { DuoPushedPageProvider } from "@/lib/duo-page-context";

/**
 * A page pushed over the tabs on the iPhone Duo: the same native toolbar as the tabs, and the page kept
 * clear of the rail on whichever side iOS puts it. The safe-area insets already carry the rail's 84pt
 * on that edge (the left one too, for the app in the left half of Split View), so they are the only
 * source: no edge hook and no fixed width (Expo's iPhone Duo guide). Unfolded portrait gets the app's
 * bottom bar.
 */
export function DuoPageFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <DuoToolbar tabsInBar={false} />
      <View style={{ flex: 1, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
        <DuoPushedPageProvider value>{children}</DuoPushedPageProvider>
      </View>
      {/* Portrait: the same bottom bar as every phone (landscape and folded: the rail). */}
      <FloatingNavBar duoPortrait />
    </View>
  );
}
