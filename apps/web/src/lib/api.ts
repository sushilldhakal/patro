// Same-origin by default: nginx proxies "/api" → the FastAPI backend, so the
// browser never makes a cross-origin request (no CORS). Override with
// VITE_API_BASE_URL for a split host (e.g. http://localhost:8080 in dev).
import type { Era } from "@vedic-patro/domain/era";
import type { InstantQuery } from "@vedic-patro/domain/instant";
import { buildApiQuery, getLanguageForEra } from "@/lib/era";
import {
  appendInstantParams,
  appendBirthInstantParams,
} from "@/lib/instant-query";
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
  get,
} from "@vedic-patro/api-client";

// Requests shared with the other app — see packages/api-client/src/client.ts.
import {
  withPanchangaCacheVersion,
  withGrahaCacheVersion,
  GRAHA_CACHE_VERSION,
  PANCHANGA_CACHE_VERSION,
  SAIT_CACHE_VERSION,
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
} from "@vedic-patro/api-client";

// Shared with the other app — see packages/api-client.
import type {
  LocationParams,
  RashifalPersonal,
  ElementSpansResponse,
  ReportRecord,
  RashifalPeriod,
  VastuSketchRequest,
  PatroApiLimits,
  City,
  CivilTimeline,
  GocharResponse,
  GrahaSthitiResponse,
  RawMonthDay,
  UpcomingFestivalsResponse,
  SaitAboutCategory,
  SaitAboutResponse,
  ElementInfo,
  ElementMonthResponse,
  ElementSpanRange,
  RashifalBlock,
  EraDateParts,
  PanchangaDay,
  MonthCalendar,
  YearCalendar,
  CalendarDay,
  PatroMonth,
  HolidaysResponse,
  FestivalsResponse,
  KundaliResponse,
  CalendarHeader,
  VastuSketchResponse,
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

/** Host-owned year bounds and cache version — not mirrored in the client. */
export const fetchPatroCapabilities = async (): Promise<PatroApiLimits> => {
  const res = await fetch(`${API_BASE}/meta/capabilities`);
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON */
    }
    throw new ApiError(res.status, detail, "/meta/capabilities");
  }
  return res.json();
};

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
  get: fetchJson,
  appendLocation: webLocationQuery,
  locationKey: webLocationKey,
});

export const fetchPopularCities = () =>
  get<{ count: number; cities: City[] }>("/nepal/cities/popular");

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
  const qs = buildPatroDayApiQuery(state, {
    period,
    cv: PANCHANGA_CACHE_VERSION,
  }).toString();
  return get<RashifalBlock>(appendLocation(`/panchanga/rashifal?${qs}`, location));
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
  const qs = buildPatroDayApiQuery(state, {
    period,
    birth_lat: birth.birthLat,
    birth_lon: birth.birthLon,
    birth_tz: birth.birthTz,
    cv: PANCHANGA_CACHE_VERSION,
  });
  appendBirthInstantParams(qs, birth.moment);
  return get<RashifalPersonal>(appendLocation(`/panchanga/rashifal/personal?${qs.toString()}`, location));
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

export const fetchNepalPanchanga = (dateAd: string, location?: LocationParams) =>
  get<PanchangaDay>(
    appendLocation(`/nepal/panchanga/${dateAd}?era=ad`, location)
  );

export const fetchCivilTimeline = (
  date: string,
  era: Era = "ad",
  location?: LocationParams,
) =>
  get<{ civil_timeline: CivilTimeline }>(
    appendLocation(
      withPanchangaCacheVersion(
        `/panchanga/${date}?era=${era}&detail=false&civil=true`,
      ),
      location,
    ),
  ).then((r) => r.civil_timeline);

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

/** Ephemeris panchanga at observer-local `clock` on civil day `jd_ut` (0h UT). */
export const fetchPanchangaAtTimeJd = (
  jdUt: number,
  clock: string,
  location?: LocationParams,
  options?: { ayanamsha?: string },
) => {
  const params = new URLSearchParams();
  params.set("jd", String(jdUt));
  params.set("clock", clock);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  return get<PanchangaDay>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/at-time?${params.toString()}`),
      location,
    ),
  );
};

export const gocharKeys = {
  day: (jdUt: number, location?: LocationParams) =>
    ["gochar", "jd", jdUt, locationCacheKey(location)] as const,
  dayLegacy: (date: string, era: string, location?: LocationParams) =>
    ["gochar", date, era, locationCacheKey(location)] as const,
  ingress: (
    from: string,
    to: string,
    level: string,
    location?: LocationParams
  ) => ["gochar", "ingress", from, to, level, locationCacheKey(location)] as const,
  ingressEra: (
    from: string,
    to: string,
    level: string,
    era: string,
    location?: LocationParams,
  ) => ["gochar", "ingress", from, to, level, era, locationCacheKey(location)] as const,
};

export const fetchGochar = (
  date: string,
  era: Era = "ad",
  location?: LocationParams
) =>
  get<GocharResponse>(
    appendLocation(`/nepal/gochar/${date}?era=${era}`, location)
  );

export const fetchGocharJd = (jdUt: number, location?: LocationParams) =>
  get<GocharResponse>(appendLocation(`/nepal/gochar/jd/${jdUt}`, location));

export const grahaDetailKeys = {
  sthiti: (dateKey: string, apiEra: Era, location?: LocationParams) =>
    ["graha", "sthiti", GRAHA_CACHE_VERSION, apiEra, dateKey, locationCacheKey(location)] as const,
  asta: (year: number, location?: LocationParams, era: Era = "bs") =>
    ["graha", "asta", GRAHA_CACHE_VERSION, era, year, locationCacheKey(location)] as const,
  vakri: (year: number, location?: LocationParams, era: Era = "bs") =>
    ["graha", "vakri", GRAHA_CACHE_VERSION, era, year, locationCacheKey(location)] as const,
  eclipse: (kind: "solar" | "lunar", year: number, location?: LocationParams, era: Era = "bs") =>
    ["graha", "eclipse", GRAHA_CACHE_VERSION, kind, era, year, locationCacheKey(location)] as const,
};

export const fetchGrahaSthiti = (
  dateKey: string,
  location?: LocationParams,
  apiEra: Era = "ad",
) =>
  get<GrahaSthitiResponse>(
    appendLocation(
      withGrahaCacheVersion(`/nepal/graha-sthiti/${dateKey}?era=${apiEra}`),
      location,
    ),
  );

/** Date key + API era for graha-sthiti — positive y/m/d in the path, era on the query. */
export function grahaSthitiRequestForDisplay(
  displayEra: Era,
  dateAd: string,
  dateParts?: Pick<EraDateParts, "vikram" | "gregorian"> | null,
): { dateKey: string; apiEra: Era } {
  if (displayEra === "ad" || displayEra === "bc") {
    const g = dateParts?.gregorian;
    if (g?.year && g.month && g.day) {
      return {
        dateKey: `${String(g.year).padStart(4, "0")}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`,
        apiEra: g.era,
      };
    }
    return { dateKey: dateAd, apiEra: displayEra };
  }
  const v = dateParts?.vikram;
  if (v?.year && v.month && v.day && (v.era === "bs" || v.era === "bbs")) {
    return {
      dateKey: `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`,
      apiEra: v.era,
    };
  }
  return { dateKey: dateAd, apiEra: displayEra };
}

export const panchakKeys = {
  year: (year: number, location?: LocationParams, era: Era = "bs") =>
    ["panchak", era, year, locationCacheKey(location)] as const,
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
  options?: {
    clock?: string;
    full?: boolean;
    excludeInternational?: boolean;
    era?: Era;
  },
): Promise<MonthCalendar> => {
  const full = options?.full !== false;
  const era = options?.era ?? "bs";
  // Year/month live in the path — omit from query so EraMiddleware does not run
  // to_jd() on mirrored params (that gate returned 400 for some BBS months).
  const params = buildApiQuery({
    era,
    language: getLanguageForEra(era),
  });
  if (full) params.set("full", "true");
  if (options?.clock) params.set("clock", options.clock);
  if (options?.excludeInternational) params.set("exclude_international", "true");
  const qs = params.toString();
  const base =
    era === "ad"
      ? `/panchanga/ad/${year}/${month}`
      : era === "bc"
        ? `/panchanga/bc/${year}/${month}`
        : `/panchanga/${year}/${month}`;
  const path = appendLocation(withPanchangaCacheVersion(`${base}${qs ? `?${qs}` : ""}`), location);
  const data = await get<MonthCalendar & { calendar: RawMonthDay[] }>(path);
  return {
    ...data,
    calendar: data.calendar.map(normalizeMonthDay),
  };
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

/** React Query key for slim year-wheel calendar payloads. */
export const yearWheelKeys = {
  year: (year: number, location?: LocationParams, era: Era = "bs") =>
    [
      "panchanga",
      "year-wheel",
      PANCHANGA_CACHE_VERSION,
      era,
      year,
      locationCacheKey(location),
    ] as const,
};

/** Whole BS year of wheel-only panchanga state (~one network call per year). */
export const fetchYearWheelCalendar = (year: number, location?: LocationParams, era: Era = "bs") =>
  fetchYearCalendar(year, location, { wheel: true, era });

// Bump when year sun-times payload logic changes (invalidates React Query + IDB).
export const SUN_YEAR_DATA_VERSION = 16;

export const sunYearKeys = {
  year: (year: number, era: Era, location?: LocationParams) =>
    ["sun-times", "year", SUN_YEAR_DATA_VERSION, era, year, locationCacheKey(location)] as const,
};

export const fetchCalendarHeader = (year: number, month: number) =>
  get<CalendarHeader>(`/calendar/header/${year}/${month}`);

// ─── Patro ────────────────────────────────────────────────────────────────────

export const patroKeys = {
  month: (year: number, month: number) => ["patro", "month", year, month] as const,
};

export const fetchPatroMonth = (year: number, month: number) =>
  get<PatroMonth>(withPanchangaCacheVersion(`/nepal/patro/${year}/${month}`));

// ─── Holidays & Festivals ─────────────────────────────────────────────────────

export const holidayKeys = {
  holidays: (year: number, era: Era = "bs") => ["holidays", era, year] as const,
  festivals: (year: number, era: Era = "bs", month?: number) =>
    month != null
      ? (["festivals", era, year, month] as const)
      : (["festivals", era, year] as const),
  upcoming: (days = 90, limit = 15, holidaysOnly = false) =>
    ["festivals", "upcoming", days, limit, holidaysOnly] as const,
};

export const fetchHolidays = (year: number, era: Era = "bs") => {
  const query = buildApiQuery({ era, language: getLanguageForEra(era), year });
  return get<HolidaysResponse>(
    withPanchangaCacheVersion(`/nepal/holidays?${query.toString()}`),
  );
};

export const fetchFestivals = (year: number, month?: number, era: Era = "bs") => {
  const query = buildApiQuery({ era, language: getLanguageForEra(era), year });
  if (month != null) query.set("month", String(month));
  return get<FestivalsResponse>(withPanchangaCacheVersion(`/nepal/festivals?${query.toString()}`));
};

/** Next festivals from today (observer TZ), across the BS-year boundary. */
export const fetchUpcomingFestivals = (
  days = 90,
  limit = 15,
  holidaysOnly = false
) => {
  const params = new URLSearchParams({
    days: String(days),
    limit: String(limit),
  });
  if (holidaysOnly) params.set("holidays_only", "true");
  return get<UpcomingFestivalsResponse>(`/nepal/festivals/upcoming?${params}`);
};

export const saitKeys = {
  years: () => ["sait", "years"] as const,
  entries: (year: number, category: string, location?: LocationParams) =>
    ["sait", SAIT_CACHE_VERSION, year, category, locationCacheKey(location)] as const,
};

export const fetchSaitYears = () => get<{ years: number[] }>("/nepal/sait/years");

export const saitMonthAllKey = (year: number, month: number, location?: LocationParams) =>
  ["sait", "month-all", SAIT_CACHE_VERSION, year, month, locationCacheKey(location)] as const;

export const fetchSaitAbout = () => get<SaitAboutResponse>("/nepal/sait/about");
export const fetchSaitAboutCategory = (category: string) =>
  get<SaitAboutCategory>(`/nepal/sait/${category}/about`);

export const elementKeys = {
  list: () => ["element", "list"] as const,
  spans: (name: string, start: string, end: string, location?: LocationParams) =>
    ["element", "spans", name, start, end, locationCacheKey(location)] as const,
  month: (name: string, bsYear: number, bsMonth: number, location?: LocationParams) =>
    ["element", "month", name, bsYear, bsMonth, locationCacheKey(location)] as const,
  day: (name: string, date: string, location?: LocationParams) =>
    ["element", "day", name, date, locationCacheKey(location)] as const,
};

export const fetchElements = () =>
  get<{ elements: ElementInfo[] }>(withPanchangaCacheVersion("/panchanga/elements")).then(
    (r) => r.elements,
  );

export const fetchElementSpans = (
  name: string,
  range: ElementSpanRange,
  location?: LocationParams,
): Promise<ElementSpansResponse> => {
  // The era middleware turns era + year + month into the JD span server-side.
  // This used to fetch the whole month calendar first just to read its first and
  // last `date_ad` and send them as `start`/`end` — an extra round-trip, and
  // those params no longer exist on the route (the range is Julian Days now), so
  // every element-span request was 400ing.
  const query = new URLSearchParams({
    era: range.era,
    year: String(range.year),
    month: String(range.month),
  });
  return get<ElementSpansResponse>(
    appendLocation(
      withPanchangaCacheVersion(
        `/panchanga/element/${name}/spans?${query.toString()}`,
      ),
      location,
    ),
  );
};

export const fetchElementMonth = (
  name: string,
  bsYear: number,
  bsMonth: number,
  location?: LocationParams,
) =>
  get<ElementMonthResponse>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/element/${name}/month/${bsYear}/${bsMonth}`),
      location,
    ),
  );

// ─── Convertor ────────────────────────────────────────────────────────────────

export const convertorKeys = {
  adToBs: (date: string) => ["convert", "ad-to-bs", date] as const,
  bsToAd: (date: string) => ["convert", "bs-to-ad", date] as const,
};

// ─── Kundali ──────────────────────────────────────────────────────────────────

export const kundaliKeys = {
  udaya: (date: string, era: string, location?: LocationParams) =>
    ["kundali", "udaya", date, era, locationCacheKey(location)] as const,
  atTime: (datetime: string, location?: LocationParams, ayanamsha?: string) =>
    ["kundali", "at-time", datetime, locationCacheKey(location), ayanamsha ?? "lahiri"] as const,
};

export const fetchKundali = (
  date: string,
  era: "bs" | "ad" = "ad",
  location?: LocationParams
) =>
  get<KundaliResponse>(
    appendLocation(`/kundali/${date}?era=${era}`, location)
  );

/**
 * Stream the deterministic kundali report as NDJSON, invoking `onRecord` for
 * each line (header, meta, one per section, then done) so the UI can render
 * sections progressively. Pass an AbortSignal to cancel an in-flight report.
 */
export async function streamKundaliReport(
  moment: InstantQuery,
  location: LocationParams | undefined,
  options: { ayanamsha?: string; lang?: string; force?: boolean } | undefined,
  onRecord: (record: ReportRecord) => void,
  signal?: AbortSignal
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
  if (!res.ok || !res.body) {
    throw new Error(`API ${res.status}: ${path}`);
  }

  const fromCache = res.headers.get("X-Report-Cache") === "hit";

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
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const err = await res.json();
      if (typeof err?.detail === "string") detail = err.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail, path);
  }
  return res.json();
}
