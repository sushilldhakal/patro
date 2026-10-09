import { Platform } from "react-native";
import { listProfiles } from "@/lib/auth/client";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { DEFAULT_PANCHANGA_LOCATION, readStoredLocation } from "@/lib/use-panchanga-location";
import { fetchDailyGuidance, listReminders } from "./api";
import { getNotificationPermission } from "./permissions";
import { planNotifications } from "./plan";
import { applySchedule, NOTIFICATION_BUDGET } from "./scheduler";
import { notifStore, type CachedProfile } from "./store";
import type { GuidanceRange } from "./types";
import { todayIn } from "./zoned";

/** Days of guidance fetched and cached ahead — what offline use runs on. */
export const GUIDANCE_DAYS = 14;
/** Re-fetch once the cache has fewer than this many future days left. */
const REFRESH_BELOW_DAYS = 8;

export interface SyncResult {
  scheduled: number;
  online: boolean;
  permission: "granted" | "denied" | "undetermined";
}

function futureDays(range: GuidanceRange | null | undefined, today: string): number {
  return range ? range.days.filter((d) => d.date >= today).length : 0;
}

/**
 * Refreshes what can be refreshed, then rebuilds the schedule from the cache.
 *
 * Offline it skips the network entirely and plans from whatever was cached
 * earlier (including by an offline pack), so a phone with no signal keeps
 * firing the notifications it already knows about.
 */
export async function syncNotifications(options: {
  lang: "ne" | "en";
  /** Re-fetch even if the cache still looks fresh (after a profile or place change). */
  force?: boolean;
}): Promise<SyncResult> {
  const { lang, force = false } = options;
  if (Platform.OS === "web") return { scheduled: 0, online: false, permission: "denied" };
  await notifStore.setLang(lang);

  const online = await isCurrentlyOnline();
  const location = await readStoredLocation().catch(() => DEFAULT_PANCHANGA_LOCATION);
  const tz = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(tz);

  let profiles: CachedProfile[] = await notifStore.getProfiles();
  let reminders = await notifStore.getReminders();

  if (online) {
    try {
      profiles = (await listProfiles()).map((p) => ({ id: p.id, full_name: p.full_name }));
      await notifStore.setProfiles(profiles);
    } catch {
      /* keep the cached list */
    }
    try {
      reminders = await listReminders();
      await notifStore.setReminders(reminders);
    } catch {
      /* keep the cached rules */
    }
  }

  const guidance: Record<string, GuidanceRange | null> = {};
  for (const profile of profiles) {
    let range = (await notifStore.getGuidance(profile.id)) ?? null;
    const needsFetch = force || futureDays(range, today) < REFRESH_BELOW_DAYS || range?.location.timezone !== tz;
    if (online && needsFetch) {
      try {
        range = { ...(await fetchDailyGuidance(profile.id, today, GUIDANCE_DAYS, location.params)), fetchedAt: Date.now() };
        await notifStore.setGuidance(profile.id, range);
      } catch {
        /* fall back to whatever is cached */
      }
    }
    guidance[profile.id] = range;
  }

  const permission = await getNotificationPermission();
  if (permission !== "granted") return { scheduled: 0, online, permission };

  const planned = planNotifications({
    now: new Date(),
    lang,
    profiles: profiles.map((p) => ({ id: p.id, name: p.full_name })),
    guidance,
    reminders,
    briefing: await notifStore.getBriefing(),
    budget: NOTIFICATION_BUDGET,
  });
  const scheduled = await applySchedule(planned);
  return { scheduled, online, permission };
}
