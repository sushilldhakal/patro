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

/**
 * Every window the API can list for a day (`windows[].key`), in the order the
 * panchanga page shows them. Some only occur on certain days (भद्रा, गण्ड मूल,
 * सर्वार्थ सिद्धि) — a reminder for one simply fires on the days it exists.
 */
export const WINDOW_OPTIONS: { kind: WindowKind; key: string; ne: string; en: string }[] = [
  { kind: "ashubh", key: "varjyam", ne: "वर्ज्यम्", en: "Varjyam" },
  { kind: "ashubh", key: "bhadra", ne: "भद्रा", en: "Bhadra" },
  { kind: "ashubh", key: "aadal_yoga", ne: "आडाल योग", en: "Aadal Yoga" },
  { kind: "ashubh", key: "vidaal_yoga", ne: "विडाल योग", en: "Vidaal Yoga" },
  { kind: "ashubh", key: "tithi", ne: "तिथि", en: "Tithi" },
  { kind: "ashubh", key: "gulika", ne: "गुलिक काल", en: "Gulika Kaal" },
  { kind: "ashubh", key: "dur_muhurtam", ne: "दुर्मुहूर्तम्", en: "Dur Muhurtam" },
  { kind: "ashubh", key: "rahu_kalam", ne: "राहु काल", en: "Rahu Kaal" },
  { kind: "ashubh", key: "yamaganda", ne: "यमगण्ड", en: "Yamaganda" },
  { kind: "ashubh", key: "tithi_randhra", ne: "तिथि रन्ध्र", en: "Tithi Randhra" },
  { kind: "ashubh", key: "visha_tithi", ne: "तिथि विष", en: "Tithi Visha" },
  { kind: "ashubh", key: "visha_yoga", ne: "योग विष", en: "Yoga Visha" },
  { kind: "ashubh", key: "ganda_moola", ne: "गण्ड मूल", en: "Ganda Moola" },
  { kind: "ashubh", key: "baana", ne: "बाण", en: "Baana" },
  { kind: "shubh", key: "abhijit", ne: "अभिजित् मुहूर्त", en: "Abhijit Muhurta" },
  { kind: "shubh", key: "vijaya_muhurta", ne: "विजय मुहूर्त", en: "Vijaya Muhurta" },
  { kind: "shubh", key: "amrit_kalam", ne: "अमृत काल", en: "Amrit Kalam" },
  { kind: "shubh", key: "godhuli_muhurta", ne: "गोधूलि मुहूर्त", en: "Godhuli Muhurta" },
  { kind: "shubh", key: "sayahna_sandhya", ne: "सायं सन्ध्या", en: "Sayahna Sandhya" },
  { kind: "shubh", key: "nishita_muhurta", ne: "निशिता मुहूर्त", en: "Nishita Muhurta" },
  { kind: "shubh", key: "brahma_muhurta", ne: "ब्रह्म मुहूर्त", en: "Brahma Muhurta" },
  { kind: "shubh", key: "pratah_sandhya", ne: "प्रातः सन्ध्या", en: "Pratah Sandhya" },
  { kind: "shubh", key: "sarvartha_siddhi", ne: "सर्वार्थ सिद्धि योग", en: "Sarvartha Siddhi Yoga" },
];

export const LEAD_MINUTE_OPTIONS = [0, 5, 10, 15, 30, 60] as const;
