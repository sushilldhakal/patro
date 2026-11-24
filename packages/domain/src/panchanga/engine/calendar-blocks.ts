// The day's calendar blocks: Bikram Sambat and Nepal Sambat headers, the samvatsara, and the lunar month
// in its amanta, purnimanta and festival forms (`panchanga::lunar_month`, `nepal_sambat`, `samvatsara`).
import {
  bsDateOf,
  bsToJdn,
  civilFromJdn,
  findFestivalInLunarMonth,
  isoFromJdn,
  lunarYear,
  observedYear,
  purnimantWindows,
  type LunarMonth,
  type MonthDays,
  type PatroObserver,
} from "../../astronomy/lunar-month";
import { suryaJupiterSignIngresses } from "../../astronomy/surya-formulas";
import { nepaliDigits, type Json } from "./blocks";
import { SAMVATSARA } from "./samvatsara-data";
import { BS_MONTH_NAMES, BS_MONTH_NAMES_NE, LUNAR_MASA_NE, MONTH_ABBR, VAARA_NAMES_NE } from "./tables.generated";

export type Paksha = "shukla" | "krishna";

export const masaNe = (name: string): string => {
  const i = (BS_MONTH_NAMES as readonly string[]).indexOf(name);
  return i < 0 ? name : LUNAR_MASA_NE[i];
};

interface MonthPayload {
  name: string | null;
  fullName: string | null;
  isAdhik: boolean;
  type: string;
  model: string;
  window: [number, number] | null;
  solar: string | null;
  masa: string | null;
}
const unknown = (model: string): MonthPayload => ({ name: null, fullName: null, isAdhik: false, type: "unknown", model, window: null, solar: null, masa: null });
const monthJson = (m: MonthPayload): Json => ({
  name: m.name,
  name_ne: m.name === null ? null : masaNe(m.name),
  full_name: m.fullName ?? m.name,
  is_adhik: m.isAdhik,
  type: m.type,
  paksha_model: m.model,
  window_start: m.window ? isoFromJdn(m.window[0]) : null,
  window_end: m.window ? isoFromJdn(m.window[1]) : null,
  solar_name: m.solar,
  festival_masa: m.masa,
});

type Pair = [LunarMonth, MonthDays];
const yearsAround = (jdn: number, o: PatroObserver) => {
  const y = civilFromJdn(jdn).year;
  return [observedYear(o, y - 1), observedYear(o, y), observedYear(o, y + 1)];
};
const pairs = (y: ReturnType<typeof observedYear>): Pair[] => y.year.months.map((m, i) => [m, y.days[i]]);
const fullName = (m: LunarMonth) => (m.isAdhik ? `Adhik ${m.name}` : m.name);

function amantaFor(jdn: number, o: PatroObserver): MonthPayload {
  for (const y of yearsAround(jdn, o)) {
    const hit = pairs(y).find(([, d]) => d.first <= jdn && jdn <= d.last);
    if (hit) {
      const [m, d] = hit;
      return { name: m.name, fullName: fullName(m), isAdhik: m.isAdhik, type: m.isAdhik ? "adhik" : "nija", model: "amanta", window: [d.first, d.last], solar: m.name, masa: m.name };
    }
  }
  return unknown("amanta");
}

function festivalMasaFor(jdn: number, o: PatroObserver): MonthPayload {
  for (const y of yearsAround(jdn, o)) {
    const w = purnimantWindows(y).find((x) => x.start <= jdn && jdn <= x.endPurnima);
    if (w) return { name: w.name, fullName: w.isAdhik ? `Adhik ${w.name}` : w.name, isAdhik: w.isAdhik, type: w.isAdhik ? "adhik" : "nija", model: "festival", window: [w.start, w.endPurnima], solar: w.name, masa: w.name };
  }
  return unknown("purnimant");
}

const nextMasa = (name: string) => {
  const i = (BS_MONTH_NAMES as readonly string[]).indexOf(name);
  return i < 0 ? name : BS_MONTH_NAMES[(i + 1) % 12];
};

function purnimantaPaksha(jdn: number, paksha: Paksha, o: PatroObserver): MonthPayload {
  let context: { cur: Pair; prev: Pair | null } | null = null;
  for (const y of yearsAround(jdn, o)) {
    let prev: Pair | null = null;
    for (const pair of pairs(y)) {
      if (pair[1].first <= jdn && jdn <= pair[1].last) {
        context = { cur: pair, prev };
        break;
      }
      prev = pair;
    }
    if (context) break;
  }
  if (!context) return unknown("purnimant");
  let [month, days] = context.cur;
  if (paksha === "krishna" && jdn === days.first && context.prev) [month, days] = context.prev;
  const [name, isAdhik, type] = month.isAdhik ? [month.name, true, "adhik"] : paksha === "krishna" ? [nextMasa(month.name), false, "nija"] : [month.name, false, "nija"];
  return { name, fullName: isAdhik ? `Adhik ${name}` : name, isAdhik, type, model: "purnimant", window: [days.first, days.last], solar: month.name, masa: name };
}

/** `merge_lunar_month_for_day`: the amanta month plus the purnimanta fields. */
export function lunarMonthBlock(jdn: number, paksha: Paksha, o: PatroObserver): Json {
  const a = monthJson(amantaFor(jdn, o));
  const p = monthJson(purnimantaPaksha(jdn, paksha, o));
  return {
    ...a,
    purnimanta_name: p.name,
    purnimanta_name_ne: p.name_ne,
    purnimanta_full_name: p.full_name,
    purnimanta_is_adhik: p.is_adhik,
    purnimanta_type: p.type,
    purnimanta_solar_name: p.solar_name,
    purnimanta_festival_masa: p.festival_masa,
  };
}

/** `get_lunar_calendar_layers`. */
export function lunarCalendarBlock(jdn: number, paksha: Paksha, o: PatroObserver): Json {
  const adhik = lunarYear(o.sky, civilFromJdn(jdn).year).adhikName;
  return {
    adhik_maas: { year_has_adhik: adhik !== null, name: adhik, name_ne: adhik === null ? null : `अधिक ${masaNe(adhik)}` },
    amanta: monthJson(amantaFor(jdn, o)),
    purnimant: monthJson(purnimantaPaksha(jdn, paksha, o)),
    festival_masa: monthJson(festivalMasaFor(jdn, o)),
  };
}

/** `paksha_block`: the paksha with its purnimanta month label. */
export function pakshaBlock(lunar: Json, paksha: Paksha): Json {
  const monthName = (lunar.purnimanta_name as string | null) ?? (lunar.name as string | null) ?? "Unknown";
  const isAdhik = Boolean(lunar.purnimanta_is_adhik ?? lunar.is_adhik);
  const monthNe = typeof lunar.purnimanta_name_ne === "string" && lunar.purnimanta_name_ne ? lunar.purnimanta_name_ne : (() => {
    const i = (BS_MONTH_NAMES as readonly string[]).indexOf(monthName);
    return i < 0 ? monthName : BS_MONTH_NAMES_NE[i];
  })();
  const pakshaNe = paksha === "shukla" ? "शुक्ल पक्ष" : "कृष्ण पक्ष";
  return {
    name: paksha,
    name_ne: pakshaNe,
    lunar_month: monthName,
    lunar_month_ne: monthNe,
    is_adhik: isAdhik,
    label_ne: `${isAdhik ? "अधिक " : ""}${monthNe} ${pakshaNe}`,
    label_en: `${isAdhik ? "Adhik " : ""}${monthName} ${paksha} paksha`,
  };
}

// ---------------------------------------------------------------- Nepal Sambat

const NS_MONTH_NE = ["कछला", "थिन्ला", "पोहेला", "सिल्ला", "चिल्ला", "चौला", "बछला", "तछला", "दिल्ला", "गुँला", "ञला", "कौला"];
const newYears = new WeakMap<object, Map<string, number | null>>();

function nsNewYear(bsYear: number, o: PatroObserver): number | null {
  let cache = newYears.get(o.sky);
  if (!cache) {
    cache = new Map();
    newYears.set(o.sky, cache);
  }
  const key = `${bsYear}|${o.latitude.toFixed(4)}|${o.longitude.toFixed(4)}|${o.timeZone}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const start = bsToJdn(bsYear, 1, 1);
  const next = bsToJdn(bsYear + 1, 1, 1);
  let found: number | null = null;
  if (start !== null && next !== null) {
    for (let y = civilFromJdn(start).year; y <= civilFromJdn(next - 1).year && found === null; y += 1) {
      const d = findFestivalInLunarMonth(o, "Kartik", 1, "shukla", y, "udaya");
      if (d !== null && d >= start && d <= next - 1) found = d;
    }
  }
  cache.set(key, found);
  return found;
}

export function nsDateBlock(args: { jdn: number; bsYear: number; display: number; absolute: number; tithiNameNe: string; paksha: Paksha; month: string | null; isAdhik: boolean }, o: PatroObserver): Json | null {
  const newYear = nsNewYear(args.bsYear, o);
  if (newYear === null) return null;
  const idx = args.month === null ? -1 : (BS_MONTH_NAMES as readonly string[]).indexOf(args.month);
  const nsMonth = idx < 0 ? null : (idx + 12 - 6) % 12;
  const label = args.isAdhik
    ? args.paksha === "shukla" ? "अनालाथ्व" : "अनालागा"
    : args.paksha === "krishna" && args.month !== null
      ? nsMonth === null ? "कृष्ण पक्ष" : `${NS_MONTH_NE[nsMonth]}गा`
      : args.paksha === "shukla" ? "शुक्ल पक्ष" : "कृष्ण पक्ष";
  return {
    year: args.bsYear - 937,
    month: args.month ?? "Unknown",
    month_index: idx < 0 ? null : idx + 1,
    month_name_ne: nsMonth === null ? null : NS_MONTH_NE[nsMonth],
    day: args.display,
    tithi_absolute: args.absolute,
    paksha: args.paksha,
    paksha_ne: label,
    label_ne: `${label} ${args.tithiNameNe} - ${args.absolute}`,
    new_year: isoFromJdn(newYear),
    is_before_new_year: args.jdn < newYear,
  };
}

/** `_display_headers`. */
export function displayHeaders(jdn: number, bs: { year: number; month: number; day: number }, vaaraEnglish: string, ns: Json): Json {
  const c = civilFromJdn(jdn);
  const weekday = jdn % 7; // Monday = 0
  return {
    bs_ne: `वि.सं. ${nepaliDigits(bs.year)} ${BS_MONTH_NAMES_NE[bs.month - 1]} ${nepaliDigits(bs.day)} ${VAARA_NAMES_NE[(weekday + 1) % 7]}`,
    gregorian_en: `${c.year} ${MONTH_ABBR[c.month - 1]} ${c.day}, ${vaaraEnglish}`,
    ns_ne: `ने.सं. ${nepaliDigits(Number(ns.year ?? 0))} ${String(ns.label_ne ?? "")}`,
  };
}

/** The samvatsara of a BS year (the 60-year Jovian cycle from the text's mean Jupiter). */
export function samvatsaraBlock(bsYear: number): Json | null {
  const jd = (y: number) => {
    const d = bsToJdn(y, 1, 1);
    return d === null ? null : suryaJupiterSignIngresses(d - 0.5);
  };
  const a = jd(bsYear);
  const anchor = jd(2080);
  if (a === null || anchor === null) return null;
  const i = (((50 + a - anchor) % 60) + 60) % 60;
  const [key, en, ne] = SAMVATSARA[i];
  return { key, name_en: en, name_ne: ne, cycle: i + 1, deity: i < 20 ? "brahma" : i < 40 ? "vishnu" : "shiva", index: i + 1 };
}

export { bsDateOf };
