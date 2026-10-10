/**
 * Vimshottari dasha display helpers. The dasha periods themselves (balance,
 * mahadasha sequence, antar/pratyantar tree and deeper subdivisions) are
 * computed by the API — /kundali/detail and /kundali/dasha/expand.
 */

export type DashaLord =
  | "ketu"
  | "venus"
  | "sun"
  | "moon"
  | "mars"
  | "rahu"
  | "jupiter"
  | "saturn"
  | "mercury";

export const DASHA_LORD_NE: Record<DashaLord, string> = {
  ketu: "केतु",
  venus: "शुक्र",
  sun: "सूर्य",
  moon: "चन्द्र",
  mars: "मङ्गल",
  rahu: "राहु",
  jupiter: "गुरु",
  saturn: "शनि",
  mercury: "बुध",
};

export const DASHA_LORD_EN: Record<DashaLord, string> = {
  ketu: "Ketu",
  venus: "Venus",
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  rahu: "Rahu",
  jupiter: "Jupiter",
  saturn: "Saturn",
  mercury: "Mercury",
};

/** Yogini dasha name → ruling graha (for icons in the UI). */
export const YOGINI_TO_GRAHA: Record<string, DashaLord> = {
  mangala: "moon",
  pingala: "sun",
  dhanya: "jupiter",
  bhramari: "mars",
  bhadrika: "mercury",
  ulka: "saturn",
  siddha: "venus",
  sankata: "rahu",
};

/** Resolve birth mahadasha lord to a graha key for planet artwork. */
export function dashaMahadashaGrahaKey(
  system: "vimshottari" | "tribhagi" | "yogini",
  lord: string,
): DashaLord | undefined {
  if (system === "yogini") return YOGINI_TO_GRAHA[lord];
  if (lord in DASHA_LORD_NE) return lord as DashaLord;
  return undefined;
}

/** One dasha period at any level of the Vimshottari hierarchy. */
export interface DashaSpan {
  lord: DashaLord;
  start: Date;
  end: Date;
}

/**
 * Mean Gregorian year — must match the API's `vimshottari.YEAR_DAYS`
 * (engine/vedic/vimshottari.py). Previously 360 (a 360-day "savana year"),
 * which produced duration labels inconsistent with the actual start/end
 * dates the API now returns (e.g. a full, un-balanced 17-year Mercury
 * mahadasha showing as "17y 2m 29d" instead of "17y" — the date range was
 * always correct, only this breakdown math was stale).
 */
const YEAR_DAYS = 365.2425;
export const DASHA_YEAR_MS = YEAR_DAYS * 86400000;
const MONTH_DAYS = YEAR_DAYS / 12;
/** Sub-day unit: 1 yoga ≈ 53m 20s (1/27 of a civil day). */
const YOGA_MS = 86400000 / 27;

export interface DashaDurationParts {
  years: number;
  months: number;
  days: number;
  yogas: number;
}

/** Vimshottari-style display breakdown: years, months, days, sub-day yogas. */
export function breakdownDashaDuration(ms: number): DashaDurationParts {
  const totalDays = ms / 86400000;
  const years = Math.floor(totalDays / YEAR_DAYS);
  const remDaysAfterYears = totalDays - years * YEAR_DAYS;
  const months = Math.floor(remDaysAfterYears / MONTH_DAYS);
  const remDaysAfterMonths = remDaysAfterYears - months * MONTH_DAYS;
  const days = Math.round(remDaysAfterMonths);
  const accountedMs = (years * YEAR_DAYS + months * MONTH_DAYS + days) * 86400000;
  const remMs = Math.max(0, ms - accountedMs);
  const yogas = remMs >= YOGA_MS / 2 ? Math.round(remMs / YOGA_MS) : 0;
  return { years, months, days, yogas };
}

/** Long duration label for अवधि (BS) column. */
export function formatDashaDurationParts(
  parts: DashaDurationParts,
  lang: "ne" | "en",
): string {
  const chunks: string[] = [];
  const unit =
    lang === "en"
      ? { y: "y", m: "m", d: "d", yog: "yoga" }
      : { y: " वर्ष", m: " मास", d: " दिन", yog: " योग" };
  if (parts.years > 0) chunks.push(`${parts.years}${unit.y}`);
  if (parts.months > 0) chunks.push(`${parts.months}${unit.m}`);
  if (parts.days > 0 || chunks.length === 0) chunks.push(`${parts.days}${unit.d}`);
  if (parts.yogas > 0) chunks.push(`${parts.yogas}${unit.yog}`);
  return chunks.join(lang === "en" ? " " : "");
}

/** Compact duration label: "16y 11m", "3m 12d", "103d", "18h". */
export function formatDashaDuration(ms: number, lang: "ne" | "en"): string {
  const days = ms / 86400000;
  const unit =
    lang === "en"
      ? { y: "y", m: "m", d: "d", h: "h", sep: " " }
      : { y: " वर्ष", m: " महिना", d: " दिन", h: " घण्टा", sep: " " };
  if (days >= YEAR_DAYS) {
    const years = ms / DASHA_YEAR_MS;
    const y = Math.floor(years);
    const m = Math.floor((years - y) * 12);
    return m > 0 ? `${y}${unit.y}${unit.sep}${m}${unit.m}` : `${y}${unit.y}`;
  }
  if (days >= 60) {
    const m = Math.floor(days / MONTH_DAYS);
    const d = Math.round(days - m * MONTH_DAYS);
    return d > 0 ? `${m}${unit.m}${unit.sep}${d}${unit.d}` : `${m}${unit.m}`;
  }
  if (days >= 2) return `${Math.round(days)}${unit.d}`;
  return `${Math.round(ms / 3600000)}${unit.h}`;
}
