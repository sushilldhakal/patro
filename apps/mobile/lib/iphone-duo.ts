import { Platform } from "react-native";
import * as Device from "expo-device";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * iPhone Duo only, folded or unfolded (detection is by hardware, so both states match).
 *
 * Built with the iOS 27.1 SDK or later, the app extends to the full display on the Duo and the
 * system reports the status area through `insets.top`, so no extra top padding is needed (a fixed
 * 52pt there left a big gap). The toolbar's clock/Wi-Fi/camera pill floats over the top-right corner
 * and is not in the insets, so the shell reserves DUO_TOOLBAR_WIDTH on the right for the header and
 * page content, keeping the avatar and location button clear of it.
 *
 * The web app keeps its own Duo offset (apps/web/index.html + src/index.css, `html[data-iphone-duo]`).
 */

/**
 * Model identifiers (`Device.modelId`) of the Duo hardware, as expo-device maps them
 * (node_modules/expo-device/ios/UIDevice.swift). Add any later Duo model here.
 */
const DUO_MODEL_IDS: ReadonlySet<string> = new Set<string>(["iPhone19,4"]);

/** "iPhone Duo" as a model name or simulator device name. */
const DUO_NAME = /\biphone\s*duo\b/i;

function detectIPhoneDuo(): boolean {
  if (Platform.OS !== "ios") return false;
  if (Device.modelId && DUO_MODEL_IDS.has(Device.modelId)) return true;
  // A real Duo: modelName is "iPhone Duo". The simulator's modelId/modelName are only "arm64" /
  // "Simulator iOS", but its deviceName is the simulated device ("iPhone Duo").
  return [Device.modelName, Device.deviceName].some((name) => !!name && DUO_NAME.test(name));
}

/** Read once: the hardware does not change while the app runs. */
export const IS_IPHONE_DUO = detectIPhoneDuo();

/**
 * Width of the Duo's system toolbar (clock, Wi-Fi, camera) floating over the top-right corner, in
 * points. It is not reported through the safe-area insets, so the shell reserves it itself.
 */
export const DUO_TOOLBAR_WIDTH = 72;

export type DuoShellInsets = {
  /** Extra space above the app header, on top of `insets.top`. */
  top: number;
  /** Side padding for the header and page so nothing sits under the toolbar. */
  left: number;
  right: number;
};

const NONE: DuoShellInsets = { top: 0, left: 0, right: 0 };

/**
 * Shell padding for the iPhone Duo; all zero on every other device. Backgrounds still extend edge to
 * edge; only the header and page content keep clear of the toolbar on the right. Top needs no extra
 * space: the iOS 27.1 SDK already puts the status area in `insets.top`.
 */
export function useDuoShellInsets(): DuoShellInsets {
  const insets = useSafeAreaInsets();
  if (!IS_IPHONE_DUO) return NONE;
  return { top: 0, left: insets.left, right: Math.max(insets.right, DUO_TOOLBAR_WIDTH) };
}
