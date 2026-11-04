import { refreshTodayWidget } from "@/lib/widgets/today-widget";
import { importPhoneCalendars } from "@/lib/events/device-calendars";
import { listEvents } from "@/lib/events/api";
import { planEventAlerts } from "@/lib/events/alerts";
import { Platform } from "react-native";
import { listProfiles, tokenStore, type Profile } from "@/lib/auth/client";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { DEFAULT_PANCHANGA_LOCATION, readStoredLocation } from "@/lib/use-panchanga-location";
import { fetchDailyGuidance, listReminders } from "./api";
import { getNotificationPermission } from "./permissions";
import { planNotifications } from "./plan";
import { syncRashifalCache } from "./rashifal";
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

  const signedIn = Boolean(tokenStore.access || tokenStore.refresh);
  const permission = await getNotificationPermission();
  // Guests with notifications off have nothing to schedule — skip the network.
  if (!signedIn && permission !== "granted") return { scheduled: 0, online: false, permission };

  const online = await isCurrentlyOnline();
  const location = await readStoredLocation().catch(() => DEFAULT_PANCHANGA_LOCATION);
  const tz = location.params.timezone ?? "Asia/Kathmandu";
  const today = todayIn(tz);

  let profiles: CachedProfile[] = signedIn ? await notifStore.getProfiles() : [];
  let reminders = signedIn ? await notifStore.getReminders() : [];
  let events = signedIn ? await notifStore.getEvents() : [];
  let fullProfiles: Profile[] | null = null;

  if (online && signedIn) {
    try {
      fullProfiles = await listProfiles();
      profiles = fullProfiles.map((p) => ({ id: p.id, full_name: p.full_name }));
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
    try {
      // The phone's calendars the user chose to keep in step (Google, iCloud, …).
      await importPhoneCalendars().catch(() => 0);
      events = await listEvents(new Date(Date.now() - 86_400_000).toISOString());
      await notifStore.setEvents(events);
    } catch {
      /* keep the cached events */
    }
  }

  const rashifalSettings = await notifStore.getRashifalSettings();
  let rashifalCache = null;
  if (rashifalSettings.enabled) {
    try {
      rashifalCache = await syncRashifalCache({
        online,
        force,
        today,
        timezone: tz,
        location: location.params,
        settings: rashifalSettings,
        // Signed in but offline: no fresh profiles, so only a cache already
        // built for them is used (the key check inside rejects a mismatch).
        profiles: fullProfiles,
        signedIn,
      });
    } catch {
      /* the rashifal notification is an extra — never block the rest */
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

  // The home-screen widget follows the same data: today, the next festival, the next event.
  void refreshTodayWidget({ lang, timezone: tz, events }).catch(() => {});

  if (permission !== "granted") return { scheduled: 0, online, permission };

  const planned = planNotifications({
    now: new Date(),
    lang,
    profiles: profiles.map((p) => ({ id: p.id, name: p.full_name })),
    guidance,
    reminders,
    briefing: await notifStore.getBriefing(),
    rashifal: { settings: rashifalSettings, cache: rashifalCache },
    budget: NOTIFICATION_BUDGET,
  });
  // The user's own events come first: they asked for these alerts by name.
  const eventAlerts = planEventAlerts(events, new Date(), lang);
  const scheduled = await applySchedule([...eventAlerts, ...planned].slice(0, NOTIFICATION_BUDGET));
  return { scheduled, online, permission };
}
