// Same-origin by default: nginx proxies "/api" → the FastAPI backend, so the
// browser never makes a cross-origin request (no CORS). Override with
// VITE_API_BASE_URL for a split host (e.g. http://localhost:8080 in dev).
import type { Era } from "@vedic-patro/domain/era";
import type { InstantQuery } from "@vedic-patro/domain/instant";
import { getLanguageForEra } from "@vedic-patro/domain/era";
import {
  buildPatroDayApiQuery,
  patroDayFetchFromApiDateAd,
  patroDayQueryCacheKey,
  type PatroDayFetchState,
  type PatroDisplayContext,
} from "@/lib/patro-day-url";

import {
  apiErrorFrom,
  appendLocation,
  configureApiClient,
  fetchMonthCalendarRaw,
  fetchPersonalRashifalForDay,
  fetchRashifalForDay,
  get,
} from "@vedic-patro/api-client";

// Requests shared with the other app — see packages/api-client/src/client.ts.
import {
  withPanchangaCacheVersion,
  PANCHANGA_CACHE_VERSION,
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
  fetchGrahaAstaYear,
  fetchGrahaVakriYear,
  fetchEclipseYear,
  fetchPanchakYear,
  fetchYearSunTimes,
  cityKeys,
  searchCities,
  fetchSaitDetail,
  fetchSaitMonthAll,
  fetchGocharIngress,
  fetchPatroCapabilities,
  fetchCivilTimeline,
  gocharKeys,
  fetchGochar,
  grahaDetailKeys,
  fetchGrahaSthiti,
  panchakKeys,
  saitKeys,
  fetchHolidays,
  fetchFestivals,
  elementKeys,
  fetchElementSpans,
  fetchVastuSketch,
  streamKundaliReport,
  yearWheelKeys,
  fetchYearWheelCalendar,
  fetchPopularCities,
  fetchNepalPanchanga,
  fetchGocharJd,
  fetchPanchangaAtTimeJd,
  fetchCalendarHeader,
  patroKeys,
  fetchPatroMonth,
  holidayKeys,
  fetchUpcomingFestivals,
  fetchSaitYears,
  saitMonthAllKey,
  fetchSaitAbout,
  fetchSaitAboutCategory,
  fetchElements,
  fetchElementMonth,
  convertorKeys,
  kundaliKeys,
  fetchKundali,
  SUN_YEAR_DATA_VERSION,
  sunYearKeys,
  grahaSthitiRequestForDisplay,
  fetchPanchanga,
  timeShort,
  rashifalKeys,
} from "@vedic-patro/api-client";

// Shared with the other app — see packages/api-client.
import type {
  LocationParams,
  RashifalPeriod,
  RawMonthDay,
  PanchangaDay,
  MonthCalendar,
  YearCalendar,
  CalendarDay,
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

/** Strip trailing slashes so `${BASE}/${API_VERSION}` never becomes `…/api//v1`. */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "") || "/api";

// Public, cacheable data endpoints live under a version segment (…/api/v1/…) so
// a backend engine bump (v1 → v2) becomes a brand-new CDN object — no Cloudflare
// purge needed. Auth/profile calls stay on the unversioned API_BASE.
const API_VERSION = import.meta.env.VITE_API_VERSION ?? "v1";
const DATA_BASE = `${BASE}/${API_VERSION}`;

/** Unversioned base — used by the auth client (/auth, /profiles). */
export const API_BASE = BASE;
/** Versioned base for public, cacheable data endpoints. */
export const API_DATA_BASE = DATA_BASE;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}${path}`);
  // A 400 is usually a date the engine can't compute (out of era range, beyond
  // the ephemeris); the ApiError carries the backend's explanation.
  if (!res.ok) throw await apiErrorFrom(res, path);
  return res.json();
}

function webLocationKey(location?: LocationParams): string {
  if (!location) return "default";
  if (location.city_id != null) return `city:${location.city_id}`;
  if (location.lat != null && location.lon != null) {
    return `coords:${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;
  }
  if (location.city) return `name:${location.city}`;
  return "default";
}

function webLocationQuery(path: string, location?: LocationParams): string {
  if (!location) return path;
  const params = new URLSearchParams();
  const cityLooksNepali =
    !!location.city && /[\u0900-\u097F]/.test(location.city);
  // Prefer city_id. If a stored preference has Devanagari `city=` (from an older
  // Nepali UI pick) but also has coords, use coords — GeoNames can't resolve नेपाली.
  if (location.city_id != null) {
    params.set("city_id", String(location.city_id));
  } else if (location.city && !cityLooksNepali) {
    params.set("city", location.city);
  } else if (location.lat != null || location.lon != null) {
    if (location.lat != null) params.set("lat", String(location.lat));
    if (location.lon != null) params.set("lon", String(location.lon));
    if (location.timezone) params.set("timezone", location.timezone);
  } else if (location.city) {
    // Last resort: send as-is (may 400 if Devanagari with no coords).
    params.set("city", location.city);
  }
  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

configureApiClient({
  baseUrl: BASE,
  dataBaseUrl: DATA_BASE,
  get: fetchJson,
  appendLocation: webLocationQuery,
  locationKey: webLocationKey,
});

// ─── Panchanga ────────────────────────────────────────────────────────────────

export const panchangaKeys = {
  today: (location?: LocationParams) =>
    ["panchanga", "today", locationCacheKey(location)] as const,
  day: (date: string, era: string, location?: LocationParams) =>
    ["panchanga", "day", PANCHANGA_CACHE_VERSION, date, era, locationCacheKey(location)] as const,
  daySelection: (state: PatroDayFetchState, location?: LocationParams) =>
    [
      "panchanga",
      "day",
      PANCHANGA_CACHE_VERSION,
      patroDayQueryCacheKey(state),
      state.display.era,
      state.display.language,
      locationCacheKey(location),
    ] as const,
  nepalDay: (date: string, location?: LocationParams) =>
    ["panchanga", "nepal", date, locationCacheKey(location)] as const,
  month: (
    year: number,
    month: number,
    location?: LocationParams,
    full = true,
    excludeInternational = false,
    era: Era = "bs",
  ) =>
    ["panchanga", "month", era, year, month, locationCacheKey(location), full ? "full" : "lite", excludeInternational ? "nointl" : "intl"] as const,
  year: (year: number, location?: LocationParams, full = true) =>
    ["panchanga", "year", year, locationCacheKey(location), full ? "full" : "lite"] as const,
  monthAtClock: (
    year: number,
    month: number,
    clock: string,
    location?: LocationParams,
    excludeInternational = false,
  ) =>
    ["panchanga", "month", "clock", year, month, clock, locationCacheKey(location), excludeInternational ? "nointl" : "intl"] as const,
  atTime: (jd: number, clock: string, location?: LocationParams) =>
    ["panchanga", "at-time", PANCHANGA_CACHE_VERSION, jd, clock, locationCacheKey(location)] as const,
  atTimeDay: (state: PatroDayFetchState, clock: string, location?: LocationParams) =>
    [
      "panchanga",
      "at-time",
      PANCHANGA_CACHE_VERSION,
      patroDayQueryCacheKey(state),
      state.display.era,
      clock,
      locationCacheKey(location),
    ] as const,
  civil: (date: string, location?: LocationParams) =>
    ["panchanga", "civil", PANCHANGA_CACHE_VERSION, date, locationCacheKey(location)] as const,
  civilDay: (date: string, location?: LocationParams) =>
    ["panchanga", "civil-day", PANCHANGA_CACHE_VERSION, date, locationCacheKey(location)] as const,
  header: (year: number, month: number, location?: LocationParams) =>
    ["calendar", "header", year, month, locationCacheKey(location)] as const,
};

export const fetchTodayPanchanga = (location?: LocationParams, displayEra: Era = "ad") =>
  fetchPanchangaDay(
    {
      kind: "today",
      display: {
        era: displayEra,
        language: getLanguageForEra(displayEra),
      },
    },
    location,
  );

export const PANCHANGA_TODAY_SEGMENT = "today";

export function fetchPanchangaDay(
  state: import("@/lib/patro-day-url").PatroDayFetchState,
  location?: LocationParams,
  extra?: Record<string, string | number | undefined>,
) {
  const qs = buildPatroDayApiQuery(state, {
    festivals: "true",
    detail: "true",
    cv: PANCHANGA_CACHE_VERSION,
    ...extra,
  }).toString();
  const path =
    state.kind === "jd"
      ? `/panchanga/jd/${state.jd}`
      : `/panchanga/${PANCHANGA_TODAY_SEGMENT}`;
  return get<PanchangaDay>(appendLocation(`${path}?${qs}`, location));
}

export function fetchRashifal(
  state: import("@/lib/patro-day-url").PatroDayFetchState,
  period: RashifalPeriod,
  location?: LocationParams,
) {
  return fetchRashifalForDay(buildPatroDayApiQuery(state), period, location);
}

/**
 * The personal endpoint takes the profile's stored birth era + civil parts
 * (the API converts) plus the birth place — needed once, to cast the Lagna.
 * `location` is where the transits are read *from* (the viewer's current place).
 */
export function fetchPersonalRashifal(
  state: import("@/lib/patro-day-url").PatroDayFetchState,
  period: RashifalPeriod,
  birth: { moment: InstantQuery; birthLat: number; birthLon: number; birthTz: string },
  location?: LocationParams,
) {
  return fetchPersonalRashifalForDay(buildPatroDayApiQuery(state), period, birth, location);
}

/**
 * Midnight-referenced (civil-day, 00:00→24:00) full panchanga. Same payload
 * shape as {@link fetchPanchangaDay}, but the moving angas (tithi/नक्षत्र/योग/करण,
 * chandra rashi, lagna, tara/chandra bala, panchaka) are read at local midnight
 * so the दिन-रात page view agrees with the दिन-रात chart. Date-properties
 * (festivals, ritu, samvat, sun/moon times, weekday) stay tied to the date.
 */
export const fetchPanchangaCivilDay = (
  civilDateAd: string,
  display: PatroDisplayContext,
  location?: LocationParams,
) =>
  fetchPanchangaDay(
    patroDayFetchFromApiDateAd(civilDateAd, display),
    location,
    { reference: "midnight" },
  );

/** Ephemeris panchanga at observer-local `clock` on the browsed civil day. */
export const fetchPanchangaAtTimeForDay = (
  dayState: PatroDayFetchState,
  clock: string,
  location?: LocationParams,
  options?: { ayanamsha?: string; resolvedJdUt?: number },
) => {
  const params = new URLSearchParams();
  params.set("cv", PANCHANGA_CACHE_VERSION);
  params.set("clock", clock);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);

  if (dayState.kind === "input") {
    const dayQs = buildPatroDayApiQuery(dayState);
    dayQs.forEach((value, key) => {
      if (key !== "cv") params.set(key, value);
    });
  } else if (dayState.kind === "jd") {
    params.set("jd", String(dayState.jd));
  } else {
    const dayQs = buildPatroDayApiQuery(dayState);
    dayQs.forEach((value, key) => {
      if (key !== "cv") params.set(key, value);
    });
    const jd = options?.resolvedJdUt;
    if (jd != null) params.set("jd", String(jd));
  }

  return get<PanchangaDay>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/at-time?${params.toString()}`),
      location,
    ),
  );
};

function parsePakshaName(label?: string): string | undefined {
  if (!label) return undefined;
  const lower = label.toLowerCase();
  if (lower.includes("shukla") || label.includes("शुक्ल")) return "shukla";
  if (lower.includes("krishna") || label.includes("कृष्ण")) return "krishna";
  return undefined;
}

function parsePakshaNeShort(label?: string): string | undefined {
  if (!label) return undefined;
  if (label.includes("शुक्ल")) return "शुक्ल";
  if (label.includes("कृष्ण")) return "कृष्ण";
  return undefined;
}

function resolveNestedChandraRashi(nested?: CalendarDay["panchanga"]) {
  const raw = nested?.chandra_rashi;
  if (raw && typeof raw === "object") {
    const obj = raw as { name?: string; name_ne?: string };
    return { en: obj.name, ne: obj.name_ne ?? nested?.chandra_rashi_ne };
  }
  return {
    en: typeof raw === "string" ? raw : undefined,
    ne: nested?.chandra_rashi_ne,
  };
}

function normalizeMonthDay(day: RawMonthDay): CalendarDay {
  const nested = day.panchanga;
  const nestedRashi = resolveNestedChandraRashi(nested);
  const paksha =
    day.paksha ??
    parsePakshaName(nested?.paksha) ??
    parsePakshaName(nested?.paksha_ne);
  const pakshaNe =
    day.paksha_ne ??
    parsePakshaNeShort(nested?.paksha_ne) ??
    nested?.paksha_ne;

  return {
    ...day,
    day: day.day_bs ?? day.day,
    paksha,
    paksha_ne: pakshaNe,
    aayan: day.aayan ?? nested?.aayan,
    aayan_ne: day.aayan_ne ?? nested?.aayan_ne,
    ayana_mark: day.ayana_mark ?? nested?.ayana_mark,
    nakshatra: day.nakshatra ?? nested?.nakshatra?.name,
    nakshatra_ne: day.nakshatra_ne ?? nested?.nakshatra?.name_ne,
    yoga: day.yoga ?? nested?.yoga?.name,
    yoga_ne: day.yoga_ne ?? nested?.yoga?.name_ne,
    karana: day.karana ?? nested?.karana?.name,
    karana_ne: day.karana_ne ?? nested?.karana?.name_ne,
    moonrise: day.moonrise ?? nested?.moon?.rise,
    moonrise_local: day.moonrise_local,
    moonset: day.moonset ?? nested?.moon?.set,
    moonset_local: day.moonset_local,
    chandra_rashi: day.chandra_rashi ?? nestedRashi.en,
    chandra_rashi_ne: day.chandra_rashi_ne ?? nestedRashi.ne,
  };
}

export const fetchMonthCalendar = async (
  year: number,
  month: number,
  location?: LocationParams,
  options?: { clock?: string; full?: boolean; excludeInternational?: boolean; era?: Era },
): Promise<MonthCalendar> => {
  const data = await fetchMonthCalendarRaw(year, month, location, options);
  return { ...data, calendar: data.calendar.map(normalizeMonthDay) };
};

export const fetchYearCalendar = async (
  year: number,
  location?: LocationParams,
  options?: { full?: boolean; wheel?: boolean; era?: Era },
): Promise<YearCalendar> => {
  const params = new URLSearchParams();
  if (options?.era === "bbs" || options?.era === "bs") {
    params.set("era", options.era);
  }
  if (options?.wheel) {
    // Slim year-wheel payload: days once in `calendar` with wheel-only state,
    // `months` metadata only (no duplicated per-day grids). ~90% smaller.
    params.set("wheel", "true");
  } else if (options?.full !== false) {
    params.set("full", "true");
  }
  const qs = params.toString();
  const path = appendLocation(
    withPanchangaCacheVersion(`/panchanga/year/${year}${qs ? `?${qs}` : ""}`),
    location,
  );
  const data = await get<YearCalendar & { calendar: RawMonthDay[]; months: Array<MonthCalendar & { calendar?: RawMonthDay[] }> }>(path);
  // The wheel reads only each day's nested `panchanga` block (see seedDayRow), so
  // normalizing — which reconstructs the ~20 flat per-day fields the server just
  // trimmed away — would re-bloat the payload before it's parsed/persisted and
  // burn CPU over 365 days for nothing. Skip it for the wheel; keep it for the
  // (fuller) default shape whose consumers rely on the flat fields.
  if (options?.wheel) {
    return { ...data, calendar: data.calendar as CalendarDay[], months: data.months ?? [] };
  }
  return {
    ...data,
    calendar: data.calendar.map(normalizeMonthDay),
    months: (data.months ?? []).map((month) => ({
      ...month,
      calendar: (month.calendar ?? []).map(normalizeMonthDay),
    })),
  };
};
