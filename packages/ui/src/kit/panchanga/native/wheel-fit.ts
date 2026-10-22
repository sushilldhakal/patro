/**
 * How big a wheel may be in landscape so the whole of it is on screen: the window
 * height less the status bar, the app header, the floating tab bar and a gap.
 * Every wheel (panchanga, vastu, house plan, avakahada) uses it; portrait is
 * unchanged because there the width is the smaller side.
 */
const APP_HEADER = 64;
/** The floating tab bar's slot (pill + bottom inset), phone / tablet — app `lib/mobile-nav.ts`. */
const TAB_BAR_PHONE = 84;
const TAB_BAR_TABLET = 96;
const GAP = 20;
const MIN = 200;

export function isLandscape(screenW: number, screenH: number): boolean {
  return screenW > screenH;
}

export function landscapeWheelCap(screenW: number, screenH: number, safeTop = 0): number {
  const tabBar = screenW >= 768 ? TAB_BAR_TABLET : TAB_BAR_PHONE;
  return Math.max(MIN, Math.floor(screenH - safeTop - APP_HEADER - tabBar - GAP));
}

/** `size`, shrunk in landscape to what fits on screen. */
export function fitWheelSize(size: number, screenW: number, screenH: number, safeTop = 0): number {
  return isLandscape(screenW, screenH) ? Math.min(size, landscapeWheelCap(screenW, screenH, safeTop)) : size;
}
