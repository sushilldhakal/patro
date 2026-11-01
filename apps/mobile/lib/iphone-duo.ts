import { Platform } from "react-native";
import * as Device from "expo-device";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * iPhone Duo only. On the Duo the system toolbar sits over the top-right of the window, where the
 * header's sign-in button and the page's location button are. Its height is not part of the
 * reported top safe-area inset, so a header padded by `insets.top` alone draws under the toolbar.
 *
 * Every other iPhone keeps the layout it has always had: `useDuoShellInsets` returns zeros there.
 * The web app does the same in apps/web/index.html + src/index.css (`html[data-iphone-duo]`).
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

/** Height of the Duo's top toolbar below the reported safe area, in points. */
export const DUO_TOOLBAR_HEIGHT = 52;

export type DuoShellInsets = {
  /** Extra space above the app header, on top of `insets.top`. */
  top: number;
  /** Side padding for the header and page so nothing sits under the toolbar's corners. */
  left: number;
  right: number;
};

const NONE: DuoShellInsets = { top: 0, left: 0, right: 0 };

/** Extra shell padding for the iPhone Duo; all zero on every other device. */
export function useDuoShellInsets(): DuoShellInsets {
  const insets = useSafeAreaInsets();
  if (!IS_IPHONE_DUO) return NONE;
  return { top: DUO_TOOLBAR_HEIGHT, left: insets.left, right: insets.right };
}
