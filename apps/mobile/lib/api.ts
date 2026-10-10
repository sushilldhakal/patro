import { Platform } from "react-native";
import { offlineAwareGet } from "@/lib/offline/offline-http";
import Constants from "expo-constants";
import type { PlannedSpace, SpaceAssignment } from "@vedic-patro/domain/vastu-plan";
import type { VastuDirectionId } from "@vedic-patro/domain/vastu";
import {
  appendBirthInstantParams,
  appendInstantParams,
  instantCacheKey,
  type InstantQuery,
} from "@/lib/instant-query";

// Shared with the other app — see packages/api-client.
import type {
  LocationParams,
  JanmaRashi,
  RashifalPersonal,
  CivilTimelineSeg,
  CivilTimelineBand,
  CivilTimelineHora,
  CivilTimelineLagna,
  TropicalSeasonBoundary,
  VimshottariResponse,
  GocharNextEntry,
  VedicStarPosition,
  GrahaVakriEvent,
  SunYearMonth,
  SaitResponse,
  SaitPersonalizeResponse,
  SaitMonthAllResponse,
  ElementSpansResponse,
  SpecialMonthsResponse,
  ShadbalaStatus,
  ShadbalaBreakdown,
  ShadbalaSubBalas,
  ShadbalaSummaryRef,
  VargaCharts,
  AshtakavargaData,
  BhavaBalaData,
  YuddhaData,
  KundaliYoga,
  YogaReferenceResponse,
  BhavaReferencePayload,
  JanmaAvakahadaData,
  KundaliBirthMeta,
  DashaTreeNode,
  DashaTreeResponse,
  UpagrahaDetailRow,
  VimshopakaData,
  GrahaShantiRecommendation,
  DashaSystem,
  KundaliMilanResponse,
  ReportRecord,
  LagnaSpan,
  RashiSpan,
  NakshatraPadaSpan,
  BalamBlock,
  NavataraTone,
  NavataraTableBlock,
  RashifalPeriod,
  RashifalComponent,
  RashifalDomain,
  RashifalGocharRow,
  RashifalLordBlock,
  RashifalHoraWindow,
  RashifalDayMarker,
  RashifalFrame,
  ApiHoraSlot,
  UdayaLagnaRow,
  MuhurtaNowBlock,
  PlanetInfo,
  Festival,
  LunarLayer,
  Holiday,
  ConvertAdToBs,
  ConvertBsToAd,
  VastuSketchRequest,
  VastuAyadi,
} from "@vedic-patro/api-client";
export type {
  LocationParams,
  JanmaRashi,
  RashifalDashaPeriod,
  RashifalDasha,
  RashifalPersonal,
  CivilTimelineSeg,
  CivilTimelineBand,
  CivilTimelineHora,
  CivilTimelineLagna,
  TropicalSeasonBoundary,
  VimshottariPeriod,
  VimshottariResponse,
  GocharNextEntry,
  VedicStarPosition,
  GrahaVakriEvent,
  SunYearDay,
  SunYearMonth,
  SaitMonthEntry,
  SaitResponse,
  BratabandhaNakshatraMode,
  SaitSuitability,
  SaitShuddhiTone,
  SaitShuddhiPlanet,
  SaitShuddhi,
  SaitKumbha,
  SaitAgniMukha,
  SaitAnnaMonth,
  SaitPersonalizeDay,
  SaitPersonalizeResponse,
  SaitMonthAllResponse,
  ElementKind,
  ElementStamp,
  ElementSpan,
  ElementSpansResponse,
  SpecialMonthsResponse,
  ShadbalaStatus,
  ShadbalaBreakdown,
  ShadbalaSubBalas,
  ShadbalaSummaryRef,
  DmsParts,
  GrahaRelation,
  GrahaDignity,
  VargaChartEntry,
  VargaCharts,
  AshtakavargaSignRow,
  ShodhyaPindaRow,
  AshtakavargaData,
  BhavaBalaHouse,
  BhavaBalaData,
  YuddhaWar,
  YuddhaData,
  KundaliYoga,
  YogaReferenceEntry,
  YogaReferenceResponse,
  BhavaReferenceGrahaDrishti,
  BhavaReferenceHouseInfo,
  BhavaReferenceHouseDetail,
  BhavaReferenceGrahaKarakatva,
  BhavaReferenceRating,
  BhavaReferenceHouseSaravaliEntry,
  BhavaReferenceHouseSaravali,
  BhavaReferenceYuti,
  BhavaReferenceNaadiSutra,
  BhavaReferenceBhaveshEntry,
  BhavaReferenceBhaveshSupplementaryEntry,
  BhavaReferenceLalKitabYuti,
  BhavaReferencePhaladeepikaKarakatva,
  BhavaReferenceDusthaSusthaRule,
  BhavaReferenceRashiClassification,
  BhavaReferenceExaltationDebilitation,
  BhavaReferenceNaturalFriendship,
  BhavaReferenceGrahaAnimalBird,
  BhavaReferenceGrahaGrainMetalTaste,
  BhavaReferenceGrahaRemedy,
  BhavaReferencePayload,
  BilingualValue,
  JanmaAvakahadaData,
  GhadiPalaVipala,
  KundaliBirthMeta,
  DashaTreeNode,
  DashaTreeResponse,
  UpagrahaDetailRow,
  VimshopakaGrade,
  VimshopakaClassification,
  VimshopakaPlanet,
  VimshopakaData,
  GrahaShantiRemedy,
  GrahaShantiTier,
  GrahaShantiFinding,
  GrahaShantiRecommendation,
  DashaSystem,
  KutaId,
  KutaRow,
  MilanDoshaRow,
  AshtakutaResult,
  MilanPerson,
  KundaliMilanResponse,
  ReportConfidence,
  ReportItem,
  ReportSection,
  ReportRashiRef,
  ReportMeta,
  ReportHeader,
  ReportRecord,
  PushkaraNavamshaHit,
  LagnaSpan,
  RashiSpan,
  NakshatraPadaSpan,
  BalamChip,
  BalamTill,
  BalamBlock,
  NavataraTone,
  NavataraRow,
  NavataraTableBlock,
  RashifalPeriod,
  RashifalDomainKey,
  RashifalComponent,
  RashifalDomain,
  RashifalGocharRow,
  RashifalLordBlock,
  RashifalHoraWindow,
  RashifalDayMarker,
  RashifalFrame,
  ApiHoraSlot,
  UdayaLagnaRow,
  MuhurtaNowBlock,
  PlanetInfo,
  Festival,
  LunarLayer,
  Holiday,
  ConvertAdToBs,
  ConvertBsToAd,
  VastuSketchRequest,
  VastuAyadi,
} from "@vedic-patro/api-client";

export {
  patroCapabilitiesKey,
  specialMonthsKeys,
  bhavaReferenceKeys,
  dashaExpandKeys,
  RASHIFAL_PERIODS,
  RASHIFAL_DOMAINS,
} from "@vedic-patro/api-client";

const extra = Constants.expoConfig?.extra ?? {};
// Canonical host (www) — the apex `vedicpatro.com` 301-redirects to www, which
// native fetch follows silently but the browser blocks on cross-origin (the
// redirect carries no CORS header). Hitting www directly avoids the hop.
const CONFIGURED_API_BASE = (extra.apiBaseUrl as string) ?? "https://www.vedicpatro.com/api";
// On the *web* build in dev, the production API sends no CORS headers, so a
// cross-origin browser fetch is blocked. Route through the same-origin `/api`
// Metro dev proxy instead (see metro.config.js). Native and web-production hit
// the real host directly.
export const API_BASE =
  Platform.OS === "web" && __DEV__ ? "/api" : CONFIGURED_API_BASE;
export const API_VERSION = (extra.apiVersion as string) ?? "v1";
export const DATA_BASE = `${API_BASE}/${API_VERSION}`;
// Keep in step with CACHE_PAYLOAD_VERSION. Prefer GET /meta/capabilities
// `cache_payload_version` at runtime; this is the bootstrap until that lands.
export const PANCHANGA_CACHE_VERSION = "4703";
export const SAIT_CACHE_VERSION = "14";

export interface PatroApiLimits {
  signed_year_min: number;
  signed_year_max: number;
  ephemeris_signed_min: number;
  ephemeris_signed_max: number;
  ad_year_min: number;
  ad_year_max: number;
  bc_year_min: number;
  bc_year_max: number;
  bbs_url_year_max: number;
  festival_stack_min_year: number;
  cache_payload_version?: number;
  /** Widest BS-year window a client may download for offline use. */
  offline_max_span_years?: number;
}

/** Host-owned year bounds and cache version — not mirrored in the client. */
export const fetchPatroCapabilities = async (): Promise<PatroApiLimits> => {
  const res = await fetch(`${API_BASE}/meta/capabilities`);
  if (!res.ok) throw new Error(`API ${res.status}: /meta/capabilities`);
  return res.json();
};

export interface RashifalSignBlock {
  index: number;
  id: number;
  name: string;
  name_en: string;
  title_en: string;
  syllables_ne: string;
  score: number;
  percent: number;
  stars: number;
  tone?: NavataraTone;
  grade?: "full" | "medium" | "small" | "nil";
  grade_ne?: string;
  grade_en?: string;
  mean_score?: number;
  tara?: string;
  quality?: string;
  tara_num?: number;
  house_from_moon?: number;
  moorti?: string;
  moorti_ne?: string;
  moorti_en?: string;
  lucky_lord?: string;
  lucky_lord_ne?: string;
  lucky_lord_en?: string;
  lucky_color_ne: string;
  lucky_color_en: string;
  lucky_number_ne: string;
  lucky_number_en: string;
  lucky_direction_ne?: string;
  lucky_direction_en?: string;
  lucky_time?: RashifalHoraWindow | null;
  rashi_lord?: RashifalLordBlock;
  components?: RashifalComponent[];
  domains?: RashifalDomain[];
  gochar?: RashifalGocharRow[];
  ashtakavarga?: { score: number; sav: number; sav_trikona: number; sav_kendra: number };
  cycle?: { score: number; graha: string; graha_ne: string; graha_en: string; house: number };
  days_in_period?: number;
  best_day?: RashifalDayMarker;
  weak_day?: RashifalDayMarker;
  remedy_ne?: string;
  remedy_en?: string;
  prediction_ne: string;
  prediction_en: string;
}

export interface RashifalBlock {
  period: RashifalPeriod;
  anchor?: string;
  method?: Record<string, unknown>;
  moon_index?: number;
  moon_label?: string;
  moon_label_en?: string;
  signs: RashifalSignBlock[];
  frame?: RashifalFrame;
  ingress?: unknown[];
  range_start_ad?: string;
  range_end_ad?: string;
  bs_year?: number;
  bs_month?: number;
  bs_month_name_ne?: string;
  bs_month_name_en?: string;
  days_computed?: number;
}

export interface NivasShoolDirection {
  direction_ne?: string;
  direction_en?: string;
}

export interface NivasShoolSegment extends NivasShoolDirection {
  key?: string;
  symbol?: string;
  name_en?: string;
  name_ne?: string;
  subtitle_en?: string;
  subtitle_ne?: string;
  is_auspicious?: boolean;
  end_local_time_short?: string;
  until_full_night?: boolean;
  till_full_night?: boolean;
  start_local_time_short?: string;
  loka?: string;
}

export interface NivasShoolBlock {
  homahuti?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  disha_shool?: NivasShoolDirection & { auspicious_directions?: NivasShoolDirection[] };
  rahu_vasa?: NivasShoolDirection;
  agnivasa?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  shivavasa?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  chandra_vasa?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
  bhadravasa?: { active?: boolean; segments?: NivasShoolSegment[] };
  kumbha_chakra?: { current?: NivasShoolSegment; segments?: NivasShoolSegment[] };
}

export interface PanchakaSegment {
  name?: string;
  name_ne?: string;
  good?: boolean;
  start_local_time_short?: string;
  end_local_time_short?: string;
  start_local_time?: string;
  end_local_time?: string;
  start_hours_clock?: string;
  end_hours_clock?: string;
  label_ne?: string;
  label_en?: string;
}

export const DEFAULT_LOCATION: LocationParams = {
  city_id: 1283240,
  timezone: "Asia/Kathmandu",
};

function appendLocation(path: string, location?: LocationParams): string {
  const loc = location ?? DEFAULT_LOCATION;
  const params = new URLSearchParams();
  if (loc.city_id != null) params.set("city_id", String(loc.city_id));
  if (loc.lat != null) params.set("lat", String(loc.lat));
  if (loc.lon != null) params.set("lon", String(loc.lon));
  if (loc.timezone) params.set("timezone", loc.timezone);
  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

function withCache(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}cv=${PANCHANGA_CACHE_VERSION}`;
}

function withSaitCache(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}sv=${SAIT_CACHE_VERSION}`;
}

// Every public read goes through here, so a response saved by the offline
// download (lib/offline) answers the same request when there is no network.
async function get<T>(path: string): Promise<T> {
  return offlineAwareGet<T>(
    path,
    () => fetch(`${DATA_BASE}${path}`),
    (res) => new Error(`API ${res.status}: ${path}`),
  );
}

export interface CalendarDayAnga {
  name?: string;
  name_ne?: string;
  end?: string;
  end_local_time?: string;
  end_hours_clock?: string;
}

export type PatroSolarCorrection = {
  minutes?: number;
  seconds?: number;
  sign?: "dhan" | "rin";
  sign_ne?: string;
  label_ne?: string;
  name_ne?: string;
};

export interface CalendarDayDetail {
  paksha?: string;
  paksha_ne?: string;
  aayan?: string;
  aayan_ne?: string;
  ayana_mark?: "उ" | "द";
  tithi?: CalendarDayAnga;
  nakshatra?: CalendarDayAnga;
  yoga?: CalendarDayAnga;
  karana?: CalendarDayAnga;
  surya_rashi?: string;
  surya_rashi_ne?: string;
  chandra_rashi?: string;
  chandra_rashi_ne?: string;
  chandra_rashi_spans?: RashiSpan[];
  ritu_ne?: string;
  sun?: { sunrise?: string; sunset?: string; noon?: string };
  moon?: { rise?: string; set?: string };
  dinamaan?: string;
  lunar_month?: LunarLayer & { name_ne?: string };
  udaya_lagna?: Array<{ rashi?: string; rashi_ne?: string; name_en?: string; name_ne?: string }>;
  lagna_spans?: LagnaSpan[];
  planets?: Record<string, PlanetInfo>;
  planets_anchor?: {
    type?: string;
    local_time?: string;
    label_ne?: string;
    label_en?: string;
  };
  jd_ut?: number;
  solar_corrections?: {
    belaantar?: PatroSolarCorrection;
    deshaantar?: PatroSolarCorrection;
    akshamsha?: PatroSolarCorrection;
    ishtakaal_note_ne?: string;
    ishtakaal_note_en?: string;
    sunrise_includes_corrections?: boolean;
  };
  lunar_calendar?: {
    adhik_maas?: { year_has_adhik?: boolean; name?: string; name_ne?: string };
    amanta?: LunarLayer;
    purnimant?: LunarLayer;
    festival_masa?: string;
  };
}

export interface CalendarDay {
  day: number;
  date_ad: string;
  weekday: string;
  weekday_en?: string;
  weekday_ne?: string;
  tithi: string;
  tithi_ne?: string;
  nakshatra?: string;
  nakshatra_ne?: string;
  paksha?: string;
  paksha_ne?: string;
  yoga?: string;
  yoga_ne?: string;
  karana?: string;
  karana_ne?: string;
  chandra_rashi?: string;
  chandra_rashi_ne?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  festivals: string[];
  is_public_holiday?: boolean;
  outsideMonth?: boolean;
  panchanga?: CalendarDayDetail;
  abhijit?: {
    start_time?: string;
    end_time?: string;
    solar_noon?: string;
    is_auspicious?: boolean;
  };
}

export interface MonthCalendar {
  year_bs: number;
  month_bs: number;
  calendar: CalendarDay[];
  month_length?: number;
  first_weekday?: number;
  limits?: PatroApiLimits;
}

type PanchangaAnga = {
  name?: string;
  name_ne?: string;
  end_local_time?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
  next?: PanchangaAnga;
};

type PlanetBlock = {
  longitude?: number;
  rashi?: number;
  rashi_name?: string;
  rashi_ne?: string;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
};

type SolarCorrection = {
  minutes?: number;
  seconds?: number;
  sign?: "dhan" | "rin";
  sign_ne?: string;
};

/** One day in one era. `year` is always >= 1 — the era carries the sign. */
export type EraDateSpelling = {
  era: import("@/lib/patro-era").PatroBrowseEra | string;
  year: number;
  month: number;
  day: number;
};

/** Backend era-correct rendering of a civil day (vikram + gregorian for the same JD). */
export type EraDateParts = EraDateSpelling & {
  jd: number;
  vikram: EraDateSpelling;
  gregorian: EraDateSpelling;
};

export interface PanchangaDay {
  mode?: "ephemeris" | "udaya";
  date_bs?: string;
  date_ad?: string;
  panchanga_date_ad?: string;
  /** Local wall-clock instant used for ephemeris queries, e.g. "2026-07-22 14:30". */
  query_instant_local?: string;
  before_sunrise_of_civil_day?: boolean;
  weekday?: string;
  location?: { name?: string; city_id?: number; lat?: number; lon?: number; timezone?: string };
  lagna?: { name?: string; name_ne?: string; degree_in_rashi?: number; longitude?: number };
  lagna_spans?: LagnaSpan[];
  chandra_rashi?: { name_ne?: string; number?: number; name?: string } | string;
  chandra_rashi_spans?: RashiSpan[];
  nakshatra_pada_spans?: NakshatraPadaSpan[];
  muhurta_now?: {
    rahu_kalam?: MuhurtaNowBlock;
    yamaganda?: MuhurtaNowBlock;
    gulika?: MuhurtaNowBlock;
    abhijit?: MuhurtaNowBlock;
  };
  tithi?: PanchangaAnga;
  nakshatra?: PanchangaAnga;
  yoga?: PanchangaAnga;
  karana?: PanchangaAnga;
  paksha?: { label_ne?: string; label_en?: string };
  paksha_ne?: string;
  sunrise?: { local_time_short?: string } | string;
  sunset?: { local_time_short?: string } | string;
  moonrise?: { local?: string; local_time_short?: string };
  moonset?: { local?: string; local_time_short?: string };
  sun?: { sunrise?: string; sunset?: string };
  moon?: { rise?: string; set?: string };
  ritu?: { name?: string; name_ne?: string; season?: string } | string;
  ritu_ne?: string;
  planets?: Record<string, PlanetBlock | string>;
  planets_anchor?: { type?: string; label_ne?: string; label_en?: string; local_time?: string };
  solar_corrections?: {
    belaantar?: SolarCorrection;
    deshaantar?: SolarCorrection;
  };
  tarabala_table?: NavataraTableBlock;
  chandrabala_table?: NavataraTableBlock;
  hora?: ApiHoraSlot[];
  hora_day?: ApiHoraSlot[];
  udaya_lagna?: UdayaLagnaRow[];
  samvatsara?: {
    key?: string;
    name_ne?: string;
    name_en?: string;
    cycle?: number;
    deity?: string;
    index?: number;
  };
  festivals?: Array<{
    id?: string;
    name?: string;
    name_ne?: string;
    name_en?: string;
    is_public_holiday?: boolean;
    bs_start_date?: string;
    start_date?: string;
  }>;
  is_public_holiday?: boolean;
  bs_date?: { year: number; month: number; day: number; month_name_ne?: string };
  date_parts?: EraDateParts;
  detail?: {
    tithi?: PanchangaAnga;
    nakshatra?: PanchangaAnga;
    yoga?: PanchangaAnga;
    karana?: PanchangaAnga;
    sunrise?: { local_time_short?: string };
    sunset?: { local_time_short?: string };
    moonrise?: { local?: string; local_time_short?: string };
    moonset?: { local?: string; local_time_short?: string };
    planets?: Record<string, PlanetBlock | string>;
    planets_anchor?: { type?: string };
    solar_corrections?: {
      belaantar?: SolarCorrection;
      deshaantar?: SolarCorrection;
    };
    muhurta?: PanchangaDay["muhurta"];
    ritu?: { name?: string; name_ne?: string; season?: string };
    ritu_pauranik?: { name?: string; name_ne?: string; season?: string };
    choghadiya?: Array<{ name_ne: string; start_g: number; end_g: number; bad?: boolean }>;
    hora?: ApiHoraSlot[];
    hora_day?: ApiHoraSlot[];
    tarabala_table?: NavataraTableBlock;
    chandrabala_table?: NavataraTableBlock;
    udaya_lagna?: UdayaLagnaRow[];
    lagna_spans?: LagnaSpan[];
    day_ghati?: number;
    vaara?: { name_ne?: string; name_english?: string; number?: number };
    paksha?: { name?: string; label_ne?: string; label_en?: string };
    weekday?: { name_ne?: string; name_english?: string };
    muhurta_now?: PanchangaDay["muhurta_now"];
    instant_lagna?: PanchangaDay["lagna"];
    nivas_shool?: NivasShoolBlock;
    chandrabalam?: BalamBlock;
    tarabalam?: BalamBlock;
    panchaka_rahita?: PanchakaSegment[];
    chandra_rashi?: PanchangaDay["chandra_rashi"];
    lagna?: PanchangaDay["lagna"];
  };
  muhurta?: {
    rahu_kalam?: { start_time?: string; end_time?: string };
    abhijit?: { start_time?: string; end_time?: string; solar_noon?: string; is_auspicious?: boolean };
    yamaganda?: { start_time?: string; end_time?: string };
    gulika?: { start_time?: string; end_time?: string };
    inauspicious_timings?: Array<{
      key?: string;
      name_ne?: string;
      name_en?: string;
      segments?: Array<{
        start_local_time_short?: string;
        end_local_time_short?: string;
        until_full_night?: boolean;
      }>;
    }>;
  };
  display?: { bs_ne?: string; gregorian_en?: string; ns_ne?: string };
  nivas_shool?: NivasShoolBlock;
  surya_rashi?: { name?: string; name_ne?: string };
  surya_rashi_ne?: string;
  surya_nakshatra?: { name?: string; name_ne?: string };
  chandra_balam?: BalamBlock | unknown;
  chandrabalam?: BalamBlock;
  tara_balam?: BalamBlock | unknown;
  tarabalam?: BalamBlock;
  panchaka?: unknown;
  panchaka_rahita?: PanchakaSegment[];
  din_vishesh?: unknown;
}

export interface HolidaysResponse {
  bs_year?: number;
  era?: string;
  gregorian_range?: { start: string; end: string };
  count: number;
  holidays: Holiday[];
}

export interface FestivalsResponse {
  bs_year?: number;
  era?: string;
  gregorian_range?: { start: string; end: string };
  count: number;
  festivals: Festival[];
}

export interface CivilTimeline {
  anchor: "civil";
  date_ad: string;
  sunrise_min: number;
  sunset_min: number | null;
  moonrise_min: number | null;
  moonset_min: number | null;
  weekday_ne?: string | null;
  weekday_en?: string | null;
  paksha_ne?: string | null;
  rows: {
    tithi: CivilTimelineSeg[];
    nakshatra: CivilTimelineSeg[];
    yoga: CivilTimelineSeg[];
    karana: CivilTimelineSeg[];
  };
  choghadiya: CivilTimelineBand[];
  hora: CivilTimelineHora[];
  lagna: CivilTimelineLagna[];
  planets?: PanchangaDay["planets"];
  planets_anchor?: unknown;
}

export interface City {
  id: number;
  name: string;
  ascii_name: string;
  lat: number;
  lon: number;
  country: string;
  population: number;
  timezone: string;
  admin1?: string | null;
  admin1_name?: string | null;
  local?: boolean;
}

export interface CitiesSearchResponse {
  query: string;
  count: number;
  cities: City[];
}

export interface NearestCityResponse {
  lat: number;
  lon: number;
  city: City;
}

export const cityKeys = {
  search: (q: string, country?: string) => ["cities", "search", q, country ?? "all"] as const,
};

export const searchCities = (q: string, limit = 15, country?: string) => {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (country) params.set("country", country);
  return get<CitiesSearchResponse>(`/nepal/cities/search?${params.toString()}`);
};

export const fetchNearestCity = (lat: number, lon: number, country?: string) => {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (country) params.set("country", country);
  return get<NearestCityResponse>(`/nepal/cities/nearest?${params.toString()}`);
};

function locationKey(loc?: LocationParams): string {
  const l = loc ?? DEFAULT_LOCATION;
  return [l.city_id, l.lat, l.lon, l.timezone].join(":");
}

export function locationCacheKey(location?: LocationParams): string {
  return locationKey(location);
}

export const panchangaKeys = {
  today: (loc?: LocationParams) => ["panchanga", "today", locationKey(loc)] as const,
  day: (date: string, era: string, loc?: LocationParams) =>
    ["panchanga", "day", PANCHANGA_CACHE_VERSION, date, era, locationKey(loc)] as const,
  atTime: (datetime: string, loc?: LocationParams) =>
    ["panchanga", "at-time", PANCHANGA_CACHE_VERSION, datetime, locationKey(loc)] as const,
  civil: (date: string, loc?: LocationParams) =>
    ["panchanga", "civil", PANCHANGA_CACHE_VERSION, date, locationKey(loc)] as const,
};

export type MonthBrowseEra = import("@/lib/patro-era").PatroBrowseEra;

function languageForBrowseEra(era: MonthBrowseEra): "en" | "ne" {
  return era === "ad" || era === "bc" ? "en" : "ne";
}

export const apiKeys = {
  month: (y: number, m: number, loc?: LocationParams, era: MonthBrowseEra = "bs") =>
    ["month", era, y, m, locationKey(loc)] as const,
  panchanga: (date: string, era: string, loc?: LocationParams) =>
    ["panchanga", date, era, locationKey(loc)] as const,
  today: (loc?: LocationParams) => ["panchanga", "today", locationKey(loc)] as const,
  holidays: (year: number) => ["holidays", year] as const,
  convertAd: (d: string) => ["convert", "ad", d] as const,
  convertBs: (d: string) => ["convert", "bs", d] as const,
  saitMonthAll: (y: number, m: number, loc?: LocationParams) =>
    ["sait", "month-all", SAIT_CACHE_VERSION, y, m, locationKey(loc)] as const,
  festivals: (year: number, language: "ne" | "en" = "ne") =>
    ["festivals", "bs", year, language] as const,
};

export const fetchMonthCalendar = async (
  year: number,
  month: number,
  location?: LocationParams,
  options?: { era?: MonthBrowseEra },
): Promise<MonthCalendar> => {
  const era = options?.era ?? "bs";
  const language = languageForBrowseEra(era);
  const base =
    era === "ad"
      ? `/panchanga/ad/${year}/${month}`
      : era === "bc"
        ? `/panchanga/bc/${year}/${month}`
        : `/panchanga/${year}/${month}`;
  const data = await get<MonthCalendar>(
    appendLocation(withCache(`${base}?full=true&era=${era}&language=${language}`), location),
  );
  return {
    ...data,
    calendar: data.calendar.map(normalizeMonthDay),
  };
};

function normalizeMonthDay(day: CalendarDay): CalendarDay {
  const nested = day.panchanga;
  const nestedRashi =
    typeof nested?.chandra_rashi === "object"
      ? {
          en: (nested.chandra_rashi as { name?: string }).name,
          ne: (nested.chandra_rashi as { name_ne?: string }).name_ne ?? nested.chandra_rashi_ne,
        }
      : {
          en: typeof nested?.chandra_rashi === "string" ? nested.chandra_rashi : undefined,
          ne: nested?.chandra_rashi_ne,
        };

  return {
    ...day,
    nakshatra: day.nakshatra ?? nested?.nakshatra?.name,
    nakshatra_ne: day.nakshatra_ne ?? nested?.nakshatra?.name_ne,
    yoga: day.yoga ?? nested?.yoga?.name,
    yoga_ne: day.yoga_ne ?? nested?.yoga?.name_ne,
    karana: day.karana ?? nested?.karana?.name,
    karana_ne: day.karana_ne ?? nested?.karana?.name_ne,
    moonrise: day.moonrise ?? nested?.moon?.rise,
    moonset: day.moonset ?? nested?.moon?.set,
    chandra_rashi: day.chandra_rashi ?? nestedRashi.en,
    chandra_rashi_ne: day.chandra_rashi_ne ?? nestedRashi.ne,
  };
}

/** One BS month's metadata in the year-wheel payload (no per-day grid). */
export interface YearWheelMonth {
  year_bs: number;
  month_bs: number;
  month_name?: string;
  month_name_ne?: string;
  month_start_ad?: string;
  month_length: number;
  first_weekday?: number;
  limits?: PatroApiLimits;
}

/** One day of the year-wheel payload — the trimmed wheel state, nothing else. */
export interface YearWheelCalendarDay {
  day: number;
  date_ad: string;
  sunrise?: string;
  sunset?: string;
  panchanga?: PanchangaDay;
}

/**
 * A whole BS year of wheel state in one response. `wheel=true` trims each day to
 * what the wheel actually draws (angas, planets, lagna, rashi spans) and drops
 * the duplicated per-day month grids — the difference between ~2 MB and ~20 MB.
 */
export interface YearWheelCalendar {
  year_bs: number;
  year_length: number;
  location?: PanchangaDay["location"];
  months: YearWheelMonth[];
  calendar: YearWheelCalendarDay[];
}

export const yearWheelKeys = {
  year: (year: number, loc?: LocationParams) =>
    ["panchanga", "year-wheel", PANCHANGA_CACHE_VERSION, year, locationKey(loc)] as const,
};

export const yearWheelRequestPath = (year: number, location?: LocationParams) =>
  appendLocation(withCache(`/panchanga/year/${year}?wheel=true&era=bs`), location);

export const fetchYearWheelCalendar = (year: number, location?: LocationParams) =>
  get<YearWheelCalendar>(yearWheelRequestPath(year, location));

export const fetchPanchanga = (date: string, era: "bs" | "ad" = "bs", location?: LocationParams) =>
  get<PanchangaDay>(
    appendLocation(
      withCache(`/panchanga/${date}?era=${era}&festivals=true&detail=true`),
      location,
    ),
  );

export const fetchTodayPanchanga = (location?: LocationParams) => {
  const today = new Date().toISOString().split("T")[0];
  return get<PanchangaDay>(
    appendLocation(
      withCache(`/panchanga/${today}?era=ad&festivals=true&detail=true`),
      location,
    ),
  );
};

export const fetchPanchangaAtTime = (
  datetime: string,
  location?: LocationParams,
  options?: { ayanamsha?: string },
) => {
  const params = new URLSearchParams();
  params.set("datetime", datetime);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  return get<PanchangaDay>(
    appendLocation(withCache(`/panchanga/at-time?${params.toString()}`), location),
  );
};

export const fetchCivilTimeline = (date: string, era: "bs" | "ad" = "ad", location?: LocationParams) =>
  get<{ civil_timeline: CivilTimeline }>(
    appendLocation(withCache(`/panchanga/${date}?era=${era}&detail=false&civil=true`), location),
  ).then((r) => r.civil_timeline);

export const fetchHolidays = (year: number) =>
  get<HolidaysResponse>(withCache(`/nepal/holidays?year=${year}&era=bs`));

export const fetchFestivals = (year: number, language: "ne" | "en" = "ne") =>
  get<FestivalsResponse>(
    withCache(`/nepal/festivals?year=${year}&era=bs&language=${language}`),
  );

// ─── Rashifal ────────────────────────────────────────────────────────────────

export const rashifalKeys = {
  block: (dateAd: string, period: RashifalPeriod, loc?: LocationParams) =>
    ["rashifal", PANCHANGA_CACHE_VERSION, dateAd, period, locationKey(loc)] as const,
  personal: (
    dateAd: string,
    period: RashifalPeriod,
    profileId: string,
    loc?: LocationParams,
    birthKey?: string,
  ) =>
    [
      "rashifal",
      "personal",
      PANCHANGA_CACHE_VERSION,
      dateAd,
      period,
      profileId,
      birthKey ?? "",
      locationKey(loc),
    ] as const,
};

export function fetchRashifal(
  dateAd: string,
  period: RashifalPeriod,
  location?: LocationParams,
) {
  // `date` is an AD civil date. Without an explicit era the API reads it as BS
  // (era defaults to bs), which silently returns a rashifal ~57 years off.
  const params = new URLSearchParams({ date: dateAd, era: "ad", period });
  return get<RashifalBlock>(
    appendLocation(withCache(`/panchanga/rashifal?${params.toString()}`), location),
  );
}

export function fetchPersonalRashifal(
  dateAd: string,
  period: RashifalPeriod,
  birth: { moment: InstantQuery; birthLat: number; birthLon: number; birthTz: string },
  location?: LocationParams,
) {
  const params = new URLSearchParams({
    date: dateAd,
    era: "ad",
    period,
    birth_lat: String(birth.birthLat),
    birth_lon: String(birth.birthLon),
    birth_tz: birth.birthTz,
  });
  appendBirthInstantParams(params, birth.moment);
  return get<RashifalPersonal>(
    appendLocation(withCache(`/panchanga/rashifal/personal?${params.toString()}`), location),
  );
}

export interface GocharIngressEvent {
  graha: string;
  graha_ne: string;
  level: string;
  to_rashi?: string;
  to_rashi_ne?: string;
  from_rashi?: string;
  from_rashi_ne?: string;
  to_nakshatra?: string;
  to_nakshatra_ne?: string;
  to_pada?: number;
  to_pada_ne?: string;
  label_ne?: string;
  entry_time_local: string;
  entry_time_local_short?: string;
  entry_time_utc?: string;
  entry_date_ad?: string;
  /** Vedic day (sunrise–sunrise) civil date — patro गते row key. */
  entry_vedic_date_ad?: string;
  /** BS patro date key when the civil AD fields are omitted (BCE / JD path). */
  entry_jd_date?: string;
  entry_vedic_jd_date?: string;
  entry_jd?: number;
  entry_vedic_jd?: number;
  event?: "udaya" | "asta";
  hemisphere?: "east" | "west";
  motion_ne?: string;
}

export interface GocharIngressResponse {
  from_date_ad: string;
  to_date_ad: string;
  level: string;
  location?: Record<string, unknown>;
  events: GocharIngressEvent[];
}

export interface GocharGraha {
  name_ne: string;
  name_vedic?: string;
  symbol: string;
  rashi?: string;
  rashi_ne?: string;
  rashi_no?: number;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
  dms_absolute?: string;
  longitude?: number;
  speed_deg_day?: number;
  motion?: string;
  is_retrograde?: boolean;
  /** अस्त — combust (within the Sun's combustion orb). */
  is_combust?: boolean;
  next_rashi_entry?: GocharNextEntry | null;
  next_nakshatra_entry?: GocharNextEntry | null;
  next_pada_entry?: GocharNextEntry | null;
  nakshatra?: string;
  nakshatra_ne?: string;
  nakshatra_no?: number;
  nakshatra_lord?: string;
  nakshatra_lord_ne?: string;
  nakshatra_lord_en?: string;
  sub_lord?: string;
  sub_lord_ne?: string;
  sub_lord_en?: string;
  pada?: number;
  is_exalted?: boolean;
}

export interface GocharResponse {
  date_ad: string;
  date_bs?: string;
  /**
   * The frame the longitudes below are sidereal in — where the start of मेष
   * stands against the equinox on this date. Optional: older cached responses
   * predate the field.
   */
  ayanamsa?: { name: string; degrees: number };
  gochar: Record<string, GocharGraha>;
  /** Optional: older cached responses predate the field. */
  vedic_stars?: VedicStarPosition[];
}

export const gocharKeys = {
  day: (date: string, era: string, location?: LocationParams) =>
    ["gochar", date, era, locationCacheKey(location)] as const,
  ingress: (
    from: string,
    to: string,
    level: string,
    location?: LocationParams,
  ) => ["gochar", "ingress", from, to, level, locationCacheKey(location)] as const,
};

export const fetchGochar = (date: string, era: "bs" | "ad" = "ad", location?: LocationParams) =>
  get<GocharResponse>(appendLocation(`/nepal/gochar/${date}?era=${era}`, location));

export const fetchGocharIngress = (
  from: string,
  to: string,
  location?: LocationParams,
  options?: { level?: "pada" | "nakshatra" | "rashi" | "patro" | "udayast"; era?: "bs" | "ad" },
) => {
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);
  params.set("era", options?.era ?? "ad");
  params.set("level", options?.level ?? "pada");
  return get<GocharIngressResponse>(
    appendLocation(`/nepal/gochar/ingress?${params.toString()}`, location),
  );
};

export const fetchSpecialMonths = (year: number) =>
  get<SpecialMonthsResponse>(`/nepal/special-months/${year}`);

export const fetchSaitMonthAll = async (
  year: number,
  month: number,
  location?: LocationParams,
): Promise<SaitMonthAllResponse> => {
  const data = await get<SaitMonthAllResponse>(
    withSaitCache(appendLocation(`/nepal/sait/${year}/month/${month}`, location)),
  );
  if (!data?.categories || typeof data.categories !== "object") {
    throw new Error(`Invalid sait response for ${year}/${month}`);
  }
  return data;
};

export const fetchAdToBs = (date: string) => get<ConvertAdToBs>(`/convert/ad-to-bs/${date}`);
export const fetchBsToAd = (date: string) => get<ConvertBsToAd>(`/convert/bs-to-ad/${date}`);

// ─── Graha, elements, seasons, sait detail (extended API) ───────────────────

const GRAHA_CACHE_VERSION = "3";

function buildEraQuery(
  era: import("@/lib/patro-era").PatroBrowseEra = "bs",
  year?: number,
): string {
  const language = era === "ad" || era === "bc" ? "en" : "ne";
  const params = new URLSearchParams({ era, language });
  if (year != null) params.set("year", String(year));
  return params.toString();
}

function withGrahaCache(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}gv=${GRAHA_CACHE_VERSION}`;
}

export interface GrahaSthitiRow {
  graha: string;
  name_ne: string;
  name_vedic?: string;
  symbol: string;
  /** `21° कन्या 53′ 14″` — degree in sign with Nepali rashi name. */
  rekhamsha: string;
  rashi_ne: string;
  nakshatra: string;
  nakshatra_ne: string;
  pada: number;
  pada_ne?: string;
  nakshatra_lord_ne?: string;
  sub_lord_ne?: string;
  full_degree: number;
  /** `04° द. 45′ 02″` — signed ecliptic latitude (शर), north/south. */
  shara?: string;
  shara_deg?: number;
  speed_deg_day: number;
  is_retrograde: boolean;
  is_combust: boolean;
  right_ascension?: number;
  declination?: number;
}

export interface GrahaSthitiResponse {
  date_ad: string;
  date_bs: string;
  timezone?: string;
  sunrise_local?: string;
  rows: GrahaSthitiRow[];
}

/** A localized timestamp for an asta / vakri period boundary. */
export interface AstaStamp {
  iso?: string;
  jd?: number;
  /** Era-rendered day label from {@link jd} (EraMiddleware). */
  date?: string;
  date_ad?: string;
  date_bs?: string | null;
  time_short: string;
}

export interface GrahaAstaPeriod {
  graha: string;
  graha_ne: string;
  start: AstaStamp | null;
  end: AstaStamp | null;
  duration_days: number | null;
  hemisphere?: "east" | "west" | null;
}

export interface GrahaAstaResponse {
  bs_year?: number;
  ad_year?: number;
  gregorian_range?: { start: string; end: string };
  grahas?: string[];
  periods: GrahaAstaPeriod[];
}

export interface GrahaVakriResponse {
  bs_year?: number;
  gregorian_range?: { start: string; end: string };
  grahas?: string[];
  events: GrahaVakriEvent[];
}

export interface EclipseEvent {
  kind?: "solar" | "lunar";
  type?: string;
  type_ne?: string;
  type_en?: string;
  max_utc?: string;
  max_local?: string;
  date_jd_date?: string;
  date_ad?: string;
  date_bs?: string | null;
  visible?: boolean;
  begin_local?: string | null;
  end_local?: string | null;
  penumbral_begin_local?: string | null;
  penumbral_end_local?: string | null;
  /** @deprecated use max_local */
  maximum_time_local_short?: string;
  /** @deprecated use visible boolean */
  visible_ne?: string;
  visible_en?: string;
}

export interface EclipseYearResponse {
  bs_year?: number;
  kind?: "solar" | "lunar";
  gregorian_range?: { start: string; end: string };
  events: EclipseEvent[];
}

export interface PanchakMomentResponse {
  /** Full AD instant with the Nepal offset, e.g. "2026-04-13T04:03:00+05:45". */
  iso: string;
  /** Legacy; prefer `iso`. */
  date_ad?: string;
  bs_year: number;
  bs_month: number;
  bs_day: number;
  time_en: string;
  time_ne: string;
  time_short?: string;
}

export interface PanchakPeriodResponse {
  start: PanchakMomentResponse;
  end: PanchakMomentResponse;
  duration_ne: string;
  duration_en: string;
}

export interface PanchakYearResponse {
  bs_year?: number;
  ad_year?: number;
  count: number;
  gregorian_range?: { start: string; end: string };
  periods: PanchakPeriodResponse[];
}

export interface ElementSpanRange {
  era: "bs" | "ad" | "bbs";
  year: number;
  month: number;
}

export interface ElementDayResponse {
  element: string;
  label_ne: string;
  label_en: string;
  date_ad: string;
  /** Local sunrise for the day — ghati-based rows are anchored to it. */
  sunrise?: string;
  data: unknown;
}

export interface SunYearResponse {
  year_bs: number;
  months: SunYearMonth[];
}

/** @deprecated Legacy shape; API returns {@link TropicalSeasonsResponse.boundaries}. */
export interface TropicalSeasonSegment {
  name_ne?: string;
  name_en?: string;
  start_ad?: string;
  end_ad?: string;
}

export interface TropicalSeasonsResponse {
  timezone?: string;
  latitude?: number;
  southern_hemisphere: boolean;
  boundaries: TropicalSeasonBoundary[];
  /** @deprecated */
  segments?: TropicalSeasonSegment[];
}

export interface SaitDetailDay {
  bs_month: number;
  bs_day: number;
  bs_month_name_ne: string;
  gregorian: string;
  weekday_en: string;
  weekday_ne: string;
  window_start: string;
  window_end: string;
  tithi_num?: number;
  tithi_en: string;
  tithi_ne: string;
  paksha?: string;
  paksha_ne?: string;
  nakshatra_num?: number;
  nakshatra_en: string;
  nakshatra_ne: string;
  yoga_en?: string;
  yoga_ne?: string;
  karana_en?: string;
  karana_ne?: string;
  lagna_en?: string;
  lagna_ne?: string;
  lunar_month_en?: string | null;
  lunar_month_ne?: string | null;
}

export interface SaitDetailResponse {
  bs_year: number;
  category: string;
  category_label_ne: string;
  engine_version?: string;
  days: SaitDetailDay[];
}

export const grahaDetailKeys = {
  sthiti: (dateKey: string, era: string, location?: LocationParams) =>
    ["graha", "sthiti", dateKey, era, locationCacheKey(location)] as const,
  asta: (year: number, location?: LocationParams, era = "bs") =>
    ["graha", "asta", era, year, locationCacheKey(location)] as const,
  vakri: (year: number, location?: LocationParams, era = "bs") =>
    ["graha", "vakri", era, year, locationCacheKey(location)] as const,
  eclipse: (kind: "solar" | "lunar", year: number, location?: LocationParams, era = "bs") =>
    ["graha", "eclipse", kind, era, year, locationCacheKey(location)] as const,
};

export const elementKeys = {
  day: (name: string, date: string, location?: LocationParams) =>
    ["element", "day", name, date, locationCacheKey(location)] as const,
  spans: (name: string, range: ElementSpanRange, location?: LocationParams) =>
    [
      "element",
      "spans",
      name,
      range.era,
      range.year,
      range.month,
      locationCacheKey(location),
    ] as const,
};

export const panchakKeys = {
  year: (year: number, location?: LocationParams, era = "bs") =>
    ["panchak", era, year, locationCacheKey(location)] as const,
};

export const sunTimesKeys = {
  year: (year: number, era: string, location?: LocationParams) =>
    ["sun-times", "year", era, year, locationCacheKey(location)] as const,
};

export const seasonsKeys = {
  tropical: (location?: LocationParams) => ["seasons", "tropical", locationCacheKey(location)] as const,
};

export const saitPersonalizeKey = (
  year: number,
  category: string,
  location: LocationParams | undefined,
  birth: InstantQuery | null,
  birthTz: string,
  gender?: string | null,
) =>
  [
    "sait",
    "personalize",
    SAIT_CACHE_VERSION,
    year,
    category,
    locationCacheKey(location),
    birth ? instantCacheKey(birth) : "",
    birthTz,
    gender ?? "",
  ] as const;

/**
 * A saved profile's janma (birth Moon) rashi — 1..12, matching
 * {@link RashifalSignBlock.id}. Send the stored era + civil parts; the API
 * resolves the instant.
 */
export function fetchJanmaRashi(moment: InstantQuery, birthTz: string) {
  const qs = appendBirthInstantParams(new URLSearchParams({ birth_tz: birthTz }), moment).toString();
  return get<JanmaRashi>(`/panchanga/rashifal/janma?${qs}`);
}

/** Annotate the year's general dates with a native verdict from a birth moment. */
export const fetchSaitPersonalize = (
  year: number,
  category: string,
  location: LocationParams | undefined,
  birth: InstantQuery,
  birthTz: string,
  gender?: string | null,
) => {
  let path = appendLocation(`/nepal/sait/${year}/${category}/personalize`, location);
  const params = appendBirthInstantParams(new URLSearchParams({ birth_tz: birthTz }), birth);
  if (gender) params.set("gender", gender);
  path = `${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
  return get<SaitPersonalizeResponse>(path);
};

/** Normalise an exclude list into a stable comma string (sorted, deduped). */
const saitExcludeParam = (excludeRules?: string[]) =>
  excludeRules && excludeRules.length > 0 ? [...new Set(excludeRules)].sort().join(",") : "";

export const saitKeys = {
  entries: (year: number, category: string, location?: LocationParams) =>
    ["sait", SAIT_CACHE_VERSION, year, category, locationCacheKey(location)] as const,
};

/** Day-level listing for the deterministic (Vās) ceremonies. */
export const fetchSait = (year: number, category: string, location?: LocationParams) =>
  get<SaitResponse>(withSaitCache(appendLocation(`/nepal/sait/${year}/${category}`, location)));

export const saitDetailKey = (
  year: number,
  category: string,
  location?: LocationParams,
  excludeRules?: string[],
  nakshatraMode?: string | null,
) =>
  [
    "sait",
    "detail",
    SAIT_CACHE_VERSION,
    year,
    category,
    locationCacheKey(location),
    saitExcludeParam(excludeRules),
    nakshatraMode && nakshatraMode !== "classical" ? nakshatraMode : "",
  ] as const;

export const fetchGrahaSthiti = (dateKey: string, location?: LocationParams, era: "bs" | "ad" = "ad") =>
  get<GrahaSthitiResponse>(
    appendLocation(withGrahaCache(`/nepal/graha-sthiti/${dateKey}?era=${era}`), location),
  );

export const fetchGrahaAstaYear = (year: number, location?: LocationParams, era: "bs" | "ad" = "bs") =>
  get<GrahaAstaResponse>(
    appendLocation(
      withGrahaCache(`/nepal/graha-asta/year/${year}?${buildEraQuery(era, year)}`),
      location,
    ),
  );

export const fetchGrahaVakriYear = (year: number, location?: LocationParams, era: "bs" | "ad" = "bs") =>
  get<GrahaVakriResponse>(
    appendLocation(
      withGrahaCache(`/nepal/graha-vakri/year/${year}?${buildEraQuery(era, year)}`),
      location,
    ),
  );

export const fetchEclipseYear = (
  kind: "solar" | "lunar",
  year: number,
  location?: LocationParams,
  era: import("@/lib/patro-era").PatroBrowseEra = "bs",
) =>
  get<EclipseYearResponse>(
    appendLocation(
      withGrahaCache(`/nepal/eclipse/${kind}/year/${year}?${buildEraQuery(era, year)}`),
      location,
    ),
  );

export const fetchPanchakYear = (
  year: number,
  location?: LocationParams,
  era: "bs" | "ad" | "bbs" = "bs",
) =>
  get<PanchakYearResponse>(
    appendLocation(`/nepal/panchak/year/${year}?${buildEraQuery(era, year)}`, location),
  );

export const fetchElementDay = (name: string, dateAd: string, location?: LocationParams) =>
  get<ElementDayResponse>(
    appendLocation(withCache(`/panchanga/element/${name}/day/${dateAd}?era=ad`), location),
  );

export const fetchYearSunTimes = (
  year: number,
  era: "bs" | "ad" | "bbs" = "bs",
  location?: LocationParams,
) =>
  get<SunYearResponse>(
    appendLocation(`/panchanga/year/${year}/sun?${buildEraQuery(era, year)}`, location),
  );

/** Span-kind elements (tithi, nakshatra, yoga, karana…) over a whole month. */
export const fetchElementSpans = (
  name: string,
  range: ElementSpanRange,
  location?: LocationParams,
) => {
  // The era middleware turns era + year + month into the JD span server-side.
  const query = new URLSearchParams({
    era: range.era,
    year: String(range.year),
    month: String(range.month),
  });
  return get<ElementSpansResponse>(
    appendLocation(withCache(`/panchanga/element/${name}/spans?${query.toString()}`), location),
  );
};

export const fetchTropicalSeasons = (location?: LocationParams) =>
  get<TropicalSeasonsResponse>(appendLocation("/seasons/tropical", location));

export const fetchSaitDetail = (
  year: number,
  category: string,
  location?: LocationParams,
  excludeRules?: string[],
  nakshatraMode?: string | null,
) => {
  let path = appendLocation(`/nepal/sait/${year}/${category}/detail`, location);
  const params = new URLSearchParams();
  const exclude = saitExcludeParam(excludeRules);
  if (exclude) params.set("exclude", exclude);
  if (nakshatraMode && nakshatraMode !== "classical") params.set("nakshatra_mode", nakshatraMode);
  const qs = params.toString();
  if (qs) path = `${path}${path.includes("?") ? "&" : "?"}${qs}`;
  return get<SaitDetailResponse>(withSaitCache(path));
};

export function timeShort(v: PanchangaDay["sunrise"]): string {
  if (!v) return "—";
  if (typeof v === "string") return v.slice(0, 5);
  return v.local_time_short?.slice(0, 5) ?? "—";
}

export const vimshottariKeys = {
  atTime: (moment: InstantQuery, location?: LocationParams, ayanamsha?: string) =>
    [
      "vimshottari",
      instantCacheKey(moment),
      locationCacheKey(location),
      ayanamsha ?? "lahiri",
    ] as const,
};

export const fetchVimshottari = (
  moment: InstantQuery,
  location?: LocationParams,
  options?: { ayanamsha?: string; cycles?: number },
) => {
  const params = appendInstantParams(new URLSearchParams(), moment);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  if (options?.cycles != null) params.set("cycles", String(options.cycles));
  return get<VimshottariResponse>(
    appendLocation(`/kundali/vimshottari?${params.toString()}`, location),
  );
};

export interface ShadbalaPlanet {
  key: string;
  name: string;
  name_ne: string;
  total_virupas: number;
  rupas: number;
  required: number;
  ratio: number;
  status: ShadbalaStatus;
  top_bala: string;
  weakest_bala: string;
  breakdown: ShadbalaBreakdown;
  sub_balas?: ShadbalaSubBalas;
  ishta_phala?: number;
  kashta_phala?: number;
}

export interface ShadbalaResponse {
  planets: ShadbalaPlanet[];
  summary: {
    strongest: ShadbalaSummaryRef;
    weakest: ShadbalaSummaryRef;
    average_rupas: number;
    average_virupas: number;
    meeting_threshold: number;
    total_planets: number;
    counts: Record<ShadbalaStatus, number>;
  };
  method: string;
  location?: Record<string, unknown>;
  query_instant?: string;
}

export const shadbalaKeys = {
  atTime: (moment: InstantQuery, location?: LocationParams) =>
    ["shadbala", "at-time", instantCacheKey(moment), locationCacheKey(location)] as const,
};

export const fetchShadbala = (moment: InstantQuery, location?: LocationParams) =>
  get<ShadbalaResponse>(
    appendLocation(
      `/shadbala?${appendInstantParams(new URLSearchParams(), moment).toString()}`,
      location,
    ),
  );

/**
 * Version of the yoga-reference payload. Bump whenever the catalog data or its
 * shape changes so the CDN mints a fresh object instead of serving a stale
 * response (the endpoint is cached ~1 day). v2 added the Nepali fields.
 */
export const YOGA_REFERENCE_VERSION =
  (extra.yogaReferenceVersion as string) ?? "2";

/** The full 162-combination reference catalog (Raman, Part I). CDN-cached. */
export function fetchYogaReference(): Promise<YogaReferenceResponse> {
  return get<YogaReferenceResponse>(
    `/kundali/yogas/reference?v=${YOGA_REFERENCE_VERSION}`,
  );
}

/** Bump on a content edit so the CDN mints a fresh object (endpoint is cached ~1 day). */
export const BHAVA_REFERENCE_VERSION =
  (extra.bhavaReferenceVersion as string) ?? "26";

/** Static graha/bhava reference content — same for every chart. Also folded
 * into `/kundali/detail` (as `bhavaReference`) for callers already fetching
 * the full chart; this standalone route is for callers that aren't (e.g. the
 * panchanga transit D1 chart). */
export function fetchBhavaReference(): Promise<BhavaReferencePayload> {
  return get<BhavaReferencePayload>(
    `/kundali/reference/bhava?v=${BHAVA_REFERENCE_VERSION}`,
  );
}

export interface KundaliDetailResponse {
  panchanga: PanchangaDay;
  shadbala: ShadbalaResponse;
  dasha: DashaTreeResponse | null;
  tribhagiDasha: DashaTreeResponse | null;
  yoginiDasha: DashaTreeResponse | null;
  yuddha: YuddhaData;
  bhavaBala: BhavaBalaData | null;
  vimshopaka: VimshopakaData | null;
  ashtakavarga: AshtakavargaData | null;
  yogas: KundaliYoga[];
  grahaShanti: GrahaShantiRecommendation;
  vargaCharts: VargaCharts;
  upagrahas: UpagrahaDetailRow[];
  avakahada: JanmaAvakahadaData | null;
  birthMeta: KundaliBirthMeta;
  combustion: Record<string, boolean | null>;
  lagnaRashi: number | null;
  ayanamsha: string;
  location?: Record<string, unknown>;
  birth_instant: string;
}

export interface KundaliDetailResponse {
  panchanga: PanchangaDay;
  shadbala: ShadbalaResponse;
  dasha: DashaTreeResponse | null;
  tribhagiDasha: DashaTreeResponse | null;
  yoginiDasha: DashaTreeResponse | null;
  yuddha: YuddhaData;
  bhavaBala: BhavaBalaData | null;
  vimshopaka: VimshopakaData | null;
  ashtakavarga: AshtakavargaData | null;
  yogas: KundaliYoga[];
  vargaCharts: VargaCharts;
  upagrahas: UpagrahaDetailRow[];
  avakahada: JanmaAvakahadaData | null;
  birthMeta: KundaliBirthMeta;
  combustion: Record<string, boolean | null>;
  lagnaRashi: number | null;
  ayanamsha: string;
  location?: Record<string, unknown>;
  birth_instant: string;
  bhavaReference?: BhavaReferencePayload;
}

export const kundaliDetailKeys = {
  atTime: (moment: InstantQuery, location?: LocationParams, ayanamsha?: string) =>
    [
      "kundali",
      "detail",
      instantCacheKey(moment),
      locationCacheKey(location),
      ayanamsha ?? "lahiri",
    ] as const,
};

/**
 * Cloudflare caches /kundali/detail by full URL with no origin cache-control,
 * so a previously-viewed chart keeps serving its pre-change JSON from the edge.
 * Bump on a chart/yoga engine change so every request gets a fresh cache key.
 * Same value as web's `KUNDALI_ENGINE_VERSION`.
 */
export const KUNDALI_ENGINE_VERSION = (extra.kundaliEngineVersion as string) ?? "5";

export const fetchKundaliDetail = (
  moment: InstantQuery,
  location?: LocationParams,
  options?: { ayanamsha?: string },
) => {
  const params = appendInstantParams(new URLSearchParams(), moment);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  params.set("ev", KUNDALI_ENGINE_VERSION);
  return get<KundaliDetailResponse>(
    appendLocation(`/kundali/detail?${params.toString()}`, location),
  );
};

export const fetchDashaChildren = (
  lord: string,
  start: string,
  end: string,
  system: DashaSystem = "vimshottari",
) => {
  const params = new URLSearchParams({ lord, start, end, system });
  return get<{ lord: string; system: string; children: DashaTreeNode[] }>(
    `/kundali/dasha/expand?${params.toString()}`,
  );
};

export interface MilanPersonQuery {
  /** Birth moment: a civil day in some era plus the local clock. */
  moment: InstantQuery;
  lat?: number;
  lon?: number;
  timezone?: string;
}

export const milanKeys = {
  match: (
    boy: MilanPersonQuery,
    girl: MilanPersonQuery,
    ayanamsha?: string,
    lang?: string,
  ) =>
    [
      "kundali",
      "milan",
      instantCacheKey(boy.moment),
      `${boy.lat ?? ""},${boy.lon ?? ""},${boy.timezone ?? ""}`,
      instantCacheKey(girl.moment),
      `${girl.lat ?? ""},${girl.lon ?? ""},${girl.timezone ?? ""}`,
      ayanamsha ?? "lahiri",
      lang ?? "ne",
    ] as const,
};

export const fetchKundaliMilan = (
  boy: MilanPersonQuery,
  girl: MilanPersonQuery,
  options?: { ayanamsha?: string; lang?: string },
) => {
  const params = new URLSearchParams();
  appendInstantParams(params, boy.moment, "boy_");
  appendInstantParams(params, girl.moment, "girl_");
  if (boy.lat != null) params.set("boy_lat", String(boy.lat));
  if (boy.lon != null) params.set("boy_lon", String(boy.lon));
  if (boy.timezone) params.set("boy_timezone", boy.timezone);
  if (girl.lat != null) params.set("girl_lat", String(girl.lat));
  if (girl.lon != null) params.set("girl_lon", String(girl.lon));
  if (girl.timezone) params.set("girl_timezone", girl.timezone);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  if (options?.lang) params.set("lang", options.lang);
  return get<KundaliMilanResponse>(`/kundali/milan?${params.toString()}`);
};

function parseNdjsonLines(text: string, onRecord: (record: ReportRecord) => void) {
  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (line) onRecord(JSON.parse(line) as ReportRecord);
  }
}

async function consumeNdjsonResponse(
  res: Response,
  onRecord: (record: ReportRecord) => void,
): Promise<void> {
  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const flush = (chunk: string, final = false) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) onRecord(JSON.parse(line) as ReportRecord);
      }
      if (final && buffer.trim()) {
        onRecord(JSON.parse(buffer.trim()) as ReportRecord);
        buffer = "";
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      flush(decoder.decode(value, { stream: true }));
    }
    flush(decoder.decode(), true);
    return;
  }
  parseNdjsonLines(await res.text(), onRecord);
}

/** Stream kundali report NDJSON — same contract as web `streamKundaliReport`. */
export async function streamKundaliReport(
  moment: InstantQuery,
  location: LocationParams | undefined,
  options: { ayanamsha?: string; lang?: string; force?: boolean } | undefined,
  onRecord: (record: ReportRecord) => void,
  signal?: AbortSignal,
): Promise<{ fromCache: boolean }> {
  const params = appendInstantParams(new URLSearchParams(), moment);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  if (options?.lang) params.set("lang", options.lang);
  if (options?.force) params.set("force", "true");
  const path = appendLocation(`/kundali/report?${params.toString()}`, location);

  const res = await fetch(`${DATA_BASE}${path}`, {
    signal,
    headers: { Accept: "application/x-ndjson" },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }

  const fromCache = res.headers.get("X-Report-Cache") === "hit";
  await consumeNdjsonResponse(res, onRecord);
  return { fromCache };
}

export interface VastuSketchResponse {
  storeys: 1 | 2 | 3;
  assignments: SpaceAssignment[];
  leftover: PlannedSpace[];
  ayadi: VastuAyadi;
  entrance: { facing: VastuSketchRequest["facing"]; preferred_corner: VastuDirectionId };
}

export async function fetchVastuSketch(
  body: VastuSketchRequest,
  signal?: AbortSignal,
): Promise<VastuSketchResponse> {
  const path = "/vastu/sketch";
  const res = await fetch(`${DATA_BASE}${path}`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}
