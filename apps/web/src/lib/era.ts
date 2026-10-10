/**
 * The frontend's only calendar-aware module — and it performs no calendar arithmetic.
 *
 * The backend is the single source of truth for every conversion (see
 * `engine/calendar/era.py` and `app/era_middleware.py`). This module's entire job
 * is to decide *which era and language a page is in* and to move that decision
 * between the URL and the API. It never converts a date.
 *
 * Day pages: see `@/lib/patro-day-url` — JD identity, `inputEra` for parsing,
 * `era` for display only. Month/year browse below uses era + y/m as grid coords.
 *     API  ->  (already-rendered labels, displayed verbatim)
 *
 * Deliberately absent, and must stay absent:
 *   - BS <-> AD conversion of any kind
 *   - month lengths, year starts, leap rules
 *   - "is this year in the offline table" checks
 *
 * If a component needs a date in another era, it asks the backend, which returns
 * every era's label alongside the Julian Day it computed from.
 */

/** The four eras. All of them take a **positive** year — the era carries the sign. */
export const ERA_CODES = ["ad", "bc", "bs", "bbs"] as const;

export type Era = (typeof ERA_CODES)[number];

export type Language = "en" | "ne";

/** Era -> UI language. Vikram eras render Nepali, Gregorian eras English. */
const ERA_LANGUAGE: Record<Era, Language> = {
  bs: "ne",
  bbs: "ne",
  ad: "en",
  bc: "en",
};

/** Eras that count backwards from their epoch — useful for labelling, not for maths. */
const DESCENDING_ERAS: ReadonlySet<Era> = new Set<Era>(["bc", "bbs"]);

export interface EraSelection {
  era: Era;
  language: Language;
  year?: number;
  month?: number;
  day?: number;
}

export function isEra(value: unknown): value is Era {
  return typeof value === "string" && (ERA_CODES as readonly string[]).includes(value);
}

/** `ne` for bs/bbs, `en` for ad/bc. Localisation only — never arithmetic. */
export function getLanguageForEra(era: Era): Language {
  return ERA_LANGUAGE[era];
}

export function isDescendingEra(era: Era): boolean {
  return DESCENDING_ERAS.has(era);
}

/** Paired era on the other side of year 1 (Vikram BS↔BBS, Gregorian AD↔BC). */
export function togglePatroBrowseEra(era: Era): Era | null {
  switch (era) {
    case "bs":
      return "bbs";
    case "bbs":
      return "bs";
    case "ad":
      return "bc";
    case "bc":
      return "ad";
    default:
      return null;
  }
}

export function isPatroBrowseEraPair(era: Era): era is "bs" | "bbs" | "ad" | "bc" {
  return era === "bs" || era === "bbs" || era === "ad" || era === "bc";
}

/** The era a UI language defaults to when a URL names none. */
export function defaultEraForLanguage(language: Language): Era {
  return language === "ne" ? "bs" : "ad";
}

function toPositiveInt(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const truncated = Math.trunc(n);
  return truncated >= 1 ? truncated : undefined;
}

function parseLanguage(raw: unknown, era: Era): Language {
  if (raw === "en" || raw === "ne") return raw;
  return getLanguageForEra(era);
}

/**
 * Read era + date parts out of a raw search object.
 *
 * A negative `year` is rejected rather than translated: the signed form
 * (`era=bs&year=-10`) is the old encoding, and `era=bbs&year=10` replaces it.
 * Silently accepting both would put two spellings of one date into shareable
 * URLs, and the backend rejects the signed form too.
 */
export function parseEraFromUrl(
  search: Record<string, unknown>,
  fallbackLanguage: Language = "ne",
): EraSelection {
  const era = isEra(search.era) ? search.era : defaultEraForLanguage(fallbackLanguage);
  return {
    era,
    language: parseLanguage(search.language, era),
    year: toPositiveInt(search.year),
    month: toPositiveInt(search.month),
    day: toPositiveInt(search.day),
  };
}

/** True when the URL names a full day in the active era (not “today”). */
export function hasExplicitDaySelection(selection: EraSelection): boolean {
  return (
    selection.year != null &&
    selection.month != null &&
    selection.day != null
  );
}

/** Query params for the API. Forwards the era and the numbers, converting nothing. */
export function buildApiQuery(
  selection: EraSelection,
  extra?: Record<string, string | number | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("era", selection.era);
  if (selection.year != null) params.set("year", String(selection.year));
  if (selection.month != null) params.set("month", String(selection.month));
  if (selection.day != null) params.set("day", String(selection.day));
  params.set("language", selection.language);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  return params;
}

/** Shareable page URL for a selection — the same keys the API receives. */
export function buildPageUrl(
  path: string,
  selection: EraSelection,
  extra?: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  params.set("era", selection.era);
  if (selection.year != null) params.set("year", String(selection.year));
  if (selection.month != null) params.set("month", String(selection.month));
  if (selection.day != null) params.set("day", String(selection.day));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Search-object form of {@link buildPageUrl}, for router `search` props. */
export function buildPageSearch(
  selection: EraSelection,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...extra, era: selection.era };
  if (selection.year != null) out.year = selection.year;
  if (selection.month != null) out.month = selection.month;
  if (selection.day != null) out.day = selection.day;
  out.language = selection.language;
  return out;
}

/** Switch era, keeping the numbers. The backend re-interprets them in the new era. */
export function withEra(selection: EraSelection, era: Era): EraSelection {
  return { ...selection, era, language: getLanguageForEra(era) };
}
