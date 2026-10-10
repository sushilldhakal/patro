import { Platform } from "react-native";
import { offlineAwareGet } from "@/lib/offline/offline-http";
import Constants from "expo-constants";
import {
  appendBirthInstantParams,
  appendInstantParams,
  instantCacheKey,
} from "@/lib/instant-query";
import type { Era } from "@vedic-patro/domain/era";
import type { InstantQuery } from "@vedic-patro/domain/instant";

import {
  appendLocation,
  configureApiClient,
  get,
} from "@vedic-patro/api-client";

// Requests shared with the other app — see packages/api-client/src/client.ts.
import {
  withPanchangaCacheVersion,
  withSaitCacheVersion,
  withGrahaCacheVersion,
  PANCHANGA_CACHE_VERSION,
  SAIT_CACHE_VERSION,
  excludeParam,
  ApiError,
  locationCacheKey,
} from "@vedic-patro/api-client";
export {
  withPanchangaCacheVersion,
  withSaitCacheVersion,
  withGrahaCacheVersion,
  GRAHA_CACHE_VERSION,
  PANCHANGA_CACHE_VERSION,
  SAIT_CACHE_VERSION,
  KUNDALI_ENGINE_VERSION,
  BHAVA_REFERENCE_VERSION,
  YOGA_REFERENCE_VERSION,
  excludeParam,
  ApiError,
  locationCacheKey,
  fetchNearestCity,
  fetchJanmaRashi,
  fetchPanchangaAtTime,
  seasonsKeys,
  fetchTropicalSeasons,
  vimshottariKeys,
  fetchVimshottari,
  fetchSait,
  saitDetailKey,
  saitPersonalizeKey,
  fetchSaitPersonalize,
  fetchElementDay,
  fetchAdToBs,
  fetchBsToAd,
  fetchSpecialMonths,
  shadbalaKeys,
  fetchShadbala,
  fetchYogaReference,
  fetchBhavaReference,
  kundaliDetailKeys,
  fetchKundaliDetail,
  fetchDashaChildren,
  milanKeys,
  fetchKundaliMilan,
} from "@vedic-patro/api-client";

// Shared with the other app — see packages/api-client.
import type {
  LocationParams,
  RashifalPersonal,
  SaitMonthAllResponse,
  ElementSpansResponse,
  ReportRecord,
  RashifalPeriod,
  VastuSketchRequest,
  PatroApiLimits,
  CitiesSearchResponse,
  CivilTimeline,
  GocharIngressResponse,
  GocharResponse,
  GrahaSthitiResponse,
  GrahaAstaResponse,
  GrahaVakriResponse,
  EclipseYearResponse,
  PanchakYearResponse,
  SunYearResponse,
  SaitDetailResponse,
  ElementSpanRange,
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

function appLocationQuery(path: string, location?: LocationParams): string {
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

// Every public read goes through here, so a response saved by the offline
// download (lib/offline) answers the same request when there is no network.
async function offlineAwareJson<T>(path: string): Promise<T> {
  return offlineAwareGet<T>(
    path,
    () => fetch(`${DATA_BASE}${path}`),
    (res) => new ApiError(res.status, undefined, path),
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

function locationKey(loc?: LocationParams): string {
  const l = loc ?? DEFAULT_LOCATION;
  return [l.city_id, l.lat, l.lon, l.timezone].join(":");
}

configureApiClient({
  get: offlineAwareJson,
  appendLocation: appLocationQuery,
  locationKey,
});

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
    appendLocation(withPanchangaCacheVersion(`${base}?full=true&era=${era}&language=${language}`), location),
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
  appendLocation(withPanchangaCacheVersion(`/panchanga/year/${year}?wheel=true&era=bs`), location);

export const fetchYearWheelCalendar = (year: number, location?: LocationParams) =>
  get<YearWheelCalendar>(yearWheelRequestPath(year, location));

export const fetchPanchanga = (date: string, era: "bs" | "ad" = "bs", location?: LocationParams) =>
  get<PanchangaDay>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/${date}?era=${era}&festivals=true&detail=true`),
      location,
    ),
  );

export const fetchTodayPanchanga = (location?: LocationParams) => {
  const today = new Date().toISOString().split("T")[0];
  return get<PanchangaDay>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/${today}?era=ad&festivals=true&detail=true`),
      location,
    ),
  );
};

export const fetchCivilTimeline = (date: string, era: "bs" | "ad" = "ad", location?: LocationParams) =>
  get<{ civil_timeline: CivilTimeline }>(
    appendLocation(withPanchangaCacheVersion(`/panchanga/${date}?era=${era}&detail=false&civil=true`), location),
  ).then((r) => r.civil_timeline);

export const fetchHolidays = (year: number) =>
  get<HolidaysResponse>(withPanchangaCacheVersion(`/nepal/holidays?year=${year}&era=bs`));

export const fetchFestivals = (year: number, language: "ne" | "en" = "ne") =>
  get<FestivalsResponse>(
    withPanchangaCacheVersion(`/nepal/festivals?year=${year}&era=bs&language=${language}`),
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
    appendLocation(withPanchangaCacheVersion(`/panchanga/rashifal?${params.toString()}`), location),
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
    appendLocation(withPanchangaCacheVersion(`/panchanga/rashifal/personal?${params.toString()}`), location),
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

export const fetchSaitMonthAll = async (
  year: number,
  month: number,
  location?: LocationParams,
): Promise<SaitMonthAllResponse> => {
  const data = await get<SaitMonthAllResponse>(
    withSaitCacheVersion(appendLocation(`/nepal/sait/${year}/month/${month}`, location)),
  );
  if (!data?.categories || typeof data.categories !== "object") {
    throw new Error(`Invalid sait response for ${year}/${month}`);
  }
  return data;
};

function buildEraQuery(
  era: import("@/lib/patro-era").PatroBrowseEra = "bs",
  year?: number,
): string {
  const language = era === "ad" || era === "bc" ? "en" : "ne";
  const params = new URLSearchParams({ era, language });
  if (year != null) params.set("year", String(year));
  return params.toString();
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

export const saitKeys = {
  entries: (year: number, category: string, location?: LocationParams) =>
    ["sait", SAIT_CACHE_VERSION, year, category, locationCacheKey(location)] as const,
};

export const fetchGrahaSthiti = (dateKey: string, location?: LocationParams, era: "bs" | "ad" = "ad") =>
  get<GrahaSthitiResponse>(
    appendLocation(withGrahaCacheVersion(`/nepal/graha-sthiti/${dateKey}?era=${era}`), location),
  );

export const fetchGrahaAstaYear = (year: number, location?: LocationParams, era: "bs" | "ad" = "bs") =>
  get<GrahaAstaResponse>(
    appendLocation(
      withGrahaCacheVersion(`/nepal/graha-asta/year/${year}?${buildEraQuery(era, year)}`),
      location,
    ),
  );

export const fetchGrahaVakriYear = (year: number, location?: LocationParams, era: "bs" | "ad" = "bs") =>
  get<GrahaVakriResponse>(
    appendLocation(
      withGrahaCacheVersion(`/nepal/graha-vakri/year/${year}?${buildEraQuery(era, year)}`),
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
      withGrahaCacheVersion(`/nepal/eclipse/${kind}/year/${year}?${buildEraQuery(era, year)}`),
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
    appendLocation(withPanchangaCacheVersion(`/panchanga/element/${name}/spans?${query.toString()}`), location),
  );
};

export const fetchSaitDetail = (
  year: number,
  category: string,
  location?: LocationParams,
  excludeRules?: string[],
  nakshatraMode?: string | null,
) => {
  let path = appendLocation(`/nepal/sait/${year}/${category}/detail`, location);
  const params = new URLSearchParams();
  const exclude = excludeParam(excludeRules);
  if (exclude) params.set("exclude", exclude);
  if (nakshatraMode && nakshatraMode !== "classical") params.set("nakshatra_mode", nakshatraMode);
  const qs = params.toString();
  if (qs) path = `${path}${path.includes("?") ? "&" : "?"}${qs}`;
  return get<SaitDetailResponse>(withSaitCacheVersion(path));
};

export function timeShort(v: PanchangaDay["sunrise"]): string {
  if (!v) return "—";
  if (typeof v === "string") return v.slice(0, 5);
  return v.local_time_short?.slice(0, 5) ?? "—";
}

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
