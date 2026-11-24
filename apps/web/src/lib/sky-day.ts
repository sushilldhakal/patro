// A day's panchanga from the sky the site carries (BS 1950-2150 in /sky), or null so the page asks
// the server as before. The loader is a dynamic import, so the sky code and its parsing only load
// when a page asks, and a failure there cannot break the page.
import type { SkySystem } from "@vedic-patro/domain/astronomy/sky";
import { safeSkyDay } from "@vedic-patro/domain/astronomy/sky-safe";
import type { SkyDay, SkyDayInput } from "@vedic-patro/domain/astronomy/sky-day";

/** Set `localStorage.sky_local = "off"` to turn the local sky off in one browser. */
export function skyLocalEnabled(): boolean {
  try {
    return localStorage.getItem("sky_local") !== "off";
  } catch {
    return true;
  }
}

export function offlineDay(system: SkySystem, input: SkyDayInput): Promise<SkyDay | null> {
  return safeSkyDay(async () => (await import("./sky")).getSky(system), input, { enabled: skyLocalEnabled() });
}
