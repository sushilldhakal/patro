/**
 * Vimshottari and Yogini dasha periods, made on the device: `jyotish::dasha` in apps/rust
 * (`vimshottari_payload` for `/kundali/vimshottari`, `sub_periods_aware` for `/kundali/dasha/expand`).
 *
 * Instants are whole microseconds since 1970 (UTC), as Python's datetime keeps them, so the
 * printed periods carry the server's microseconds.
 */
import { pyFloorDiv, pyInt, pyMod, pyRoundInt } from "../../panchanga/engine/py";

type Json = Record<string, unknown>;

/** `YEAR_DAYS`: the mean Gregorian year every dasha year is. */
export const YEAR_DAYS = 365.2425;
const US_PER_DAY = 86_400_000_000;

interface DashaSystem {
  keys: readonly string[];
  years: readonly number[];
  namesNe: readonly string[];
  cycleYears: number;
}

export const VIMSHOTTARI: DashaSystem = {
  keys: ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"],
  years: [7, 20, 6, 10, 7, 18, 16, 19, 17],
  namesNe: ["केतु", "शुक्र", "सूर्य", "चन्द्र", "मङ्गल", "राहु", "गुरु", "शनि", "बुध"],
  cycleYears: 120,
};

export const YOGINI: DashaSystem = {
  keys: ["mangala", "pingala", "dhanya", "bhramari", "bhadrika", "ulka", "siddha", "sankata"],
  years: [1, 2, 3, 4, 5, 6, 7, 8],
  namesNe: ["मङ्गला", "पिङ्गला", "धन्या", "भ्रमरी", "भाद्रिका", "उल्का", "सिद्धा", "संकटा"],
  cycleYears: 36,
};

/** Python's `timedelta(days=x)`: rounded to the microsecond. */
const addDays = (us: number, days: number) => us + Math.round(days * US_PER_DAY);

/** Microseconds since 1970 of a Julian Day (UT), to the whole second (a birth is named to the second). */
export const usFromJd = (jd: number) => Math.round((jd - 2440587.5) * 86400) * 1_000_000;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** `datetime.isoformat()` of an instant shown at a fixed offset (seconds east of UTC). */
export function isoAt(us: number, offsetSeconds: number): string {
  const local = us + offsetSeconds * 1_000_000;
  const d = new Date(Math.floor(local / 1000));
  const micros = ((local % 1_000_000) + 1_000_000) % 1_000_000;
  const sign = offsetSeconds < 0 ? "-" : "+";
  const off = Math.abs(offsetSeconds);
  const offText = `${sign}${pad(Math.floor(off / 3600))}:${pad(Math.floor((off % 3600) / 60))}${off % 60 ? `:${pad(off % 60)}` : ""}`;
  const year = d.getUTCFullYear();
  return (
    `${year < 0 ? "-" : ""}${pad(Math.abs(year), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` +
    `${micros ? `.${pad(micros, 6)}` : ""}${offText}`
  );
}

/** `datetime.fromisoformat`: an instant and its offset (a naive one is read as UTC, as the route does). */
export function parseIso(text: string): { us: number; offset: number } | null {
  const m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d{1,6}))?)?)?(Z|[+-]\d\d:\d\d(?::\d\d)?)?$/.exec(text.trim());
  if (!m) return null;
  let offset = 0;
  if (m[8] && m[8] !== "Z") {
    const [h, mi, s] = m[8].slice(1).split(":").map(Number);
    offset = (m[8][0] === "-" ? -1 : 1) * (h * 3600 + mi * 60 + (s ?? 0));
  }
  const micros = m[7] ? Number(m[7].padEnd(6, "0")) : 0;
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
  if (!Number.isFinite(wall)) return null;
  return { us: wall * 1000 + micros - offset * 1_000_000, offset };
}

/** `_format_years_label`: `"1 वर्ष 8 महिना 3 दिन"`. */
export function yearsLabel(years: number): string {
  const totalDays = pyRoundInt(years * YEAR_DAYS);
  const monthDays = YEAR_DAYS / 12;
  const y = pyInt(pyFloorDiv(totalDays, YEAR_DAYS));
  const rem = totalDays - pyRoundInt(y * YEAR_DAYS);
  const m = pyInt(pyFloorDiv(rem, monthDays));
  const d = pyRoundInt(rem - m * monthDays);
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} वर्ष`);
  if (m > 0) parts.push(`${m} महिना`);
  if (d > 0 || parts.length === 0) parts.push(`${d} दिन`);
  return parts.join(" ");
}

/** One mahadasha from birth: its lord, span (microseconds, UTC) and length in years. */
export interface Mahadasha {
  lord: string;
  start: number;
  end: number;
  years: number;
}

/** `vimshottari_timeline(moon_lon, birth, cycles)`. */
export function vimshottariTimeline(moonLongitude: number, birthUs: number, cycles: number) {
  const span = 360 / 27;
  const lon = pyMod(moonLongitude, 360);
  const nakshatraIndex = pyInt(pyFloorDiv(lon, span));
  const count = VIMSHOTTARI.keys.length;
  const first = nakshatraIndex % count;
  const lord = VIMSHOTTARI.keys[first];
  const balanceYears = (1 - pyMod(lon, span) / span) * VIMSHOTTARI.years[first];
  const periods: Mahadasha[] = [{ lord, start: birthUs, end: addDays(birthUs, balanceYears * YEAR_DAYS), years: balanceYears }];
  let cursor = periods[0].end;
  for (let step = 1; step < count * cycles; step += 1) {
    const i = (first + step) % count;
    const end = addDays(cursor, VIMSHOTTARI.years[i] * YEAR_DAYS);
    periods.push({ lord: VIMSHOTTARI.keys[i], start: cursor, end, years: VIMSHOTTARI.years[i] });
    cursor = end;
  }
  return { nakshatraIndex, lord, balanceYears, periods };
}

/** `vimshottari_payload`: the header and the mahadasha sequence, printed in UTC. */
export function vimshottariPayload(moonLongitude: number, birthUs: number, cycles: number): Json {
  const t = vimshottariTimeline(moonLongitude, birthUs, cycles);
  const ne = (lord: string) => VIMSHOTTARI.namesNe[VIMSHOTTARI.keys.indexOf(lord)];
  return {
    nakshatra_index: t.nakshatraIndex,
    mahadasha_lord: t.lord,
    mahadasha_lord_ne: ne(t.lord),
    balance_years: t.balanceYears,
    balance_label: yearsLabel(t.balanceYears),
    sequence: t.periods.map((p) => ({ lord: p.lord, lord_ne: ne(p.lord), start: isoAt(p.start, 0), end: isoAt(p.end, 0), years: p.years })),
  };
}

/**
 * `/kundali/dasha/expand`: a period's sub-periods laid over its full length ending at `end`
 * (`sub_periods_aware`), or null for a lord the system does not have or a date it cannot read.
 * Children print at `end`'s offset, as the server prints them.
 */
export function dashaExpand(q: { lord: string; start: string; end: string; system?: string }): Json | null {
  const system = q.system === "yogini" ? YOGINI : q.system === undefined || q.system === "vimshottari" ? VIMSHOTTARI : null;
  if (!system) return null;
  const first = system.keys.indexOf(q.lord);
  const start = parseIso(q.start);
  const end = parseIso(q.end);
  if (first < 0 || !start || !end) return null;
  const full = (end.us - start.us) / (YEAR_DAYS * US_PER_DAY);
  if (!(full > 0)) return null;
  let cursor = addDays(end.us, -full * YEAR_DAYS);
  const count = system.keys.length;
  const children: Json[] = [];
  for (let step = 0; step < count; step += 1) {
    const i = (first + step) % count;
    const childEnd = step === count - 1 ? end.us : addDays(cursor, (system.years[i] * full) / system.cycleYears * YEAR_DAYS);
    if (childEnd <= start.us) {
      cursor = childEnd;
      continue;
    }
    children.push({ lord: system.keys[i], lord_ne: system.namesNe[i], start: isoAt(Math.max(cursor, start.us), end.offset), end: isoAt(childEnd, end.offset) });
    cursor = childEnd;
  }
  if (children.length) children[children.length - 1].end = isoAt(end.us, end.offset);
  return { lord: q.lord, system: q.system ?? "vimshottari", children };
}
