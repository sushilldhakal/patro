import { parseBirthDateParts } from "@/lib/birth-date";
import type { Profile } from "@/lib/auth/client";
import type { Era } from "@/lib/era";
import {
  instantFromEraParts,
  type InstantQuery,
} from "@/lib/instant-query";
import {
  DEFAULT_PANCHANGA_LOCATION,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { AD_MONTH_NAMES, AD_MONTH_NAMES_NE, BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";

/** Map a saved profile era onto the API's four-era grammar. */
export function profileBirthEra(p: Profile): Era {
  const raw = (p.birth_era ?? "bs").trim().toLowerCase();
  if (raw === "ad" || raw === "ce") return "ad";
  if (raw === "bc" || raw === "bce") return "bc";
  if (raw === "bbs") return "bbs";
  return "bs";
}

/** Birth clock from a profile, or a sensible default. */
export function profileClock(p: Profile, fallback = "12:00"): string {
  return p.birth_time && /^\d{1,2}:\d{2}/.test(p.birth_time) ? p.birth_time : fallback;
}

/** Build a location from a profile's saved coordinates, falling back if absent. */
export function profileLocation(
  p: Profile,
  fallback: PanchangaLocation = DEFAULT_PANCHANGA_LOCATION,
): PanchangaLocation {
  if (p.latitude != null && p.longitude != null) {
    return {
      label: p.location_label || p.city || "जन्म स्थान",
      params: {
        lat: p.latitude,
        lon: p.longitude,
        ...(p.timezone ? { timezone: p.timezone } : {}),
      },
    };
  }
  return fallback;
}

/**
 * Birth moment as the API addresses it — era + civil parts + clock.
 * Does not convert BS→AD; the server resolves the instant.
 */
export function profileBirthMoment(p: Profile): InstantQuery | null {
  if (!p.birth_date) return null;
  const parts = parseBirthDateParts(p.birth_date);
  if (!parts) return null;
  if (parts.m < 1 || parts.m > 12 || parts.d < 1 || parts.d > 32) return null;
  return instantFromEraParts(
    profileBirthEra(p),
    { year: parts.y, month: parts.m, day: parts.d },
    profileClock(p),
  );
}

/** Panchanga query inputs from a saved profile — no calendar conversion. */
export function profileChartParams(p: Profile) {
  const moment = profileBirthMoment(p);
  if (!moment) return null;
  return {
    moment,
    clock: moment.clock,
    location: profileLocation(p),
  };
}

/** Display label from the stored era parts (month-name tables only, no conversion). */
export function formatMomentDateLabel(
  q: InstantQuery,
  lang: string,
  digits: (v: string | number) => string = String,
): string {
  const isEn = lang.slice(0, 2) === "en";
  if (q.inputEra === "ad" || q.inputEra === "bc") {
    const months = isEn ? AD_MONTH_NAMES : AD_MONTH_NAMES_NE;
    const era = q.inputEra === "bc" ? (isEn ? " BC" : " ई.पू.") : "";
    return `${months[q.month - 1]} ${digits(q.day)}, ${digits(q.year)}${era}`;
  }
  const months = isEn ? BS_MONTH_NAMES : BS_MONTHS_NE;
  const era = q.inputEra === "bbs" ? (isEn ? " BBS" : " पू.वि.सं.") : "";
  return `${months[q.month - 1] ?? ""} ${digits(q.day)}, ${digits(q.year)}${era}`;
}

export function formatProfileBirthLabel(
  p: Profile,
  lang: string,
  digits: (v: string | number) => string = String,
): string {
  const moment = profileBirthMoment(p);
  if (!moment) {
    if (!p.birth_date) return "—";
    const era = (p.birth_era ?? "bs").toUpperCase();
    return `${digits(p.birth_date)} ${era}`;
  }
  return formatMomentDateLabel(moment, lang, digits);
}

/** @deprecated Use {@link profileBirthMoment} — kept so older call sites compile during the move. */
export function parseBirthDate(p: Profile): Date | null {
  const moment = profileBirthMoment(p);
  if (!moment || (moment.inputEra !== "ad" && moment.inputEra !== "bc")) return null;
  try {
    return new Date(moment.year, moment.month - 1, moment.day);
  } catch {
    return null;
  }
}
