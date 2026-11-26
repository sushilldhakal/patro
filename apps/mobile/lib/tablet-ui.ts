import { Platform } from "react-native";
import { useBreakpoint } from "@/lib/responsive";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";

/** Narrowest width a dialog card takes on a tablet, and the widest — about an iPad popover's. */
export const TABLET_DIALOG_WIDTH = 440;
/** The side menu's width on a tablet, like the iPad Calendar sidebar. */
export const TABLET_SIDEBAR_WIDTH = 340;

/**
 * Tablet layout (iPad, Android tablets), in the manner of iPad Calendar: actions in the top bar
 * instead of floating buttons, a segmented switch instead of the view menu, dialogs as narrow
 * cards instead of full-width sheets, and the side menu from the left. The iPhone Duo draws its
 * own bars (DuoToolbar) and is left out.
 */
export function useTabletUi(): boolean {
  const { isTablet } = useBreakpoint();
  return isTablet && !IS_IPHONE_DUO;
}

/**
 * The top bar and date controls. An iPad (and Android tablet) draws the iPhone's two-row header
 * (date badge + year line, then place and the page's views); the extra width goes to the content.
 * Owner, 2026-11-27: "design follows iPhone design". Only the wide web layout keeps the iPad
 * Calendar toolbar (sidebar key, ‹ › stepper, segmented switch).
 */
export function useTabletHeader(): boolean {
  return useTabletUi() && Platform.OS === "web";
}
