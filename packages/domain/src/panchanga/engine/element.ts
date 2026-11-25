// The panchanga element routes (`/panchanga/element/{name}/day|month|spans`, `patro::catalog`): one anga or table
// of the day payload, a BS month of it, or its spans over a window.
import { civilFromJdn, bsMonth, civilJdn } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import { KARANA_NAMES, KARANA_NAMES_NE, NAKSHATRA_NAMES, NAKSHATRA_NAMES_NE, RASHI_NAMES, RASHI_NAMES_NE, TITHI_NAMES, TITHI_NAMES_NE, YOGA_NAMES, YOGA_NAMES_NE } from "./tables.generated";
import { endOf, karanaAt, karanaName, nakshatraAt, startOf, sunMoon, sunTimes, tithiInfo, yogaAt, type Json } from "./blocks";
import { buildDay, locationBlock, type DayInput } from "./day";
import { eraLanguage, renderForEra } from "./era-render";
import { localMidnight } from "./midnight";
import { pyInt, pyRound } from "./py";
import { addSeconds, wallIn } from "./instant";

type Kind = "tithi" | "nakshatra" | "yoga" | "karana" | "moonRashi";
interface ElementSpec {
  id: string;
  key: string;
  label_ne: string;
  label_en: string;
  kind: "span" | "table";
  /** The sky's boundary kind of a span element. */
  boundary?: Kind;
}

const SPECS: ElementSpec[] = [
  { id: "nakshatra", key: "nakshatra", label_ne: "नक्षत्र", label_en: "Nakshatra", kind: "span", boundary: "nakshatra" },
  { id: "yoga", key: "yoga", label_ne: "योग", label_en: "Yoga", kind: "span", boundary: "yoga" },
  { id: "tithi", key: "tithi", label_ne: "तिथि", label_en: "Tithi", kind: "span", boundary: "tithi" },
  { id: "karana", key: "karana", label_ne: "करण", label_en: "Karana", kind: "span", boundary: "karana" },
  { id: "chandra-rashi", key: "chandra_rashi", label_ne: "चन्द्र राशि", label_en: "Moon sign", kind: "span", boundary: "moonRashi" },
  { id: "choghadiya", key: "choghadiya", label_ne: "चौघडिया", label_en: "Choghadiya", kind: "table" },
  { id: "hora", key: "hora", label_ne: "होरा", label_en: "Hora", kind: "table" },
  { id: "tarabala", key: "tarabala_table", label_ne: "ताराबल", label_en: "Tarabala", kind: "table" },
  { id: "chandrabala", key: "chandrabala_table", label_ne: "चन्द्रबल", label_en: "Chandrabala", kind: "table" },
  { id: "panchaka-rahita", key: "panchaka_rahita", label_ne: "पञ्चक रहित", label_en: "Panchaka Rahita", kind: "table" },
  { id: "udaya-lagna", key: "udaya_lagna", label_ne: "उदय लग्न", label_en: "Udaya Lagna", kind: "table" },
  { id: "lagna", key: "udaya_lagna", label_ne: "लग्न", label_en: "Lagna", kind: "table" },
  { id: "pushkara", key: "udaya_lagna", label_ne: "पुष्कर नवांश", label_en: "Pushkara Navamsha", kind: "table" },
];

const specOf = (name: string): ElementSpec | null => SPECS.find((s) => s.id === name) ?? null;

/** `GET /panchanga/elements`. */
export const elementsList = (): Json => ({ elements: SPECS.map((s) => ({ id: s.id, label_ne: s.label_ne, label_en: s.label_en, kind: s.kind })) });

function pushkara(raw: Json): Json[] {
  const out: Json[] = [];
  for (const entry of (Array.isArray(raw.udaya_lagna) ? raw.udaya_lagna : []) as Json[]) {
    const hits = entry.pushkara_navamsha;
    if (!Array.isArray(hits) || hits.length === 0) continue;
    out.push({ lagna: entry.name ?? null, lagna_ne: entry.name_ne ?? null, start_local_time_short: entry.start_local_time_short ?? null, end_local_time_short: entry.end_local_time_short ?? null, pushkara_navamsha: hits });
  }
  return out;
}
const extract = (spec: ElementSpec, raw: Json): unknown => (spec.id === "pushkara" ? pushkara(raw) : raw[spec.key] ?? null);
const short = (raw: Json, key: string): unknown => (raw[key] as Json | undefined)?.local_time_short ?? null;

/** `element_day`: one element of a civil day's payload. Null for an unknown element or a day this device cannot answer. */
export function elementDay(sky: Sky, name: string, input: DayInput, era: { era: string; language?: string }): Json | null {
  const spec = specOf(name);
  const raw = spec && buildDay(sky, input);
  if (!spec || !raw) return null;
  const out: Json = {
    element: name,
    kind: spec.kind,
    label_ne: spec.label_ne,
    label_en: spec.label_en,
    date_ad: raw.date_ad,
    sunrise: short(raw, "sunrise"),
    sunset: short(raw, "sunset"),
    location: raw.location ?? null,
    data: extract(spec, raw),
  };
  return renderForEra(out, era.era, era.language ?? eraLanguage(era.era));
}

/** `element_month`: one element for each day of a BS month. */
export function elementMonth(sky: Sky, name: string, bsYear: number, bsMonthNumber: number, place: Omit<DayInput, "year" | "month" | "day">): Json | null {
  const spec = specOf(name);
  const span = bsMonth(bsYear, bsMonthNumber);
  if (!spec || !span) return null;
  const days: Json[] = [];
  for (let i = 0; i < span.length; i += 1) {
    const c = civilFromJdn(span.first + i);
    const raw = buildDay(sky, { ...place, year: c.year, month: c.month, day: c.day });
    if (!raw) return null;
    const vaara = (raw.vaara ?? {}) as Json;
    days.push({
      date_ad: raw.date_ad,
      bs_day: i + 1,
      weekday_ne: vaara.name_ne ?? null,
      weekday_en: vaara.name_english ?? null,
      sunrise: short(raw, "sunrise"),
      sunset: short(raw, "sunset"),
      data: extract(spec, raw),
    });
  }
  const f = civilFromJdn(span.first);
  const date = `${String(f.year).padStart(4, "0")}-${String(f.month).padStart(2, "0")}-${String(f.day).padStart(2, "0")}`;
  return { element: name, kind: spec.kind, label_ne: spec.label_ne, label_en: spec.label_en, bs_year: bsYear, bs_month: bsMonthNumber, start_ad: date, location: locationBlock({ year: 0, month: 0, day: 0, ...place }), days };
}

// ---------------------------------------------------------------- spans

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `_stamp`: an instant on the observer's clock, read several ways. */
function stamp(jd: number, zone: string): Json {
  const w = wallIn(jd, zone);
  const day = civilFromJdn(w.jdn);
  const label = `${MONTH_ABBR[day.month - 1]} ${String(day.day).padStart(2, "0")}`;
  return { iso: w.iso, weekday: WEEKDAY_ABBR[(((w.jdn + 1) % 7) + 7) % 7], date_label: label, time_label: w.hm, display: `${w.hm} on ${label}` };
}

interface Now {
  number: number;
  name: string;
  name_ne: string;
  extra: Json;
}
function currentOf(sky: Sky, spec: ElementSpec, jd: number): Now {
  switch (spec.id) {
    case "tithi": {
      const t = tithiInfo(sky, jd);
      const purnima = t.display === 15;
      return { number: t.display, name: purnima ? (t.paksha === "shukla" ? "Purnima" : "Aausi") : TITHI_NAMES[t.display - 1], name_ne: purnima ? (t.paksha === "shukla" ? "पूर्णिमा" : "औंसी") : TITHI_NAMES_NE[t.display - 1], extra: { paksha: t.paksha } };
    }
    case "yoga": {
      const y = yogaAt(sky, jd);
      return { number: y.number, name: YOGA_NAMES[y.number - 1], name_ne: YOGA_NAMES_NE[y.number - 1], extra: { progress: pyRound(y.progress, 4) } };
    }
    case "karana": {
      const k = karanaName(karanaAt(sky, jd).number);
      const index = (KARANA_NAMES as readonly string[]).indexOf(k.name);
      return { number: index + 1, name: KARANA_NAMES[index], name_ne: KARANA_NAMES_NE[index], extra: {} };
    }
    case "chandra-rashi": {
      const i = pyInt(sunMoon(sky, jd)[1] / 30) % 12;
      return { number: i + 1, name: RASHI_NAMES[i], name_ne: RASHI_NAMES_NE[i], extra: {} };
    }
    default: {
      const n = nakshatraAt(sky, jd);
      return { number: n.number, name: NAKSHATRA_NAMES[n.number - 1], name_ne: NAKSHATRA_NAMES_NE[n.number - 1], extra: { progress: pyRound(n.progress, 4) } };
    }
  }
}

/** `tithi_udaya`: the local days a tithi's span holds a sunrise on (none is a kshaya, two or more a vriddhi). */
function tithiUdaya(sky: Sky, begins: number, ends: number, place: Omit<DayInput, "year" | "month" | "day">): Json | null {
  const zone = place.timeZone;
  const first = wallIn(begins, zone).jdn - 1;
  const last = wallIn(ends, zone).jdn + 2;
  const rises: number[] = [];
  for (let jdn = first; jdn <= last; jdn += 1) {
    const t = sunTimes(sky, jdn, place);
    if (t && t.sunrise > begins) rises.push(t.sunrise);
  }
  rises.sort((a, b) => a - b);
  const dayOf = (jd: number) => wallIn(jd, zone).iso.slice(0, 10);
  const days: string[] = [];
  let i = 0;
  let rise: number | undefined = rises[0];
  let lastRise: number | undefined = rise;
  while (rise !== undefined) {
    if (rise >= ends || days.length >= 3) {
      lastRise = rise;
      break;
    }
    days.push(dayOf(rise));
    i += 1;
    rise = rises[i];
    lastRise = rise;
  }
  if (days.length === 0 && lastRise === undefined) return null;
  const out: Json = { udaya_days: days };
  if (days.length === 0) {
    out.udaya = "kshaya";
    if (lastRise !== undefined) out.kshaya_day = dayOf(lastRise - 1);
  } else if (days.length > 1) out.udaya = "vriddhi";
  return out;
}

/** `element_spans`: the spans of a span element between two Julian Days (a window of civil days, midnight to midnight). */
export function elementSpans(sky: Sky, name: string, startJd: number, endJd: number, place: Omit<DayInput, "year" | "month" | "day">, era?: { era: string; language?: string }): Json | null {
  const spec = specOf(name);
  if (!spec || spec.kind !== "span" || !spec.boundary || endJd < startJd || endJd - startJd > 400) return null;
  const startDay = civilFromJdn(Math.floor(startJd + 0.5));
  const endDay = civilFromJdn(Math.floor(endJd + 0.5));
  if (startDay.year < 1970) return null;
  const zone = place.timeZone;
  const start = localMidnight(civilJdn(startDay.year, startDay.month, startDay.day), zone);
  const end = localMidnight(civilJdn(endDay.year, endDay.month, endDay.day), zone) + 1;
  const spans: Json[] = [];
  let cursor = start;
  let prevEnd: number | null = null;
  for (let guard = 0; cursor < end && guard < 4000; guard += 1) {
    const current = currentOf(sky, spec, cursor);
    let segEnd = endOf(sky, spec.boundary, cursor);
    if (segEnd <= cursor) segEnd = cursor + 1 / 24;
    const segStart = prevEnd ?? startOf(sky, spec.boundary, cursor);
    const span: Json = { number: current.number, name: current.name, name_ne: current.name_ne, begins: stamp(segStart, zone), ends: stamp(segEnd, zone), ...current.extra };
    if (name === "tithi") Object.assign(span, tithiUdaya(sky, segStart, segEnd, place) ?? {});
    spans.push(span);
    prevEnd = segEnd;
    cursor = addSeconds(segEnd, 1);
  }
  const iso = (d: { year: number; month: number; day: number }) => `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  const out: Json = { element: name, kind: "span", label_ne: spec.label_ne, label_en: spec.label_en, timezone: zone, location: locationBlock({ year: 0, month: 0, day: 0, ...place }), window: { start: iso(startDay), end: iso(endDay) }, spans };
  return era ? renderForEra(out, era.era, era.language ?? eraLanguage(era.era)) : out;
}

/** `era_month_window`: the first and last Julian Day (0h UT) of a month of an era the elements route reads, or null for the server. */
export function eraMonthWindow(era: string, year: number, month: number): [number, number] | null {
  if (month < 1 || month > 12) return null;
  let first: number;
  let next: number;
  if (era === "bs") {
    const a = bsMonth(year, month);
    const b = month < 12 ? bsMonth(year, month + 1) : bsMonth(year + 1, 1);
    if (!a || !b) return null;
    [first, next] = [a.first, b.first];
  } else if (era === "ad") {
    first = civilJdn(year, month, 1);
    next = month < 12 ? civilJdn(year, month + 1, 1) : civilJdn(year + 1, 1, 1);
  } else return null;
  return [first - 0.5, next - 1 - 0.5];
}
