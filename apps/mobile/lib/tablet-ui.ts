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
