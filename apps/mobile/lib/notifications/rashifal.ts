import {
  fetchPersonalRashifal,
  fetchRashifal,
  type LocationParams,
  type RashifalBlock,
  type RashifalPersonal,
} from "@/lib/api";
import type { Profile } from "@/lib/auth/client";
import { instantCacheKey } from "@/lib/instant-query";
import { profileChartParams } from "@/lib/kundali/profile-chart";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import { notifStore } from "./store";
import type { RashifalCache, RashifalDayEntry, RashifalSettings } from "./types";

/** Days of daily rashifal fetched ahead, so notifications keep arriving offline. */
export const RASHIFAL_DAYS = 7;
/** Re-fetch once fewer than this many future days remain cached. */
const REFRESH_BELOW_DAYS = 4;

function addDays(dateAd: string, delta: number): string {
  const [y, m, d] = dateAd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + delta)).toISOString().slice(0, 10);
}

function personalEntry(p: RashifalPersonal): RashifalDayEntry {
  return {
    sign_ne: p.moon_sign_ne,
    sign_en: p.moon_sign_en,
    text_ne: p.prediction_ne,
    text_en: p.prediction_en,
  };
}

function generalEntry(block: RashifalBlock, signId: number | null): RashifalDayEntry | null {
  const sign =
    (signId != null ? block.signs.find((s) => s.id === signId) : undefined) ??
    block.signs.find((s) => s.index === block.moon_index) ??
    (block.frame ? block.signs.find((s) => s.id === block.frame!.moon_sign) : undefined);
  if (!sign) return null;
  return {
    sign_ne: sign.name || getRashiName(sign.id, "ne"),
    sign_en: sign.name_en || getRashiName(sign.id, "en"),
    text_ne: sign.prediction_ne,
    text_en: sign.prediction_en,
  };
}

/**
 * Makes sure the next few days of daily rashifal are cached for whoever this
 * phone belongs to: the default profile's personal rashifal when signed in with
 * a usable birth chart, otherwise the general rashifal of the chosen rashi.
 * Offline (or on any failure) it leaves the existing cache alone.
 */
export async function syncRashifalCache(options: {
  online: boolean;
  force: boolean;
  today: string;
  timezone: string;
  location: LocationParams;
  settings: RashifalSettings;
  profiles: Profile[] | null;
  /** Signed in with no fresh profile list (offline / request failed): keep what is cached. */
  signedIn: boolean;
}): Promise<RashifalCache | null> {
  const { online, force, today, timezone, location, settings, profiles, signedIn } = options;
  if (!online || (signedIn && !profiles)) return (await notifStore.getRashifalCache()) ?? null;
  const defaultProfile = profiles ? (profiles.find((p) => p.is_default) ?? profiles[0] ?? null) : null;
  const chart = defaultProfile ? profileChartParams(defaultProfile) : null;
  const usable = Boolean(
    defaultProfile && chart && chart.location.params.lat != null && chart.location.params.lon != null,
  );

  const key = usable
    ? `personal:${defaultProfile!.id}:${instantCacheKey(chart!.moment)}:${JSON.stringify(location)}`
    : `general:${settings.guestSignId ?? "moon"}:${JSON.stringify(location)}`;

  const cached = (await notifStore.getRashifalCache()) ?? null;
  const usableCache = cached && cached.key === key ? cached : null;
  const futureCount = usableCache ? Object.keys(usableCache.days).filter((d) => d >= today).length : 0;
  if (!online || (!force && futureCount >= REFRESH_BELOW_DAYS)) return usableCache;

  const dates = Array.from({ length: RASHIFAL_DAYS }, (_, i) => addDays(today, i));
  const results = await Promise.all(
    dates.map(async (date): Promise<[string, RashifalDayEntry | null]> => {
      try {
        if (usable) {
          const res = await fetchPersonalRashifal(
            date,
            "daily",
            {
              moment: chart!.moment,
              birthLat: chart!.location.params.lat as number,
              birthLon: chart!.location.params.lon as number,
              birthTz: chart!.location.params.timezone ?? "Asia/Kathmandu",
            },
            location,
          );
          return [date, personalEntry(res)];
        }
        const block = await fetchRashifal(date, "daily", location);
        return [date, generalEntry(block, settings.guestSignId)];
      } catch {
        return [date, null];
      }
    }),
  );

  const days: Record<string, RashifalDayEntry> = {};
  for (const [date, entry] of results) if (entry && (entry.text_ne || entry.text_en)) days[date] = entry;
  if (Object.keys(days).length === 0) return usableCache;
  const next: RashifalCache = { key, personal: usable, timezone, days };
  await notifStore.setRashifalCache(next);
  return next;
}
