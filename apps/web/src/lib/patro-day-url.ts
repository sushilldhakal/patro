/**
 * Day-browse URL + API identity — Julian Day is the neutral key.
 *
 * - `inputEra` + year/month/day — shareable page URL identity (JD stays on the server)
 * - `era` — display calendar + language default only (does NOT parse path/date keys)
 *
 * Month/year browse (`EraSelection` in era.ts) still uses era + y/m as grid coordinates.
 */

import {
  getLanguageForEra,
  isEra,
  type Era,
  type Language,
} from "@/lib/era";
import { adToBS } from "@/lib/bs-calendar";
import { parseCivilIso } from "@/lib/patro-day";

export type PatroDisplayContext = {
  era: Era;
  language: Language;
};

/**
 * Display context for a day that is presented as a Gregorian date in English.
 *
 * For callers that already hold a civil `date_ad` from the backend and want it
 * rendered the same way. It says nothing about how the day was addressed —
 * that is `inputEra`'s job.
 */
export const AD_DISPLAY: PatroDisplayContext = { era: "ad", language: "en" };

export type PatroDayFetchState =
  | { kind: "jd"; jd: number; display: PatroDisplayContext }
  | { kind: "today"; display: PatroDisplayContext }
  | {
      kind: "input";
      inputEra: Era;
      year: number;
      month: number;
      day: number;
      display: PatroDisplayContext;
    };

function toPositiveInt(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const t = Math.trunc(n);
  return t >= 1 ? t : undefined;
}

function parseLanguage(raw: unknown, displayEra: Era): Language {
  if (raw === "en" || raw === "ne") return raw;
  return getLanguageForEra(displayEra);
}

function parseDisplay(search: Record<string, unknown>, fallbackLanguage: Language): PatroDisplayContext {
  const era = isEra(search.era) ? search.era : fallbackLanguage === "en" ? "ad" : "bs";
  return {
    era,
    language: parseLanguage(search.language, era),
  };
}

/** Read day identity + display context from router search (panchanga, graha day, …). */
export function parsePatroDayUrl(
  search: Record<string, unknown>,
  fallbackLanguage: Language = "ne",
): PatroDayFetchState {
  const display = parseDisplay(search, fallbackLanguage);
  // Julian day is resolved server-side only — never read `jd` from the router URL.

  const year = toPositiveInt(search.year);
  const month = toPositiveInt(search.month);
  const day = toPositiveInt(search.day);
  if (year != null && month != null && day != null) {
    const inputEra = isEra(search.inputEra)
      ? search.inputEra
      : isEra(search.era)
        ? search.era
        : display.era;
    return { kind: "input", inputEra, year, month, day, display };
  }

  if (year != null && month != null) {
    const inputEra = isEra(search.inputEra)
      ? search.inputEra
      : isEra(search.era)
        ? search.era
        : display.era;
    let defaultDay = 1;
    if (inputEra === "bs" || inputEra === "bbs") {
      const cur = adToBS(new Date());
      if (cur.year === year && cur.month === month) defaultDay = cur.day;
    } else if (inputEra === "ad") {
      const now = new Date();
      if (now.getFullYear() === year && now.getMonth() + 1 === month) {
        defaultDay = now.getDate();
      }
    }
    return { kind: "input", inputEra, year, month, day: defaultDay, display };
  }

  return { kind: "today", display };
}

export function patroDayFetchFromApiJd(
  jdUt: number,
  display: PatroDisplayContext,
): PatroDayFetchState {
  return { kind: "jd", jd: jdUt, display };
}

/** Civil `date_ad` from the backend — parse with inputEra=ad/bc, never as a BS path key. */
export function patroDayFetchFromApiDateAd(
  dateAd: string,
  display: PatroDisplayContext,
): PatroDayFetchState {
  const { year, month, day } = parseCivilIso(dateAd);
  if (year < 1) {
    return {
      kind: "input",
      inputEra: "bc",
      year: 1 - year,
      month,
      day,
      display,
    };
  }
  return {
    kind: "input",
    inputEra: "ad",
    year,
    month,
    day,
    display,
  };
}

/** Vikram parts returned by the backend (picker / month grid). */
export function patroDayFetchFromApiBsParts(
  parts: { year: number; month: number; day: number },
  display: PatroDisplayContext,
): PatroDayFetchState {
  return patroDayFetchFromBrowseGridParts(parts, display);
}

/** Home / month grid — address the day in the browsed Vikram era (BS or BBS). */
export function patroDayFetchFromBrowseGridParts(
  parts: { year: number; month: number; day: number },
  display: PatroDisplayContext,
): PatroDayFetchState {
  const inputEra: Era = display.era === "bbs" ? "bbs" : "bs";
  return {
    kind: "input",
    inputEra,
    year: parts.year,
    month: parts.month,
    day: parts.day,
    display,
  };
}

/** Minimal day payload from panchanga resolve — avoids importing `api.ts` here. */
export type ResolvedPatroDayFields = {
  date_ad?: string;
  date_parts?: {
    vikram?: { era?: Era; year: number; month: number; day: number };
    gregorian?: { era: Era; year: number; month: number; day: number };
  };
  bs_date?: { year: number; month: number; day: number };
};

/** After the API resolves a day, mirror shareable y/m/d keys — not `jd`. */
export function patroDayFetchFromResolvedPanchanga(
  display: PatroDisplayContext,
  resolved: ResolvedPatroDayFields,
): PatroDayFetchState | null {
  const v = resolved.date_parts?.vikram;
  const g = resolved.date_parts?.gregorian;

  if (display.era === "bs" || display.era === "bbs") {
    if (v?.year && v.month && v.day) {
      const inputEra: Era =
        v.era === "bbs" || v.era === "bs" ? v.era : display.era === "bbs" ? "bbs" : "bs";
      const resolvedDisplay: PatroDisplayContext = {
        era: inputEra,
        // Keep the UI language the user chose (e.g. en on a BS day). Forcing
        // getLanguageForEra(inputEra) made syncResolvedPatroDay fight the URL
        // mirror effect and throttle navigation forever.
        language: display.language,
      };
      return {
        kind: "input",
        inputEra,
        year: v.year,
        month: v.month,
        day: v.day,
        display: resolvedDisplay,
      };
    }
    if (resolved.bs_date?.year && resolved.bs_date.month && resolved.bs_date.day) {
      return patroDayFetchFromBrowseGridParts(resolved.bs_date, display);
    }
  }

  if (display.era === "bc" && g?.year && g.month && g.day) {
    return {
      kind: "input",
      inputEra: "bc",
      year: g.year,
      month: g.month,
      day: g.day,
      display,
    };
  }

  if (resolved.date_ad) {
    return patroDayFetchFromApiDateAd(resolved.date_ad, display);
  }

  return null;
}

export type PatroBrowseCalendarParts = {
  year: number;
  month: number;
  day: number;
};

/**
 * BS↔BBS (or AD↔BC) toggle: re-address the same calendar y/m/d in the target
 * era via `inputEra`, not `jd` + display `era` (JD + `era=bbs` still resolves
 * as modern Vikram on the API).
 */
export function patroDayFetchWithBrowseEraToggle(
  state: PatroDayFetchState,
  nextEra: Era,
  parts?: PatroBrowseCalendarParts | null,
): PatroDayFetchState {
  if (parts?.year && parts.month && parts.day) {
    if (nextEra === "bs" || nextEra === "bbs" || nextEra === "ad" || nextEra === "bc") {
      const display: PatroDisplayContext = {
        era: nextEra,
        language: getLanguageForEra(nextEra),
      };
      return {
        kind: "input",
        inputEra: nextEra,
        year: parts.year,
        month: parts.month,
        day: parts.day,
        display,
      };
    }
  }
  return patroDayFetchWithDisplayEra(state, nextEra);
}

/** Same day identity (JD or y/m/d) with a new display era — for BS↔BBS / AD↔BC toggles. */
export function patroDayFetchWithDisplayEra(
  state: PatroDayFetchState,
  nextEra: Era,
): PatroDayFetchState {
  const display: PatroDisplayContext = {
    era: nextEra,
    language: getLanguageForEra(nextEra),
  };
  if (state.kind === "jd" || state.kind === "today") {
    return { ...state, display };
  }
  if (state.kind === "input") {
    let inputEra = state.inputEra;
    if (state.inputEra === "bs" && nextEra === "bbs") inputEra = "bbs";
    else if (state.inputEra === "bbs" && nextEra === "bs") inputEra = "bs";
    else if (state.inputEra === "ad" && nextEra === "bc") inputEra = "bc";
    else if (state.inputEra === "bc" && nextEra === "ad") inputEra = "ad";
    return { ...state, inputEra, display };
  }
  return state;
}

/** Mirror active UI language into day-browse URL (language toggle). */
export function patroDayFetchWithUiLanguage(
  state: PatroDayFetchState,
  language: Language,
): PatroDayFetchState {
  if (state.display.language === language) return state;
  return { ...state, display: { ...state.display, language } };
}

export function patroDayFetchStatesEqual(
  a: PatroDayFetchState,
  b: PatroDayFetchState,
): boolean {
  if (a.display.era !== b.display.era || a.display.language !== b.display.language) {
    return false;
  }
  if (a.kind !== b.kind) return false;
  if (a.kind === "today" && b.kind === "today") return true;
  if (a.kind === "jd" && b.kind === "jd") return a.jd === b.jd;
  if (a.kind === "input" && b.kind === "input") {
    return (
      a.inputEra === b.inputEra &&
      a.year === b.year &&
      a.month === b.month &&
      a.day === b.day
    );
  }
  return false;
}

export function buildPatroDayPageSearch(
  state: PatroDayFetchState,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...extra,
    era: state.display.era,
    language: state.display.language,
  };
  if (state.kind === "input") {
    out.inputEra = state.inputEra;
    out.year = state.year;
    out.month = state.month;
    out.day = state.day;
    return out;
  }
  return out;
}

export function patroDayQueryCacheKey(state: PatroDayFetchState): string {
  if (state.kind === "jd") return `jd:${state.jd}`;
  if (state.kind === "input") {
    return `in:${state.inputEra}:${state.year}-${state.month}-${state.day}`;
  }
  return "today";
}

export function buildPatroDayApiQuery(
  state: PatroDayFetchState,
  extra?: Record<string, string | number | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("era", state.display.era);
  params.set("language", state.display.language);
  if (state.kind === "input") {
    params.set("inputEra", state.inputEra);
    params.set("year", String(state.year));
    params.set("month", String(state.month));
    params.set("day", String(state.day));
  }
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  return params;
}
