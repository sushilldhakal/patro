import { parseBirthDateParts } from "@/lib/birth-date";
import type { Profile } from "@/lib/auth/client";
import {
  instantFromEraParts,
  type InstantQuery,
} from "@/lib/instant-query";
import {
  DEFAULT_PANCHANGA_LOCATION,
  type PanchangaLocation,
} from "@/lib/use-panchanga-location";
import { AD_MONTH_NAMES, BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";

export type ProfileBirthEra = InstantQuery["inputEra"];

export function profileBirthEra(p: Profile): ProfileBirthEra {
  const raw = (p.birth_era ?? "bs").trim().toLowerCase();
  if (raw === "ad" || raw === "ce") return "ad";
  if (raw === "bc" || raw === "bce") return "bc";
  if (raw === "bbs") return "bbs";
  return "bs";
}

export function profileClock(p: Profile, fallback = "12:00"): string {
  return p.birth_time && /^\d{1,2}:\d{2}/.test(p.birth_time) ? p.birth_time : fallback;
}

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

export function profileChartParams(p: Profile) {
  const moment = profileBirthMoment(p);
  if (!moment) return null;
  return {
    moment,
    clock: moment.clock,
    location: profileLocation(p),
  };
}

export function formatMomentDateLabel(
  q: InstantQuery,
  lang: string,
  digits: (v: string | number) => string = String,
): string {
  const isEn = lang.slice(0, 2) === "en";
  if (q.inputEra === "ad" || q.inputEra === "bc") {
    const era = q.inputEra === "bc" ? (isEn ? " BC" : " ई.पू.") : "";
    return `${AD_MONTH_NAMES[q.month - 1]} ${digits(q.day)}, ${digits(q.year)}${era}`;
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
    return `${digits(p.birth_date)} ${(p.birth_era ?? "bs").toUpperCase()}`;
  }
  return formatMomentDateLabel(moment, lang, digits);
}

export function parseBirthDate(p: Profile): Date | null {
  const moment = profileBirthMoment(p);
  if (!moment || (moment.inputEra !== "ad" && moment.inputEra !== "bc")) return null;
  try {
    return new Date(moment.year, moment.month - 1, moment.day);
  } catch {
    return null;
  }
}
