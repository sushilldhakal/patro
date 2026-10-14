/**
 * Where the vastu planner keeps its two inputs — the plot and the house
 * requirements — on device. The parsing, keys and defaults live in
 * `@vedic-patro/features/vastu` (`usePlotPlanner`); `expo-secure-store` is
 * async, so the saved values replace the defaults a frame after mount.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { VastuPlannerStorage } from "@vedic-patro/features/vastu";

async function readRaw(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore persistence errors
  }
}

export const vastuStorage: VastuPlannerStorage = {
  read: readRaw,
  write: (key, value) => void writeRaw(key, value),
};
