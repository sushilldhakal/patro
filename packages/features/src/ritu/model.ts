/**
 * ऋतु — the six seasons, driven by the Sun's tropical longitude (the API
 * computes the boundaries). South of the equator the displayed season shifts
 * three slots; the dates do not. This turns the boundaries into card data.
 *
 * Each real-sky start may carry a `vedic` crossing: the day the sidereal Sun
 * reaches the same degree. The two are shown together so the reader sees the
 * season the texts name does not line up with the one in the sky.
 */
import type { SolarCrossing, TropicalSeasonsResponse } from "@vedic-patro/api-client";
import { adToBS } from "@vedic-patro/domain/calendar/bs-calendar";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";

const DAY = 86_400_000;
const midnightUtcMs = (adStr: string) => Date.parse(`${adStr}T00:00:00Z`);
/** A Date whose UTC calendar day equals the given civil date string. */
const civilNoon = (adStr: string) => new Date(`${adStr}T12:00:00Z`);

/** `2026-03-20` → `Mar 20` / its Nepali-locale form. */
export function fmtAdDayMonth(adStr: string, lang: "ne" | "en"): string {
  return civilNoon(adStr).toLocaleDateString(lang === "en" ? "en-US" : "ne-NP", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Signed whole days from `fromAd` to `toAd`. */
export const daysBetween = (fromAd: string, toAd: string) => Math.round((midnightUtcMs(toAd) - midnightUtcMs(fromAd)) / DAY);

export interface CivilDay {
  /** `YYYY-MM-DD` in the place's zone. */
  ad: string;
  bs: { day: number; month: number };
}

/** A crossing's civil day at the place, in AD and BS. */
export function civilDayOf(crossing: SolarCrossing, tz: string): CivilDay {
  const ad = todayAdStringInTimezone(new Date(crossing.start_instant_utc), tz);
  const bs = adToBS(civilNoon(ad));
  return { ad, bs: { day: bs.day, month: bs.month } };
}

export interface SeasonItem {
  solarSlot: number;
  angle: number;
  startBs: CivilDay["bs"];
  startAd: string;
  isCurrent: boolean;
  daysUntil: number;
  progress: { elapsed: number; total: number; pct: number } | null;
  /** The sidereal Sun's crossing of the same degree (the sankranti). */
  vedic?: CivilDay;
}

export function seasonItems(boundaries: TropicalSeasonsResponse["boundaries"] | undefined, todayAd: string, tz: string, nowMs: number): SeasonItem[] {
  if (!boundaries?.length) return [];
  return boundaries.map((b, i) => {
    const start = civilDayOf(b, tz);
    const next = boundaries[i + 1];
    let progress: SeasonItem["progress"] = null;
    if (b.is_current && next) {
      const startMs = Date.parse(b.start_instant_utc);
      const total = Math.max(1, (Date.parse(next.start_instant_utc) - startMs) / DAY);
      const elapsed = Math.max(0, (nowMs - startMs) / DAY);
      progress = { elapsed: Math.round(elapsed), total: Math.round(total), pct: Math.max(0, Math.min(100, (elapsed / total) * 100)) };
    }
    return {
      solarSlot: b.slot,
      angle: b.angle,
      startBs: start.bs,
      startAd: start.ad,
      isCurrent: b.is_current,
      daysUntil: daysBetween(todayAd, start.ad),
      progress,
      vedic: b.vedic ? civilDayOf(b.vedic, tz) : undefined,
    };
  });
}
