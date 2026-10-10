import { floatingNavBottomPadding, PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";

/** AppHeader inner bar (`h-16`) — safe-area top is added separately. */
export const APP_HEADER_BAR_HEIGHT = 64;

/** Breathing room under the sticky app header (inline card). */
export const WHEEL_VIEWPORT_GAP = 20;

export function appHeaderTotalHeight(safeAreaTop: number): number {
  return safeAreaTop + APP_HEADER_BAR_HEIGHT;
}

/** Max inline wheel card height: 100vh − sticky navbar − gap. */
export function computeMaxWheelCardHeight(screenH: number, safeAreaTop: number): number {
  return Math.max(280, screenH - appHeaderTotalHeight(safeAreaTop) - WHEEL_VIEWPORT_GAP);
}

/** Fullscreen modal stage height (no app header, keep the same gap). */
export function computeFullscreenWheelHeight(screenH: number): number {
  return Math.max(280, screenH - WHEEL_VIEWPORT_GAP);
}

type InlineWheelSizeOpts = {
  containerWidth: number;
  screenW: number;
  screenH: number;
  safeAreaTop: number;
};

const DAY_WHEEL_MIN_HEIGHT = 520;

/** Daily-page stage: taller than a width-capped square so the wheel reads larger. */
export function computeInlineWheelStageSize({
  containerWidth,
  screenW,
  screenH,
  safeAreaTop,
}: InlineWheelSizeOpts): number {
  const fallbackWidth = Math.max(screenW - PAGE_HORIZONTAL_PADDING * 2, 280);
  const widthCap = Math.max(containerWidth || fallbackWidth, 280);
  const maxCardH = computeMaxWheelCardHeight(screenH, safeAreaTop);
  const preferred = Math.max(DAY_WHEEL_MIN_HEIGHT, widthCap * 1.5);
  return Math.max(DAY_WHEEL_MIN_HEIGHT, Math.min(preferred, Math.max(maxCardH, DAY_WHEEL_MIN_HEIGHT)));
}

const YEAR_WHEEL_MIN_HEIGHT = 500;
/** Page padding above the date nav + gap under it + window-label strip. */
const YEAR_WHEEL_CHROME_GAP = 48;

/**
 * Year-page inline stage: remaining viewport after the app header, date nav,
 * and floating tab bar. Never shorter than 500px so landscape does not crush it.
 */
export function computeYearWheelStageHeight({
  screenH,
  safeAreaTop,
  dateNavHeight,
  isTablet,
}: {
  screenH: number;
  safeAreaTop: number;
  dateNavHeight: number;
  isTablet: boolean;
}): number {
  const leftover =
    screenH -
    appHeaderTotalHeight(safeAreaTop) -
    Math.max(dateNavHeight, 72) -
    floatingNavBottomPadding(isTablet) -
    YEAR_WHEEL_CHROME_GAP;
  return Math.max(YEAR_WHEEL_MIN_HEIGHT, leftover);
}
