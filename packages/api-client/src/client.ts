/**
 * The request side of the API client, shared by the website and the mobile app.
 *
 * Each app plugs in how a request is actually made — the website calls fetch;
 * the app also answers from its offline download — by calling
 * `configureApiClient()` once, from its lib/api.ts. Everything here builds
 * paths and calls that transport, so a request is written once for both apps.
 *
 * Request URLs are part of the contract: the CDN caches by URL and the app's
 * offline download stores responses under the exact URL its screens ask for.
 * Change a path or the order of its query parameters only on purpose.
 */
import type {
  BhavaReferencePayload,
  CitiesSearchResponse,
  CivilTimeline,
  ConvertAdToBs,
  ConvertBsToAd,
  DashaSystem,
  DashaTreeNode,
  EclipseYearResponse,
  ElementDayResponse,
  GocharIngressResponse,
  GocharResponse,
  GrahaAstaResponse,
  GrahaSthitiResponse,
  GrahaVakriResponse,
  JanmaRashi,
  KundaliDetailResponse,
  KundaliMilanResponse,
  LocationParams,
  MilanPersonQuery,
  NearestCityResponse,
  PanchakYearResponse,
  PanchangaDay,
  PatroApiLimits,
  SaitDetailResponse,
  SaitMonthAllResponse,
  SaitPersonalizeResponse,
  SaitResponse,
  ShadbalaResponse,
  SpecialMonthsResponse,
  SunYearResponse,
  TropicalSeasonsResponse,
  VimshottariResponse,
  YogaReferenceResponse,
} from "./types";
import type { Era } from "@vedic-patro/domain/era";
import type { InstantQuery } from "@vedic-patro/domain/instant";
import {
  appendBirthInstantParams,
  appendInstantParams,
  instantCacheKey,
} from "@vedic-patro/domain/instant";

// ─── Cache versions ───────────────────────────────────────────────────────────
// Appended to cacheable URLs so a backend/engine change mints fresh CDN objects
// instead of serving stale ones. Bump here — one place for both apps.

/** Keep in step with CACHE_PAYLOAD_VERSION in apps/api/services/panchanga_cache.py. */
export const PANCHANGA_CACHE_VERSION = "4703";
/** Sait listings (`sv=`). Bump when the sait engine changes. */
export const SAIT_CACHE_VERSION = "14";
/** Graha sthiti / asta / vakri / eclipse (`gv=`). */
export const GRAHA_CACHE_VERSION = "3";
export const KUNDALI_ENGINE_VERSION = "5";
export const BHAVA_REFERENCE_VERSION = "26";
export const YOGA_REFERENCE_VERSION = "3";

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Error from a failed API call, carrying the backend's own explanation. */
export class ApiError extends Error {
  status: number;
  /** The backend's `detail` — e.g. why a date is out of range. */
  detail: string | undefined;

  constructor(status: number, detail: string | undefined, path: string) {
    super(detail ? `API ${status}: ${detail}` : `API ${status}: ${path}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Reads the backend's `detail` from an error response, if it sent one. */
export async function apiErrorFrom(res: Response, path: string): Promise<ApiError> {
  let detail: string | undefined;
  try {
    const body = await res.clone().json();
    if (typeof body?.detail === "string") detail = body.detail;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, detail, path);
}

// ─── Transport ────────────────────────────────────────────────────────────────

export interface ApiTransport {
  /** Unversioned API base (`…/api`), for the few calls outside the versioned data base. */
  baseUrl: string;
  /** GET a path under the versioned data base (`/panchanga/…`) and parse the JSON. */
  get<T>(path: string): Promise<T>;
  /** Append the location query this app sends (its exact form is part of the URL contract). */
  appendLocation(path: string, location?: LocationParams): string;
  /** Stable fragment identifying a location in query keys and local caches. */
  locationKey(location?: LocationParams): string;
}

let transport: ApiTransport | null = null;

export function configureApiClient(next: ApiTransport): void {
  transport = next;
}

function current(): ApiTransport {
  if (!transport) throw new Error("configureApiClient() must run before any API request");
  return transport;
}

export function get<T>(path: string): Promise<T> {
  return current().get<T>(path);
}

export function appendLocation(path: string, location?: LocationParams): string {
  return current().appendLocation(path, location);
}

export function locationCacheKey(location?: LocationParams): string {
  return current().locationKey(location);
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function withParam(path: string, key: string, value: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${value}`;
}

export const withPanchangaCacheVersion = (path: string) => withParam(path, "cv", PANCHANGA_CACHE_VERSION);
export const withSaitCacheVersion = (path: string) => withParam(path, "sv", SAIT_CACHE_VERSION);
export const withGrahaCacheVersion = (path: string) => withParam(path, "gv", GRAHA_CACHE_VERSION);

/** Rule ids to leave out of a sait computation, as one stable query value. */
export const excludeParam = (excludeRules?: string[]) =>
  excludeRules && excludeRules.length > 0 ? [...new Set(excludeRules)].sort().join(",") : "";

/**
 * Snap raw GPS coordinates to the nearest named city in the GeoNames DB. The
 * backend always returns a city (no distance limit), so "use my location" can
 * resolve to a named place even when the point is far from any town.
 */
export const fetchNearestCity = (lat: number, lon: number, country?: string) => {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (country) params.set("country", country);
  return get<NearestCityResponse>(`/nepal/cities/nearest?${params.toString()}`);
};

/**
 * A saved profile's janma (birth Moon) rashi — 1..12, matching
 * {@link RashifalSignBlock.id}. Send the stored era + civil parts; the API
 * resolves the instant.
 */
export function fetchJanmaRashi(moment: InstantQuery, birthTz: string) {
  const qs = appendBirthInstantParams(new URLSearchParams({ birth_tz: birthTz }), moment).toString();
  return get<JanmaRashi>(`/panchanga/rashifal/janma?${qs}`);
}

export const fetchPanchangaAtTime = (
  datetime: string,
  location?: LocationParams,
  options?: { ayanamsha?: string }
) => {
  const params = new URLSearchParams();
  params.set("datetime", datetime);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  return get<PanchangaDay>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/at-time?${params.toString()}`),
      location,
    ),
  );
};

export const seasonsKeys = {
  tropical: (location?: LocationParams) =>
    ["seasons", "tropical", locationCacheKey(location)] as const,
};

export const fetchTropicalSeasons = (location?: LocationParams) =>
  get<TropicalSeasonsResponse>(appendLocation("/seasons/tropical", location));

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
  options?: { ayanamsha?: string; cycles?: number }
) => {
  const params = appendInstantParams(new URLSearchParams(), moment);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  if (options?.cycles != null) params.set("cycles", String(options.cycles));
  return get<VimshottariResponse>(
    appendLocation(`/kundali/vimshottari?${params.toString()}`, location)
  );
};

export const fetchSait = (year: number, category: string, location?: LocationParams) =>
  get<SaitResponse>(
    withSaitCacheVersion(appendLocation(`/nepal/sait/${year}/${category}`, location)),
  );

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
    excludeParam(excludeRules),
    nakshatraMode && nakshatraMode !== "classical" ? nakshatraMode : "",
  ] as const;

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

export const fetchElementDay = (name: string, dateAd: string, location?: LocationParams) =>
  get<ElementDayResponse>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/element/${name}/day/${dateAd}?era=ad`),
      location,
    ),
  );

export const fetchAdToBs = (date: string) =>
  get<ConvertAdToBs>(`/convert/ad-to-bs/${date}`);

export const fetchBsToAd = (date: string) =>
  get<ConvertBsToAd>(`/convert/bs-to-ad/${date}`);

export const fetchSpecialMonths = (year: number) =>
  get<SpecialMonthsResponse>(`/nepal/special-months/${year}`);

export const shadbalaKeys = {
  atTime: (moment: InstantQuery, location?: LocationParams) =>
    ["shadbala", "at-time", instantCacheKey(moment), locationCacheKey(location)] as const,
};

export const fetchShadbala = (moment: InstantQuery, location?: LocationParams) =>
  get<ShadbalaResponse>(
    appendLocation(
      `/shadbala?${appendInstantParams(new URLSearchParams(), moment).toString()}`,
      location
    )
  );

/** The full 300-combination reference catalog (Raman, Parts I-II). CDN-cached. */
export function fetchYogaReference(): Promise<YogaReferenceResponse> {
  return get<YogaReferenceResponse>(
    `/kundali/yogas/reference?v=${YOGA_REFERENCE_VERSION}`,
  );
}

/** Static graha/bhava reference content — same for every chart, fetched once
 * per session and cached by React Query / the CDN rather than being embedded
 * in every `/kundali/detail` response. */
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

export const fetchKundaliDetail = (
  moment: InstantQuery,
  location?: LocationParams,
  options?: { ayanamsha?: string }
) => {
  const params = appendInstantParams(new URLSearchParams(), moment);
  if (options?.ayanamsha) params.set("ayanamsha", options.ayanamsha);
  params.set("ev", KUNDALI_ENGINE_VERSION);
  return get<KundaliDetailResponse>(
    appendLocation(`/kundali/detail?${params.toString()}`, location)
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
    `/kundali/dasha/expand?${params.toString()}`
  );
};

export const milanKeys = {
  match: (
    boy: MilanPersonQuery,
    girl: MilanPersonQuery,
    ayanamsha?: string,
    lang?: string
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
  options?: { ayanamsha?: string; lang?: string }
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

// ─── Era-aware year listings ─────────────────────────────────────────────────

/**
 * `era`, `language` and the optional `year`, in that order — the order the
 * mobile app's offline downloads were saved under.
 */
export function eraQuery(era: Era = "bs", year?: number): string {
  const language = era === "ad" || era === "bc" ? "en" : "ne";
  const params = new URLSearchParams({ era, language });
  if (year != null) params.set("year", String(year));
  return params.toString();
}

export const fetchGrahaAstaYear = (year: number, location?: LocationParams, era: Era = "bs") =>
  get<GrahaAstaResponse>(
    appendLocation(
      withGrahaCacheVersion(`/nepal/graha-asta/year/${year}?${eraQuery(era, year)}`),
      location,
    ),
  );

export const fetchGrahaVakriYear = (year: number, location?: LocationParams, era: Era = "bs") =>
  get<GrahaVakriResponse>(
    appendLocation(
      withGrahaCacheVersion(`/nepal/graha-vakri/year/${year}?${eraQuery(era, year)}`),
      location,
    ),
  );

export const fetchEclipseYear = (
  kind: "solar" | "lunar",
  year: number,
  location?: LocationParams,
  era: Era = "bs",
) =>
  get<EclipseYearResponse>(
    appendLocation(
      withGrahaCacheVersion(`/nepal/eclipse/${kind}/year/${year}?${eraQuery(era, year)}`),
      location,
    ),
  );

export const fetchPanchakYear = (year: number, location?: LocationParams, era: Era = "bs") =>
  get<PanchakYearResponse>(
    appendLocation(`/nepal/panchak/year/${year}?${eraQuery(era, year)}`, location),
  );

export const fetchYearSunTimes = (year: number, era: Era = "bs", location?: LocationParams) =>
  get<SunYearResponse>(
    appendLocation(`/panchanga/year/${year}/sun?${eraQuery(era, year)}`, location),
  );

// ─── Cities ───────────────────────────────────────────────────────────────────

export const cityKeys = {
  search: (q: string, country?: string) => ["cities", "search", q, country ?? "all"] as const,
  popular: () => ["cities", "popular"] as const,
};

export const searchCities = (q: string, limit = 15, country?: string) => {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (country) params.set("country", country);
  return get<CitiesSearchResponse>(`/nepal/cities/search?${params.toString()}`);
};

// ─── Sait ─────────────────────────────────────────────────────────────────────

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

// ─── Gochar ───────────────────────────────────────────────────────────────────

export const fetchGocharIngress = (
  from: string,
  to: string,
  location?: LocationParams,
  options?: { level?: "pada" | "nakshatra" | "rashi" | "patro" | "udayast"; era?: Era },
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



// ─── Meta ─────────────────────────────────────────────────────────────────────

/** Host-owned year bounds and cache version — not mirrored in the client. */
export const fetchPatroCapabilities = async (): Promise<PatroApiLimits> => {
  const path = "/meta/capabilities";
  const res = await fetch(`${current().baseUrl}${path}`);
  if (!res.ok) throw await apiErrorFrom(res, path);
  return res.json();
};

// ─── Day panchanga ────────────────────────────────────────────────────────────

export const fetchCivilTimeline = (date: string, era: Era = "ad", location?: LocationParams) =>
  get<{ civil_timeline: CivilTimeline }>(
    appendLocation(
      withPanchangaCacheVersion(`/panchanga/${date}?era=${era}&detail=false&civil=true`),
      location,
    ),
  ).then((r) => r.civil_timeline);

// ─── Gochar and graha detail ──────────────────────────────────────────────────

export const gocharKeys = {
  day: (jdUt: number, location?: LocationParams) =>
    ["gochar", "jd", jdUt, locationCacheKey(location)] as const,
  dayLegacy: (date: string, era: string, location?: LocationParams) =>
    ["gochar", date, era, locationCacheKey(location)] as const,
  ingress: (from: string, to: string, level: string, location?: LocationParams) =>
    ["gochar", "ingress", from, to, level, locationCacheKey(location)] as const,
  ingressEra: (from: string, to: string, level: string, era: string, location?: LocationParams) =>
    ["gochar", "ingress", from, to, level, era, locationCacheKey(location)] as const,
};

export const fetchGochar = (date: string, era: Era = "ad", location?: LocationParams) =>
  get<GocharResponse>(appendLocation(`/nepal/gochar/${date}?era=${era}`, location));

export const grahaDetailKeys = {
  sthiti: (dateKey: string, apiEra: string, location?: LocationParams) =>
    ["graha", "sthiti", GRAHA_CACHE_VERSION, apiEra, dateKey, locationCacheKey(location)] as const,
  asta: (year: number, location?: LocationParams, era: string = "bs") =>
    ["graha", "asta", GRAHA_CACHE_VERSION, era, year, locationCacheKey(location)] as const,
  vakri: (year: number, location?: LocationParams, era: string = "bs") =>
    ["graha", "vakri", GRAHA_CACHE_VERSION, era, year, locationCacheKey(location)] as const,
  eclipse: (kind: "solar" | "lunar", year: number, location?: LocationParams, era: string = "bs") =>
    ["graha", "eclipse", GRAHA_CACHE_VERSION, kind, era, year, locationCacheKey(location)] as const,
};

export const fetchGrahaSthiti = (dateKey: string, location?: LocationParams, apiEra: Era = "ad") =>
  get<GrahaSthitiResponse>(
    appendLocation(withGrahaCacheVersion(`/nepal/graha-sthiti/${dateKey}?era=${apiEra}`), location),
  );

export const panchakKeys = {
  year: (year: number, location?: LocationParams, era: string = "bs") =>
    ["panchak", era, year, locationCacheKey(location)] as const,
};

export const saitKeys = {
  years: () => ["sait", "years"] as const,
  entries: (year: number, category: string, location?: LocationParams) =>
    ["sait", SAIT_CACHE_VERSION, year, category, locationCacheKey(location)] as const,
};


