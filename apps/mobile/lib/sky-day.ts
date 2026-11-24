// A day's panchanga from the sky the app carries (BS 1950-2150 inside the app), or null so the
// screen asks the server as before. The loader is a dynamic import, so a missing native module or
// an unreadable file is "no answer" and never a crash at launch. An update can turn it off by
// shipping EXPO_PUBLIC_SKY_LOCAL=off.
import type { SkySystem } from "@vedic-patro/domain/astronomy/sky";
import { safeSkyDay } from "@vedic-patro/domain/astronomy/sky-safe";
import type { SkyDay, SkyDayInput } from "@vedic-patro/domain/astronomy/sky-day";

export function offlineDay(system: SkySystem, input: SkyDayInput): Promise<SkyDay | null> {
  return safeSkyDay(async () => (await import("@/lib/sky")).getSky(system), input, {
    enabled: process.env.EXPO_PUBLIC_SKY_LOCAL !== "off",
  });
}
