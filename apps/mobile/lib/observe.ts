import { requireOptionalNativeModule } from "expo";
import type { ComponentType } from "react";
import { Platform } from "react-native";
import type { ObserveModule } from "expo-observe";

/*
 * iOS Expo Go does not ship expo-observe or expo-app-metrics. A static import throws
 * "Cannot find native module 'ExpoAppMetrics'" while the root layout is still evaluating,
 * so Expo Router never sees the default export. Android Expo Go includes those modules.
 * Load the package only when the native side is actually there; otherwise the calls below
 * are no-ops and a development or store build still records metrics.
 */
const observeAvailable =
  Platform.OS === "web" ||
  (requireOptionalNativeModule("ExpoAppMetrics") != null &&
    requireOptionalNativeModule("ExpoObserve") != null);

type ObserveRootLike = {
  wrap<P extends Record<string, unknown>>(Component: ComponentType<P>): ComponentType<P>;
};

const unavailableObserve = {
  configure() {},
  markInteractive() {},
  reportError() {},
} as unknown as ObserveModule;

function loadObserve(): { Observe: ObserveModule; ObserveRoot: ObserveRootLike } {
  /* expo-observe's web typings declare the module as a class rather than its instance, and this
     app's TypeScript reads `.web` typings first; the object itself is an `ObserveModule`. */
  const observe = require("expo-observe") as {
    Observe: ObserveModule;
    ObserveRoot: ObserveRootLike;
  };
  return { Observe: observe.Observe as unknown as ObserveModule, ObserveRoot: observe.ObserveRoot };
}

const loaded = observeAvailable ? loadObserve() : null;

export const Observe: ObserveModule = loaded?.Observe ?? unavailableObserve;

export const ObserveRoot: ObserveRootLike = loaded?.ObserveRoot ?? {
  wrap: (Component) => Component,
};
