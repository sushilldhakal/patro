/**
 * One height for every control in the app's top bar — the side-menu and view-menu buttons and the
 * page's date controls — so the row reads as one line of matching keys.
 */
export const TOP_BAR_CONTROL = 38;
/** Phones narrower than 420pt get slightly smaller keys so a month name still fits. */
export const TOP_BAR_CONTROL_DENSE = 34;

export function topBarControlSize(windowWidth: number): number {
  return windowWidth < 420 ? TOP_BAR_CONTROL_DENSE : TOP_BAR_CONTROL;
}
