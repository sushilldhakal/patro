import { deviceStore } from "@/lib/device-store";
import type { Profile } from "@/lib/auth/client";
import {
  DEFAULT_BRIEFING,
  type BriefingSettings,
  type GuidanceRange,
  type ReminderRule,
} from "./types";

/** Everything the scheduler needs offline lives in the same SQLite store as the offline packs. */
const KEYS = {
  profiles: "notif:profiles",
  reminders: "notif:reminders",
  briefing: "notif:briefing",
  lang: "notif:lang",
  deviceId: "notif:device_id",
  guidance: (profileId: string) => `notif:guidance:${profileId}`,
} as const;

export type CachedProfile = Pick<Profile, "id" | "full_name">;

export const notifStore = {
  async getProfiles(): Promise<CachedProfile[]> {
    return (await deviceStore.get<CachedProfile[]>(KEYS.profiles)) ?? [];
  },
  setProfiles: (profiles: CachedProfile[]) => deviceStore.set(KEYS.profiles, profiles),

  async getReminders(): Promise<ReminderRule[]> {
    return (await deviceStore.get<ReminderRule[]>(KEYS.reminders)) ?? [];
  },
  setReminders: (rules: ReminderRule[]) => deviceStore.set(KEYS.reminders, rules),

  async getBriefing(): Promise<BriefingSettings> {
    return { ...DEFAULT_BRIEFING, ...((await deviceStore.get<BriefingSettings>(KEYS.briefing)) ?? {}) };
  },
  setBriefing: (settings: BriefingSettings) => deviceStore.set(KEYS.briefing, settings),

  async getLang(): Promise<"ne" | "en"> {
    return (await deviceStore.get<"ne" | "en">(KEYS.lang)) ?? "ne";
  },
  setLang: (lang: "ne" | "en") => deviceStore.set(KEYS.lang, lang),

  getGuidance: (profileId: string) => deviceStore.get<GuidanceRange>(KEYS.guidance(profileId)),
  setGuidance: (profileId: string, range: GuidanceRange) =>
    deviceStore.set(KEYS.guidance(profileId), range),
  removeGuidance: (profileId: string) => deviceStore.remove(KEYS.guidance(profileId)),

  getDeviceId: () => deviceStore.get<string>(KEYS.deviceId),
  setDeviceId: (id: string) => deviceStore.set(KEYS.deviceId, id),

  /** Forget everything tied to the signed-in user (logout). */
  async clearAccountData(): Promise<void> {
    const profiles = await this.getProfiles();
    await Promise.all(profiles.map((p) => this.removeGuidance(p.id)));
    await Promise.all(
      [KEYS.profiles, KEYS.reminders, KEYS.briefing, KEYS.deviceId].map((k) => deviceStore.remove(k)),
    );
  },
};
