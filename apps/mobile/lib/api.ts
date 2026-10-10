import { Platform } from "react-native";
import { offlineAwareGet } from "@/lib/offline/offline-http";
import Constants from "expo-constants";
import {
  appendBirthInstantParams,
  appendInstantParams,
  instantCacheKey,
} from "@/lib/instant-query";
import type { Era, InstantQuery } from "@vedic-patro/domain/era";

// Shared with the other app — see packages/api-client.
import type {
  LocationParams,
  JanmaRashi,
  RashifalPersonal,
  VimshottariResponse,
  SaitResponse,
  SaitPersonalizeResponse,
  SaitMonthAllResponse,
  ElementSpansResponse,
  SpecialMonthsResponse,
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
  RashifalPeriod,
  ConvertAdToBs,
  ConvertBsToAd,
  VastuSketchRequest,
  PatroApiLimits,
  CitiesSearchResponse,
  NearestCityResponse,
  CivilTimeline,
  TropicalSeasonsResponse,
  GocharIngressResponse,
  GocharResponse,
  GrahaSthitiResponse,
  GrahaAstaResponse,
  GrahaVakriResponse,
  EclipseYearResponse,
  PanchakYearResponse,
  SunYearResponse,
  SaitDetailResponse,
  ElementDayResponse,
  ElementSpanRange,
  ShadbalaResponse,
  KundaliDetailResponse,
  MilanPersonQuery,
  RashifalBlock,
  PanchangaDay,
  MonthCalendar,
  CalendarDay,
  HolidaysResponse,
  FestivalsResponse,
  VastuSketchResponse,
  MonthBrowseEra,
  YearWheelCalendar,
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
  PatroApiLimits,
  City,
  CitiesSearchResponse,
  NearestCityResponse,
  CivilTimeline,
  TropicalSeasonsResponse,
  GocharIngressEvent,
  GocharIngressResponse,
  GocharGraha,
  GocharResponse,
  GrahaSthitiRow,
  GrahaSthitiResponse,
  AstaStamp,
  GrahaAstaPeriod,
  GrahaAstaResponse,
  GrahaVakriResponse,
  EclipseEvent,
  EclipseYearResponse,
  PanchakMomentResponse,
  PanchakPeriodResponse,
  PanchakYearResponse,
  RawMonthDay,
  SunYearResponse,
  UpcomingFestival,
  UpcomingFestivalsResponse,
  SaitDetailDay,
  SaitDetailResponse,
  SaitRuleItem,
  SaitAboutCategory,
  SaitAboutResponse,
  ElementInfo,
  ElementMonthDay,
  ElementMonthResponse,
  ElementDayResponse,
  ElementSpanRange,
  ShadbalaPlanet,
  ShadbalaResponse,
  KundaliDetailResponse,
  MilanPersonQuery,
  SuryaNakshatra,
  RashifalSignBlock,
  RashifalIngress,
  RashifalBlock,
  PanchakaSegment,
  NivasShoolDirection,
  NivasShoolSegment,
  NivasShoolBlock,
  PanchangaAtTime,
  EraDateSpelling,
  EraDateParts,
  PanchangaDay,
  MonthCalendar,
  YearCalendar,
  CalendarDayAnga,
  CalendarDayDetail,
  CalendarDay,
  PatroMonth,
  PatroDay,
  HolidaysResponse,
  FestivalsResponse,
  KundaliResponse,
  CalendarHeader,
  VastuSketchResponse,
  PatroSolarCorrection,
  PanchangaAnga,
  PlanetBlock,
  SolarCorrection,
  MonthBrowseEra,
  YearWheelMonth,
  YearWheelCalendarDay,
  YearWheelCalendar,
  TropicalSeasonSegment,
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

/** Host-owned year bounds and cache version — not mirrored in the client. */
export const fetchPatroCapabilities = async (): Promise<PatroApiLimits> => {
  const res = await fetch(`${API_BASE}/meta/capabilities`);
  if (!res.ok) throw new Error(`API ${res.status}: /meta/capabilities`);
  return res.json();
};

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
