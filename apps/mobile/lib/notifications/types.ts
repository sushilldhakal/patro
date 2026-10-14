import { tFor } from "@vedic-patro/i18n/runtime";
export type WindowKind = "shubh" | "ashubh";

export interface GuidanceWindow {
  kind: WindowKind;
  key: string;
  name_ne: string | null;
  name_en: string | null;
  /** Local "HH:MM" in the guidance range's own timezone. */
  start: string;
  end: string | null;
}

export interface GuidanceDay {
  date: string;
  date_bs: string | null;
  weekday_ne: string | null;
  weekday_en: string | null;
  tithi_ne: string | null;
  tithi_en: string | null;
  nakshatra_ne: string | null;
  nakshatra_en: string | null;
  personal_tone: "best" | "good" | "neutral" | "bad" | "worst" | null;
  summary_ne: string;
  summary_en: string;
  do_ne: string[];
  do_en: string[];
  dont_ne: string[];
  dont_en: string[];
  careful_ne: string[];
  careful_en: string[];
  windows: GuidanceWindow[];
}

export interface GuidanceRange {
  version: string;
  profile_id: string;
  location: { lat: number | null; lon: number | null; timezone: string };
  days: GuidanceDay[];
  /** When this copy was fetched — lets the UI say how fresh offline data is. */
  fetchedAt?: number;
}

/** A reminder *rule*: window times differ daily, so each day is materialised from the cache. */
export interface ReminderRule {
  id: string;
  profile_id: string | null;
  window_kind: WindowKind;
  window_key: string;
  lead_minutes: number;
  /** 0 = Sunday … 6; empty means every day. */
  weekdays: number[];
  label: string | null;
  enabled: boolean;
}

export type ReminderInput = Omit<ReminderRule, "id">;

export interface BriefingSettings {
  /** Profile id → on/off. Missing means on (a newly added profile is on by default). */
  enabled: Record<string, boolean>;
  /** Local "HH:MM" in the place the guidance is for. */
  time: string;
}

export const DEFAULT_BRIEFING: BriefingSettings = { enabled: {}, time: "06:00" };

/** The daily rashifal notification — works signed in (personal) and signed out (general). */
export interface RashifalSettings {
  enabled: boolean;
  /** Local "HH:MM" in the place the rashifal is for. Always {@link RASHIFAL_NOTIFICATION_TIME}. */
  time: string;
  /** Signed-out choice: rashi id 1–12. Null falls back to the day's moon sign. */
  guestSignId: number | null;
}

/** The daily rashifal notification always fires at 7 am local time. */
export const RASHIFAL_NOTIFICATION_TIME = "07:00";

export const DEFAULT_RASHIFAL_SETTINGS: RashifalSettings = {
  enabled: true,
  time: RASHIFAL_NOTIFICATION_TIME,
  guestSignId: null,
};

/** One day of cached rashifal text, both languages so a language switch needs no refetch. */
export interface RashifalDayEntry {
  sign_ne: string;
  sign_en: string;
  text_ne: string;
  text_en: string;
}

export interface RashifalCache {
  /** Who/where it was fetched for — a change in any part invalidates the cache. */
  key: string;
  personal: boolean;
  timezone: string;
  /** Civil date (AD) → entry. */
  days: Record<string, RashifalDayEntry>;
}

/**
 * Every window the API can list for a day (`windows[].key`), in the order the
 * panchanga page shows them. Some only occur on certain days (भद्रा, गण्ड मूल,
 * सर्वार्थ सिद्धि) — a reminder for one simply fires on the days it exists.
 */
export const WINDOW_OPTIONS: { kind: WindowKind; key: string; ne: string; en: string }[] = [
  { kind: "ashubh", key: "varjyam", get ne() { return tFor("ne", "ui.notifications.varjyam"); }, get en() { return tFor("en", "ui.notifications.varjyam"); } },
  { kind: "ashubh", key: "bhadra", get ne() { return tFor("ne", "ui.notifications.bhadra"); }, get en() { return tFor("en", "ui.notifications.bhadra"); } },
  { kind: "ashubh", key: "aadal_yoga", get ne() { return tFor("ne", "ui.notifications.aadal_yoga"); }, get en() { return tFor("en", "ui.notifications.aadal_yoga"); } },
  { kind: "ashubh", key: "vidaal_yoga", get ne() { return tFor("ne", "ui.notifications.vidaal_yoga"); }, get en() { return tFor("en", "ui.notifications.vidaal_yoga"); } },
  { kind: "ashubh", key: "tithi", get ne() { return tFor("ne", "tithi"); }, get en() { return tFor("en", "tithi"); } },
  { kind: "ashubh", key: "gulika", get ne() { return tFor("ne", "ui.notifications.gulika_kaal"); }, get en() { return tFor("en", "ui.notifications.gulika_kaal"); } },
  { kind: "ashubh", key: "dur_muhurtam", get ne() { return tFor("ne", "ui.notifications.dur_muhurtam"); }, get en() { return tFor("en", "ui.notifications.dur_muhurtam"); } },
  { kind: "ashubh", key: "rahu_kalam", get ne() { return tFor("ne", "ui.panchanga_detail_card.rahu_kaal"); }, get en() { return tFor("en", "ui.panchanga_detail_card.rahu_kaal"); } },
  { kind: "ashubh", key: "yamaganda", get ne() { return tFor("ne", "ui.panchanga.yamaganda"); }, get en() { return tFor("en", "ui.panchanga.yamaganda"); } },
  { kind: "ashubh", key: "tithi_randhra", get ne() { return tFor("ne", "ui.notifications.tithi_randhra"); }, get en() { return tFor("en", "ui.notifications.tithi_randhra"); } },
  { kind: "ashubh", key: "visha_tithi", get ne() { return tFor("ne", "ui.notifications.tithi_visha"); }, get en() { return tFor("en", "ui.notifications.tithi_visha"); } },
  { kind: "ashubh", key: "visha_yoga", get ne() { return tFor("ne", "ui.notifications.yoga_visha"); }, get en() { return tFor("en", "ui.notifications.yoga_visha"); } },
  { kind: "ashubh", key: "ganda_moola", get ne() { return tFor("ne", "ui.notifications.ganda_moola"); }, get en() { return tFor("en", "ui.notifications.ganda_moola"); } },
  { kind: "ashubh", key: "baana", get ne() { return tFor("ne", "ui.notifications.baana"); }, get en() { return tFor("en", "ui.notifications.baana"); } },
  { kind: "shubh", key: "abhijit", get ne() { return tFor("ne", "ui.notifications.abhijit_muhurta"); }, get en() { return tFor("en", "ui.notifications.abhijit_muhurta"); } },
  { kind: "shubh", key: "vijaya_muhurta", get ne() { return tFor("ne", "ui.notifications.vijaya_muhurta"); }, get en() { return tFor("en", "ui.notifications.vijaya_muhurta"); } },
  { kind: "shubh", key: "amrit_kalam", get ne() { return tFor("ne", "ui.notifications.amrit_kalam"); }, get en() { return tFor("en", "ui.notifications.amrit_kalam"); } },
  { kind: "shubh", key: "godhuli_muhurta", get ne() { return tFor("ne", "ui.notifications.godhuli_muhurta"); }, get en() { return tFor("en", "ui.notifications.godhuli_muhurta"); } },
  { kind: "shubh", key: "sayahna_sandhya", get ne() { return tFor("ne", "ui.notifications.sayahna_sandhya"); }, get en() { return tFor("en", "ui.notifications.sayahna_sandhya"); } },
  { kind: "shubh", key: "nishita_muhurta", get ne() { return tFor("ne", "ui.notifications.nishita_muhurta"); }, get en() { return tFor("en", "ui.notifications.nishita_muhurta"); } },
  { kind: "shubh", key: "brahma_muhurta", get ne() { return tFor("ne", "ui.notifications.brahma_muhurta"); }, get en() { return tFor("en", "ui.notifications.brahma_muhurta"); } },
  { kind: "shubh", key: "pratah_sandhya", get ne() { return tFor("ne", "ui.notifications.pratah_sandhya"); }, get en() { return tFor("en", "ui.notifications.pratah_sandhya"); } },
  { kind: "shubh", key: "sarvartha_siddhi", get ne() { return tFor("ne", "ui.notifications.sarvartha_siddhi_yoga"); }, get en() { return tFor("en", "ui.notifications.sarvartha_siddhi_yoga"); } },
];

export const LEAD_MINUTE_OPTIONS = [0, 5, 10, 15, 30, 60] as const;
