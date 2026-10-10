/**
 * Vimshottari dasha display helpers. Periods come from the API.
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

/** Yogini dasha name → ruling graha (for planet artwork). */
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

export function dashaMahadashaGrahaKey(
  system: "vimshottari" | "tribhagi" | "yogini",
  lord: string,
): DashaLord | undefined {
  if (system === "yogini") return YOGINI_TO_GRAHA[lord];
  if (lord in DASHA_LORD_NE) return lord as DashaLord;
  return undefined;
}

export interface DashaSpan {
  lord: DashaLord;
  start: Date;
  end: Date;
}

/** Savana year used by the dasha engine (12 × 30 days). */
const YEAR_DAYS = 360;
export const DASHA_YEAR_MS = YEAR_DAYS * 86400000;
const MONTH_DAYS = YEAR_DAYS / 12;
const YOGA_MS = 86400000 / 27;

export interface DashaDurationParts {
  years: number;
  months: number;
  days: number;
  yogas: number;
}

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
