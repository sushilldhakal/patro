import { Platform } from "react-native";
import * as Device from "expo-device";

/**
 * iPhone Duo only, folded or unfolded (detection is by hardware, so both states match).
 *
 * On the Duo the app uses the system's own bars: a native tab bar and a native header toolbar
 * (components/navigation/DuoNativeTabs.tsx). iOS 27.1 puts those in a vertical rail on the side the
 * app sits on, below the status bar and clear of the Dynamic Island, and keeps them horizontal in
 * portrait. Custom JS bars are not laid out by the system, so no padding or rail is faked here.
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
