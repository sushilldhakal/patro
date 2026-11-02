import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVerticalBarEdgeIOS } from "expo-status-bar";
import { DuoToolbar } from "@/components/navigation/DuoToolbar";

/** Width the system's vertical rail takes on its edge (Expo's iPhone Duo guide). */
const RAIL_INSET = 84;

/**
 * A page pushed over the tabs on the iPhone Duo: the same native toolbar as the tabs, the page kept
 * clear of the rail on whichever side it is (unfolded portrait gets its bottom toolbar from DuoToolbar). The inset
 * comes from the safe area; when iOS reports the rail's edge but no inset there (the app on the left
 * half of the screen), the guide's 84pt is applied instead, so a page never sits under the rail.
 */
export function DuoPageFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const edge = useVerticalBarEdgeIOS();
  const left = Math.max(insets.left, edge === "leading" ? RAIL_INSET : 0);
  const right = Math.max(insets.right, edge === "trailing" ? RAIL_INSET : 0);
  return (
    <View style={{ flex: 1 }}>
      <DuoToolbar tabsInBar={false} />
      <View style={{ flex: 1, paddingTop: insets.top, paddingLeft: left, paddingRight: right }}>{children}</View>
    </View>
  );
}
