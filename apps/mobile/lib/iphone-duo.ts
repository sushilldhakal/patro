import { Platform } from "react-native";
import * as Device from "expo-device";

/**
 * iPhone Duo only, folded or unfolded (detection is by hardware, so both states match).
 *
 * Built with the iOS 27.1 SDK or later, the app extends to the full display on the Duo and the
 * system reports the toolbar through the safe-area insets (top/left/right). Padding the shell by
 * an extra toolbar height or by the side insets on top of that double-counted them: a big gap above
 * the header and an unused strip on the right in landscape. The shell now relies on the safe-area
 * insets alone, so `useDuoShellInsets` returns zeros everywhere and the app fills the display.
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

export type DuoShellInsets = {
  /** Extra space above the app header, on top of `insets.top`. */
  top: number;
  /** Extra side padding for the header and page, on top of the safe-area insets. */
  left: number;
  right: number;
};

const NONE: DuoShellInsets = { top: 0, left: 0, right: 0 };

/**
 * Extra shell padding for the iPhone Duo. Zero on every device: the iOS 27.1 SDK folds the Duo's
 * toolbar into the safe-area insets, which the header and tab bar already apply.
 */
export function useDuoShellInsets(): DuoShellInsets {
  return NONE;
}
