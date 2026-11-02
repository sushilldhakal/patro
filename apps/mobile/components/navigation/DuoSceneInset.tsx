import type { ComponentType } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";

/**
 * iPhone Duo: the system's vertical rail (84pt, on whichever side iOS puts it) is reported to the
 * content of each tab scene, not to anything around the tabs. A native SafeAreaView inside the
 * scene keeps the page clear of it on both edges (Expo's iPhone Duo guide). Everywhere else the
 * screen is returned as it is.
 */
export function withDuoRailInset<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  if (!IS_IPHONE_DUO) return Screen;
  function WithDuoRailInset(props: P) {
    return (
      <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
        <Screen {...props} />
      </SafeAreaView>
    );
  }
  return WithDuoRailInset;
}
