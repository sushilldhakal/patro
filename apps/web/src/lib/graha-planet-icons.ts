import type { GrahaKey } from "@/lib/graha-details";
import type { HoraPlanetKey } from "@/lib/hora-data";
import sunUrl from "@/assets/graha/sun.svg?url";
import moonUrl from "@/assets/graha/moon.svg?url";
import marsUrl from "@/assets/graha/mars.svg?url";
import mercuryUrl from "@/assets/graha/mercury.svg?url";
import jupiterUrl from "@/assets/graha/jupiter.svg?url";
import venusUrl from "@/assets/graha/venus.svg?url";
import saturnUrl from "@/assets/graha/saturn.svg?url";
import rahuUrl from "@/assets/graha/rahu.svg?url";
import ketuUrl from "@/assets/graha/ketu.svg?url";

/** Bundled SVG URLs — one file per graha under `src/assets/graha/`. */
export const GRAHA_PLANET_ICON_URL: Record<GrahaKey, string> = {
  sun: sunUrl,
  moon: moonUrl,
  mars: marsUrl,
  mercury: mercuryUrl,
  jupiter: jupiterUrl,
  venus: venusUrl,
  saturn: saturnUrl,
  rahu: rahuUrl,
  ketu: ketuUrl,
};

export const HORA_TO_GRAHA: Record<HoraPlanetKey, GrahaKey> = {
  ravi: "sun",
  soma: "moon",
  mangala: "mars",
  budha: "mercury",
  guru: "jupiter",
  shukra: "venus",
  shani: "saturn",
};

/** Resolve API / UI graha string to a known key when possible. */
export function grahaKeyFromName(name?: string | null): GrahaKey | undefined {
  if (!name?.trim()) return undefined;
  const n = name.trim().toLowerCase();
  const keys: GrahaKey[] = [
    "sun",
    "moon",
    "mars",
    "mercury",
    "jupiter",
    "venus",
    "saturn",
    "rahu",
    "ketu",
  ];
  if (keys.includes(n as GrahaKey)) return n as GrahaKey;
  return undefined;
}
