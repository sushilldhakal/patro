/**
 * ऋतु — the six seasons, driven by the Sun's tropical longitude (the API
 * computes the boundaries). South of the equator the displayed season shifts
 * three slots; the dates do not. This turns the boundaries into card data.
 */
import type { TropicalSeasonsResponse } from "@vedic-patro/api-client";
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

export interface SeasonItem {
  solarSlot: number;
  angle: number;
  startBs: { day: number; month: number };
  startAd: string;
  isCurrent: boolean;
  daysUntil: number;
  progress: { elapsed: number; total: number; pct: number } | null;
}

export function seasonItems(boundaries: TropicalSeasonsResponse["boundaries"] | undefined, todayAd: string, tz: string, nowMs: number): SeasonItem[] {
  if (!boundaries?.length) return [];
  const todayMid = midnightUtcMs(todayAd);
  return boundaries.map((b, i) => {
    const startAd = todayAdStringInTimezone(new Date(b.start_instant_utc), tz);
    const bs = adToBS(civilNoon(startAd));
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
      startBs: { day: bs.day, month: bs.month },
      startAd,
      isCurrent: b.is_current,
      daysUntil: Math.round((midnightUtcMs(startAd) - todayMid) / DAY),
      progress,
    };
  });
}
