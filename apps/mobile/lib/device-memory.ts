import { Platform } from "react-native";
import * as Device from "expo-device";
import { setLowMemoryMotion } from "@vedic-patro/ui/motion";

const GB = 1024 ** 3;

/**
 * Phones with less RAM than this run the app in low-memory mode. Android "4 GB" phones report
 * about 3.6-3.9 GB, and those (e.g. realme 8i) are the ones that hit ANRs on the home screen
 * (Sentry PATRO-6/7), so they count as low. iOS manages memory more tightly and 4 GB iPhones
 * run fine, so only 3 GB and under count there.
 */
const LOW_MEMORY_BELOW_BYTES = Platform.OS === "android" ? 4.5 * GB : 3.5 * GB;

function detectLowMemory(): boolean {
  if (Platform.OS === "web") return false;
  const total = Device.totalMemory;
  // Unknown (null, 0) means we can't tell: keep the full experience.
  if (!total || total <= 0) return false;
  return total < LOW_MEMORY_BELOW_BYTES;
}

/**
 * True on phones short on RAM. Fixed for the life of the process, so components may branch on
 * it at module level or before hooks. Everything it changes is only for these phones; phones
 * with more memory keep exactly the same behaviour:
 * - decorative motion is dropped (same path as the OS Reduce Motion setting), and `Reveal`
 *   renders its content directly, with no per-block scroll reactions;
 * - tabs you leave unload after 3 s instead of 20 s;
 * - 3D scenes draw at 1x pixel ratio and free their GL context 1 s after the screen is left.
 */
export const IS_LOW_MEMORY_DEVICE = detectLowMemory();

/** Total RAM in whole GB (rounded), for Sentry tags. Null when the OS doesn't say. */
export const DEVICE_MEMORY_GB = Device.totalMemory ? Math.round(Device.totalMemory / GB) : null;

setLowMemoryMotion(IS_LOW_MEMORY_DEVICE);
