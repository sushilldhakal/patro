import { NativeModules, Platform } from "react-native";

/**
 * Starts Meta's iOS SDK from JavaScript, for iOS binaries that were built before
 * plugins/with-meta-app-events.js started it natively in AppDelegate (1.2.3 build 46 and
 * earlier). The iOS SDK ignores FacebookAutoInitEnabled, so without a start it sends no install
 * or activate-app events. Once started it logs those on its own (FacebookAutoLogAppEventsEnabled).
 *
 * Guarded so an over-the-air update stays safe on every binary: a build without the SDK has no
 * FBSettings native module and this does nothing. On builds that already started the SDK
 * natively a second start is a no-op in the SDK. Android starts itself and is left alone.
 * Imported once by the root layout.
 */
type FBSettingsModule = { initializeSDK?: () => void };

function startMetaSdk(): void {
  if (Platform.OS !== "ios") return;
  const settings = NativeModules.FBSettings as FBSettingsModule | undefined;
  if (typeof settings?.initializeSDK !== "function") return;
  try {
    settings.initializeSDK();
  } catch {
    // Measurement is best-effort; never let it break launch.
  }
}

startMetaSdk();
