import { findNakshatraIcon, NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { rashiNumberFromName } from "@vedic-patro/domain/rashi-i18n";

const HORA_TO_GRAHA: Record<string, GrahaKey> = {
  ravi: "sun",
  soma: "moon",
  mangala: "mars",
  budha: "mercury",
  guru: "jupiter",
  shukra: "venus",
  shani: "saturn",
};

const GRAHA_KEYS: GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];

export function rashiIconIndex(name?: string | null, number?: number | null): number | undefined {
  if (number != null && number >= 1 && number <= 12) return number - 1;
  const n = rashiNumberFromName(name);
  return n != null ? n - 1 : undefined;
}

export function nakshatraIconIndex(name?: string | null, number?: number | null): number | undefined {
  if (number != null && number >= 1 && number <= 27) return number - 1;
  const icon = findNakshatraIcon(name);
  if (!icon) return undefined;
  const idx = NAKSHATRA_ICONS.indexOf(icon);
  return idx >= 0 ? idx : undefined;
}

/** Website lookup: an exact graha key, then a hora name, then the domain labels. */
export function grahaKeyFromLabel(raw?: string | null): GrahaKey | undefined {
  if (!raw?.trim()) return undefined;
  const lower = raw.trim().toLowerCase();
  if (GRAHA_KEYS.includes(lower as GrahaKey)) return lower as GrahaKey;
  for (const [horaKey, graha] of Object.entries(HORA_TO_GRAHA)) {
    if (lower.includes(horaKey)) return graha;
  }
  for (const key of GRAHA_KEYS) {
    const labels = GRAHA_NAME[key];
    if (lower.includes(labels.en.toLowerCase()) || raw.includes(labels.ne)) return key;
  }
  return undefined;
}
