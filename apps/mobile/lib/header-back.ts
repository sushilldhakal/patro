import { Platform } from "react-native";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";
import { useTabletUi } from "@/lib/tablet-ui";

/** True where the app's top bar has a back key (phones: AppHeader). Pages then drop their own
 *  in-page "← back" link, so there is only one; web, tablets and the iPhone Duo keep it. */
export function useHeaderHasBack(): boolean {
  const tablet = useTabletUi();
  return Platform.OS !== "web" && !tablet && !IS_IPHONE_DUO;
}
