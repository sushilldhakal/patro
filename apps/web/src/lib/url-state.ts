import type { LocationParams } from "@/lib/api";
import {
  buildPageSearch,
  getLanguageForEra,
  parseEraFromUrl,
  type Era,
  type EraSelection,
} from "@/lib/era";
import {
  readCalendarEra,
  validatePatroBrowseMonth,
  type CalendarEra,
  type PatroMonthBrowseSearch,
  type PatroYearBrowseSearch,
} from "@/lib/patro-era";
import type { PatroMonthBrowse } from "@/hooks/use-patro-month-browse";
import type { PatroYearBrowse } from "@/hooks/use-patro-year-browse";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { ELEMENT_BY_ID } from "@/lib/panchanga-elements";
import {
  buildPatroDayPageSearch,
  parsePatroDayUrl,
  type PatroDayFetchState,
} from "@/lib/patro-day-url";
import { getCurrentBs } from "@/lib/bs-calendar";
import {
  normalizePatroBrowseRange,
  type PatroBrowseRange,
} from "@/lib/patro-browse-range";

/**
 * Shareable URL state.
 *
 * The app is a single-page Vite build; nginx falls back to `index.html` for
 * any unknown path, so the "server" already serves any route. What makes a view
 * shareable is encoding the user's selections (date, time, month, paksha,
 * location, …) into the URL search params and reading them back on load — the
 * same approach the `/panchanga/year` route already uses for `year`.
 *
 * These helpers parse/validate the raw search object (used by each route's
 * `validateSearch`) and convert a chosen location to/from search params.
 */

/** Location-describing search params, shared across patro pages. */
export interface LocationSearch {
  /** Numeric city id understood by the API. */
  city?: number;
  /** Latitude for a coordinate-based location. */
  lat?: number;
  /** Longitude for a coordinate-based location. */
  lon?: number;
  /** IANA timezone, e.g. "Asia/Kathmandu". */
  tz?: string;
  /** Human-readable place label, preserved so shared links show the same name. */
  place?: string;
}

export interface PanchangaSearch extends LocationSearch {
  /** Display era — labels only; does not parse date keys. */
  era?: CalendarEra;
  language?: "en" | "ne";
  /** Civil-day Julian identity (from API `jd_ut`). */
  jd?: number;
  /** Input calendar when year/month/day name a civil or Vikram day. */
  inputEra?: CalendarEra;
  year?: number;
  month?: number;
  day?: number;
  /** Day vs. month view. */
  view?: "day" | "month";
  /** Sunrise (udaya) vs. instant (समय-आधारित) reckoning. */
  mode?: "udaya" | "instant";
  /** Clock for instant mode, "HH:MM". */
  time?: string;
}

export interface DainikKrantiSearch extends LocationSearch, PatroMonthBrowseSearch {
  /** Paksha filter. */
  paksha?: "all" | "krishna" | "shukla";
}

export interface PanchangaYearSearch extends LocationSearch, PatroYearBrowseSearch {
  /** Range end (inclusive) browse year. Omitted / equal to `year` ⇒ single year. */
  to?: number;
  /** Range start month (1–12). Default 1. */
  month?: number;
  /** Range end month (1–12). Default 12 when `to` is set. */
  toMonth?: number;
}

export interface AbhijitSearch extends LocationSearch, PatroMonthBrowseSearch {}

/** Element detail pages — day browse (`date`) and span month browse (`era`/`year`/`month`). */
export type ElementPageSearch = LocationSearch & PanchangaSearch & PatroMonthBrowseSearch;

function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toInt(v: unknown): number | undefined {
  const n = toNum(v);
  return n != null ? Math.trunc(n) : undefined;
}

function toStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/** Shareable clock (`HH:MM`). Accepts `H:MM` / `HH:MM:SS` so URL sync cannot ping-pong. */
function normalizeClock(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const match = v.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function validClock(v: unknown): string | undefined {
  return normalizeClock(v);
}

/** Keys owned by day-browse routes (panchanga day, gochar, and the graha-sthiti alias) — not month/span grids. */
const PATRO_DAY_ONLY_SEARCH_KEYS = [
  "jd",
  "day",
  "inputEra",
  "time",
  "mode",
  "view",
] as const;

export function stripPatroDayOnlySearchKeys(
  search: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...search };
  for (const key of PATRO_DAY_ONLY_SEARCH_KEYS) {
    delete out[key];
  }
  return out;
}

/** Router search update that drops day-browse keys (TanStack treats `undefined` as remove). */
export function patroMonthGridNavigateSearch(
  desired: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...desired,
    jd: undefined,
    day: undefined,
    inputEra: undefined,
    time: undefined,
    mode: undefined,
    view: undefined,
  };
}

/** True when the URL names a specific calendar day (era y/m/d), not just a month grid. */
export function hasPatroDayUrlIdentity(search: Record<string, unknown>): boolean {
  const y = toInt(search.year);
  const m = toInt(search.month);
  const d = toInt(search.day);
  return y != null && m != null && d != null;
}

function fallbackLanguageFromUi(): "en" | "ne" {
  return readCalendarEra() === "ad" ? "en" : "ne";
}

function eraSelectionFromYearBrowse(browse: PatroYearBrowse): EraSelection {
  return {
    era: browse.era,
    language: getLanguageForEra(browse.era),
    year: browse.year,
  };
}

function eraSelectionFromMonthBrowse(browse: PatroMonthBrowse): EraSelection {
  return {
    era: browse.era,
    language: getLanguageForEra(browse.era),
    year: browse.year,
    month: browse.month,
  };
}

/** Pull the location-describing keys out of a raw search object. */
export function validateLocationSearch(search: Record<string, unknown>): LocationSearch {
  const out: LocationSearch = {};
  const city = toInt(search.city);
  if (city != null) out.city = city;
  const lat = toNum(search.lat);
  if (lat != null) out.lat = lat;
  const lon = toNum(search.lon);
  if (lon != null) out.lon = lon;
  const tz = toStr(search.tz);
  if (tz) out.tz = tz;
  const place = toStr(search.place);
  if (place) out.place = place;
  return out;
}

/** Encode a chosen location as search params. */
export function locationToSearch(loc: PanchangaLocation): LocationSearch {
  const { params, label } = loc;
  const out: LocationSearch = {};
  /* `city_id` wins when there is one, matching how appendLocation builds the
     request: a city pick now carries its coordinates as well, and encoding
     those instead would switch the API from city resolution to raw lat/lon and
     rewrite every shared city URL. Coordinate picks have no id and still
     encode as lat/lon. */
  if (params.city_id != null) {
    out.city = params.city_id;
  } else if (params.lat != null && params.lon != null) {
    out.lat = params.lat;
    out.lon = params.lon;
  }
  if (params.timezone) out.tz = params.timezone;
  if (label) out.place = label;
  return out;
}

/** Build era-aware month browse search params (+ optional route-specific keys). */
export function buildPatroMonthBrowseSearch(
  loc: PanchangaLocation,
  browse: PatroMonthBrowse,
  extra?: Record<string, unknown>,
): PatroMonthBrowseSearch & LocationSearch {
  const mergedExtra: Record<string, unknown> = {};
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      // Omit default paksha so URLs stay stable and sameSearch matches validated search.
      if (key === "paksha" && (value === "all" || value == null)) continue;
      mergedExtra[key] = value;
    }
  }
  return {
    ...locationToSearch(loc),
    ...buildPageSearch(eraSelectionFromMonthBrowse(browse), mergedExtra),
  } as PatroMonthBrowseSearch & LocationSearch;
}

/** Build era-aware year browse search params (+ optional route-specific keys). */
export function buildPatroYearBrowseSearch(
  loc: PanchangaLocation | undefined,
  browse: PatroYearBrowse,
  extra?: Record<string, unknown>,
): PatroYearBrowseSearch & LocationSearch {
  return {
    ...(loc ? locationToSearch(loc) : {}),
    ...buildPageSearch(eraSelectionFromYearBrowse(browse), extra),
  } as PatroYearBrowseSearch & LocationSearch;
}

/** Shareable `/dainikkranti` search — location + era-aware month on screen. */
export function buildDainikKrantiSearch(
  loc: PanchangaLocation,
  year: number,
  month: number,
  paksha: NonNullable<DainikKrantiSearch["paksha"]> = "all",
  era: CalendarEra = readCalendarEra(),
): DainikKrantiSearch {
  const selection: EraSelection = {
    era: era as Era,
    language: getLanguageForEra(era as Era),
    year,
    month,
  };
  return {
    ...locationToSearch(loc),
    ...buildPageSearch(selection, { paksha }),
  } as DainikKrantiSearch;
}

/** Build era-aware month–year range search (Panchanga year wheel). */
export function buildPatroYearRangeSearch(
  loc: PanchangaLocation,
  era: CalendarEra,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): PanchangaYearSearch & LocationSearch {
  const selection: EraSelection = {
    era: era as Era,
    language: getLanguageForEra(era as Era),
    year: startYear,
    month: startMonth > 1 ? startMonth : undefined,
  };
  const extra: Record<string, number> = {};
  if (endYear > startYear) {
    extra.to = endYear;
    if (endMonth !== 12) extra.toMonth = endMonth;
  } else if (startMonth > 1 || endMonth !== 12) {
    extra.toMonth = endMonth;
  }
  return {
    ...locationToSearch(loc),
    ...buildPageSearch(selection, Object.keys(extra).length ? extra : undefined),
  } as PanchangaYearSearch & LocationSearch;
}

/** Build shareable day-browse search (panchanga, graha sthiti, element tables). */
export function buildPatroDaySearch(
  loc: PanchangaLocation,
  state: PatroDayFetchState,
): PanchangaSearch & LocationSearch {
  return {
    ...locationToSearch(loc),
    ...buildPatroDayPageSearch(state),
  } as PanchangaSearch & LocationSearch;
}

/** Stable key for location params in the URL (ignores `place` label). */
export function locationSearchFingerprint(search: LocationSearch): string {
  return JSON.stringify({
    city: search.city ?? null,
    lat: search.lat ?? null,
    lon: search.lon ?? null,
    tz: search.tz ?? null,
  });
}

/**
 * Router search for day-browse routes — clears keys that fight day identity
 * (TanStack merges search; stale `year`/`month` + `jd` caused validate loops).
 */
export function patroDayBrowseNavigateSearch(
  loc: PanchangaLocation,
  state: PatroDayFetchState,
): Record<string, unknown> {
  const base = buildPatroDaySearch(loc, state) as Record<string, unknown>;
  if (state.kind === "input") {
    return { ...base, jd: undefined };
  }
  return {
    ...base,
    jd: undefined,
    year: undefined,
    month: undefined,
    day: undefined,
    inputEra: undefined,
  };
}

/** Build shareable panchanga search — day + clock time + location. */
export function buildPatroPanchangaSearch(
  loc: PanchangaLocation,
  state: PatroDayFetchState,
  time: string,
): PanchangaSearch & LocationSearch {
  return {
    ...buildPatroDaySearch(loc, state),
    time,
  };
}
export function currentPatroMonthLinkSearch(
  loc: PanchangaLocation,
  era: CalendarEra = readCalendarEra(),
): DainikKrantiSearch {
  const selection: EraSelection = {
    era: era as Era,
    language: getLanguageForEra(era as Era),
  };
  return {
    ...locationToSearch(loc),
    ...buildPageSearch(selection, { paksha: "all" }),
  } as DainikKrantiSearch;
}

/** Shareable year-browse search (holidays, suryakranti, graha yearly, sait, …). */
export function currentPatroYearLinkSearch(
  loc: PanchangaLocation,
  era: CalendarEra = readCalendarEra(),
): PatroYearBrowseSearch & LocationSearch {
  const selection: EraSelection = {
    era: era as Era,
    language: getLanguageForEra(era as Era),
  };
  return {
    ...locationToSearch(loc),
    ...buildPageSearch(selection),
  } as PatroYearBrowseSearch & LocationSearch;
}

/** Shareable day-browse search (panchanga, graha sthiti, gochar, element tables). */
export type PatroDayLinkBrowse = {
  era?: CalendarEra;
  year?: number;
  month?: number;
  day?: number;
};

export function currentPatroDayLinkSearch(
  loc: PanchangaLocation,
  optionsOrLegacyDateAd?: string | PatroDayLinkBrowse,
  eraLegacy: CalendarEra = readCalendarEra(),
): PanchangaSearch & LocationSearch {
  let browse: PatroDayLinkBrowse = { era: eraLegacy };
  if (typeof optionsOrLegacyDateAd === "object" && optionsOrLegacyDateAd != null) {
    browse = { ...browse, ...optionsOrLegacyDateAd };
  }
  const displayEra = (browse.era ?? eraLegacy) as Era;
  const display = {
    era: displayEra,
    language: getLanguageForEra(displayEra),
  };

  if (browse.year != null && browse.month != null && browse.day != null) {
    const inputEra: Era =
      displayEra === "bbs"
        ? "bbs"
        : displayEra === "bc"
          ? "bc"
          : displayEra === "ad"
            ? "ad"
            : "bs";
    return buildPatroDaySearch(loc, {
      kind: "input",
      inputEra,
      year: browse.year,
      month: browse.month,
      day: browse.day,
      display,
    });
  }

  if (browse.year != null && browse.month != null) {
    return {
      ...locationToSearch(loc),
      ...buildPageSearch({
        era: displayEra,
        language: display.language,
        year: browse.year,
        month: browse.month,
      }),
    } as PanchangaSearch & LocationSearch;
  }

  return buildPatroDaySearch(loc, {
    kind: "today",
    display,
  });
}

/** Location-only share link (ritu, converter with a place). */
export function currentPatroLocationLinkSearch(loc: PanchangaLocation): LocationSearch {
  return locationToSearch(loc);
}

/** Shareable panchanga year wheel search (same day keys as daily panchanga). */
export function currentPatroYearRangeLinkSearch(
  loc: PanchangaLocation,
  era: CalendarEra = readCalendarEra(),
): PanchangaSearch & LocationSearch {
  return currentPatroDayLinkSearch(loc, { era });
}

/** Element detail pages — span (month) vs table (day) pick the right URL keys. */
export function patroElementLinkSearch(
  elementId: string,
  loc: PanchangaLocation,
  era: CalendarEra = readCalendarEra(),
): ElementPageSearch {
  const meta = ELEMENT_BY_ID[elementId];
  if (meta?.kind === "table") {
    return currentPatroDayLinkSearch(loc);
  }
  const selection: EraSelection = {
    era: era as Era,
    language: getLanguageForEra(era as Era),
  };
  return {
    ...locationToSearch(loc),
    ...buildPageSearch(selection),
  } as ElementPageSearch;
}

/**
 * Best-effort shareable search for a patro route path.
 * Used by sidebar, home quick links, and directory cards.
 */
export function patroRouteLinkSearch(
  route: string,
  loc: PanchangaLocation,
  era: CalendarEra = readCalendarEra(),
  browse?: PatroDayLinkBrowse,
): Record<string, unknown> {
  const normalized = route.replace(/\/$/, "");
  const dayBrowse: PatroDayLinkBrowse = { era, ...browse };
  if (normalized === "/ritu" || normalized === "/converter") {
    return currentPatroLocationLinkSearch(loc) as Record<string, unknown>;
  }
  if (normalized === "/dainikkranti" || normalized === "/abhijit-muhurta") {
    return currentPatroMonthLinkSearch(loc, era) as Record<string, unknown>;
  }
  if (normalized === "/panchanga/year") {
    return currentPatroYearRangeLinkSearch(loc, era) as Record<string, unknown>;
  }
  if (normalized === "/gochar" || normalized === "/panchanga/graha-sthiti" || normalized === "/panchanga") {
    return currentPatroDayLinkSearch(loc, dayBrowse) as Record<string, unknown>;
  }
  if (
    normalized === "/holidays" ||
    normalized === "/suryakranti" ||
    normalized === "/panchak-patro" ||
    normalized === "/panchanga/graha-asta" ||
    normalized === "/panchanga/graha-vakri" ||
    normalized === "/panchanga/chandra-grahan" ||
    normalized === "/panchanga/surya-grahan"
  ) {
    return currentPatroYearLinkSearch(loc, era) as Record<string, unknown>;
  }
  if (normalized.startsWith("/sait/")) {
    return currentPatroYearLinkSearch(loc, era) as Record<string, unknown>;
  }
  if (normalized.startsWith("/panchanga/element/")) {
    const elementId = normalized.split("/").pop() ?? "";
    return patroElementLinkSearch(elementId, loc, era) as Record<string, unknown>;
  }
  return currentPatroLocationLinkSearch(loc) as Record<string, unknown>;
}

/** Year browse with an explicit year (e.g. home sait aside for the visible BS year). */
export function patroYearLinkSearch(
  loc: PanchangaLocation,
  year: number,
  era: CalendarEra = readCalendarEra(),
): PatroYearBrowseSearch & LocationSearch {
  const selection: EraSelection = {
    era: era as Era,
    language: getLanguageForEra(era as Era),
    year,
  };
  return {
    ...locationToSearch(loc),
    ...buildPageSearch(selection),
  } as PatroYearBrowseSearch & LocationSearch;
}

/**
 * Reconstruct a location from search params, or `undefined` when the URL
 * carries no location (so callers can fall back to the stored preference).
 */
export function searchToLocation(search: LocationSearch): PanchangaLocation | undefined {
  if (search.lat != null && search.lon != null) {
    return {
      label: search.place ?? `${search.lat.toFixed(2)}°, ${search.lon.toFixed(2)}°`,
      params: {
        lat: search.lat,
        lon: search.lon,
        ...(search.tz ? { timezone: search.tz } : {}),
      },
    };
  }
  if (search.city != null) {
    return {
      label: search.place ?? `City #${search.city}`,
      params: {
        city_id: search.city,
        ...(search.tz ? { timezone: search.tz } : {}),
      },
    };
  }
  return undefined;
}

/** Whether two location param sets resolve to the same place. */
export function sameLocationParams(a: LocationParams, b: LocationParams): boolean {
  /* Same city id is the same place, whatever else rides along. A location built
     from a URL carries only the id, while the same city picked in the selector
     also carries its coordinates — comparing field by field would call those
     two different and let the URL copy overwrite the richer one, dropping the
     coordinates the 3D sky places the observer from. */
  if (a.city_id != null && b.city_id != null) return a.city_id === b.city_id;
  return (
    a.city_id === b.city_id &&
    a.lat === b.lat &&
    a.lon === b.lon &&
    a.city === b.city &&
    a.timezone === b.timezone
  );
}

/** Shallow equality for two search objects (union of keys; missing paksha = "all"). */
export function sameSearch(a: object, b: object): boolean {
  const ae = a as Record<string, unknown>;
  const be = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ae), ...Object.keys(be)]);
  return [...keys].every((k) => {
    let av = ae[k];
    let bv = be[k];
    if (k === "paksha") {
      av = av ?? "all";
      bv = bv ?? "all";
    }
    if (k === "time") {
      av = normalizeClock(av) ?? av;
      bv = normalizeClock(bv) ?? bv;
    }
    return av === bv;
  });
}

export function validatePanchangaSearch(search: Record<string, unknown>): PanchangaSearch {
  const out: PanchangaSearch = { ...validateLocationSearch(search) };
  const withoutJd = { ...search };
  delete withoutJd.jd;
  const parsed = parsePatroDayUrl(withoutJd, fallbackLanguageFromUi());
  Object.assign(out, buildPatroDayPageSearch(parsed));
  delete (out as Record<string, unknown>).jd;
  if (search.view === "day" || search.view === "month") out.view = search.view;
  if (search.mode === "udaya" || search.mode === "instant") out.mode = search.mode;
  const time = validClock(search.time);
  if (time) out.time = time;
  return out;
}

export function validatePatroMonthBrowseSearch(
  search: Record<string, unknown>,
): PatroMonthBrowseSearch & LocationSearch {
  const out: PatroMonthBrowseSearch & LocationSearch = { ...validateLocationSearch(search) };
  const parsed = parseEraFromUrl(search, fallbackLanguageFromUi());
  out.era = parsed.era as CalendarEra;
  out.language = parsed.language;
  if (parsed.year != null) out.year = parsed.year;

  const month = validatePatroBrowseMonth(toInt(search.month));
  if (month != null) out.month = month;
  return out;
}

export function validatePatroYearBrowseSearch(
  search: Record<string, unknown>,
): PatroYearBrowseSearch & LocationSearch {
  const out: PatroYearBrowseSearch & LocationSearch = { ...validateLocationSearch(search) };
  const parsed = parseEraFromUrl(search, fallbackLanguageFromUi());
  out.era = parsed.era as CalendarEra;
  out.language = parsed.language;
  if (parsed.year != null) out.year = parsed.year;
  return out;
}

/** Nepal holiday/festival lists are keyed by BS or AD year only — not BC/BBS browse. */
export function validateHolidaysSearch(
  search: Record<string, unknown>,
): PatroYearBrowseSearch & LocationSearch {
  const out = validatePatroYearBrowseSearch(search);
  if (out.era === "bc" || out.era === "bbs") {
    out.era = "bs";
  }
  return out;
}

export function validateDainikKrantiSearch(
  search: Record<string, unknown>
): DainikKrantiSearch {
  const out: DainikKrantiSearch = { ...validatePatroMonthBrowseSearch(search) };
  if (
    search.paksha === "all" ||
    search.paksha === "krishna" ||
    search.paksha === "shukla"
  ) {
    out.paksha = search.paksha;
  }
  return out;
}

export function validatePanchangaYearSearch(
  search: Record<string, unknown>,
): PanchangaYearSearch {
  const out: PanchangaYearSearch = { ...validatePatroYearBrowseSearch(search) };
  const to = toInt(search.to);
  if (to != null && to >= 1 && (out.year == null || to >= out.year)) {
    out.to = to;
  }
  const month = toInt(search.month);
  if (month != null && month >= 1 && month <= 12) {
    out.month = month;
  }
  const toMonth = toInt(search.toMonth);
  if (toMonth != null && toMonth >= 1 && toMonth <= 12) {
    out.toMonth = toMonth;
  }
  return out;
}

/** Panchanga year wheel URL → inclusive month–year browse range. */
export function panchangaYearSearchToBrowseRange(
  search: PanchangaYearSearch,
  fallbackEra: CalendarEra = readCalendarEra(),
): PatroBrowseRange {
  const era = (search.era ?? fallbackEra) as Era;
  const startYear = search.year ?? getCurrentBs().year;
  const startMonth = search.month ?? 1;
  const endYear = search.to ?? startYear;
  const endMonth = search.toMonth ?? 12;
  return normalizePatroBrowseRange({
    era,
    startYear,
    startMonth,
    endYear,
    endMonth,
  });
}

export function validateAbhijitSearch(search: Record<string, unknown>): AbhijitSearch {
  return validatePatroMonthBrowseSearch(search);
}

export function validateElementPageSearch(
  search: Record<string, unknown>,
): ElementPageSearch {
  const month = validatePatroMonthBrowseSearch(search);
  const hasMonthGrid =
    toInt(search.year) != null &&
    toInt(search.month) != null &&
    toInt(search.day) == null;
  // Month-span element pages (tithi, nakshatra, …): era+year+month without day.
  if (hasMonthGrid || !hasPatroDayUrlIdentity(search)) {
    return stripPatroDayOnlySearchKeys(
      month as Record<string, unknown>,
    ) as ElementPageSearch;
  }
  const withoutJd = { ...search };
  delete withoutJd.jd;
  return {
    ...month,
    ...validatePanchangaSearch(withoutJd),
  } as ElementPageSearch;
}

/** Graha sthiti and other single-day browse pages. */
export function validateGrahaDaySearch(
  search: Record<string, unknown>,
): PanchangaSearch {
  return validatePanchangaSearch(search);
}
