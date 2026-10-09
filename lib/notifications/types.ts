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

/** Windows a reminder can target — keys match the API's `windows[].key`. */
export const WINDOW_OPTIONS: { kind: WindowKind; key: string; ne: string; en: string }[] = [
  { kind: "shubh", key: "abhijit", ne: "अभिजित् मुहूर्त", en: "Abhijit Muhurta" },
  { kind: "shubh", key: "amrit_kalam", ne: "अमृत काल", en: "Amrit Kalam" },
  { kind: "shubh", key: "vijaya_muhurta", ne: "विजय मुहूर्त", en: "Vijaya Muhurta" },
  { kind: "shubh", key: "brahma_muhurta", ne: "ब्रह्म मुहूर्त", en: "Brahma Muhurta" },
  { kind: "shubh", key: "godhuli_muhurta", ne: "गोधूलि मुहूर्त", en: "Godhuli Muhurta" },
  { kind: "ashubh", key: "rahu_kalam", ne: "राहु काल", en: "Rahu Kaal" },
  { kind: "ashubh", key: "yamaganda", ne: "यमगण्ड", en: "Yamaganda" },
  { kind: "ashubh", key: "gulika", ne: "गुलिक काल", en: "Gulika Kaal" },
  { kind: "ashubh", key: "varjyam", ne: "वर्ज्यम्", en: "Varjyam" },
  { kind: "ashubh", key: "dur_muhurtam", ne: "दुर्मुहूर्त", en: "Dur Muhurtam" },
];

export const LEAD_MINUTE_OPTIONS = [0, 5, 10, 15, 30, 60] as const;
