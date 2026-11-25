// The sait listings made on the device (`patro::sait`): the days of a BS year a ceremony can be held, and the
// month overview of every category. A day counts when the ceremony's muhurta rules leave a window in it
// (`has_muhurta`); rudri jurne and agni jurne are judged from the day's tithi and weekday alone.
import { bsDateOf, bsMonth, civilFromJdn } from "../astronomy/lunar-month";
import type { Sky } from "../astronomy/sky";
import { dayTimes, karanaAt, karanaName, tithiInfo, varaAt, yogaAt, type Place } from "../panchanga/engine/blocks";
import type { Json } from "../panchanga/engine/blocks";
import { CEREMONY_RULES } from "./ceremony-rules.generated";
import { windowsFor, type Rule } from "./ceremony-windows";
import { SAIT_CATEGORIES } from "./sait-categories.generated";

const BS_MONTHS_NE = ["वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
const ANNAPRASAN_NOTE = "अन्नप्रासन requires the child's birth date to pick the 5–8 month window; year-wide listings show nakshatra-suitable days only.";
const SAIT_GENERATE_MIN_YEAR = 60;
const SAIT_GENERATE_MAX_YEAR = 3000;
/** The years the apps list (`SAIT_LIST_MIN_YEAR` to `SAIT_LIST_MAX_YEAR`). */
export const saitYears = (): Json => ({ years: Array.from({ length: 2200 - 1700 + 1 }, (_, i) => 1700 + i) });

const agniOnEarth = (tithiAbsolute: number, vaara: number) => [0, 3].includes((tithiAbsolute + vaara + 1) % 4);
const rudraOnEarth = (tithiAbsolute: number) => tithiAbsolute !== 30 && [1, 2, 3].includes((2 * tithiAbsolute + 5) % 7);

/** `check_rudri_jurne` and `check_agni_jurne` for the civil day `jdn`. */
function jurne(sky: Sky, jdn: number, place: Place, category: "rudri-jurne" | "agni-jurne"): boolean {
  const times = dayTimes(sky, jdn, place);
  if (!times) return false;
  const t = tithiInfo(sky, times.sunrise);
  const vaara = varaAt(times.sunrise, place.timeZone) + 1;
  if (category === "agni-jurne") return agniOnEarth(t.number, vaara);
  const yoga = yogaAt(sky, times.sunrise).number;
  return rudraOnEarth(t.number) && agniOnEarth(t.number, vaara) && yoga !== 17 && yoga !== 27 && karanaName(karanaAt(sky, times.sunrise).number).name !== "Vishti";
}

/** Whether `category` can be held on the civil day: its muhurta rule leaves a window, or the jurne rules say so. */
function matches(sky: Sky, category: string, jdn: number, place: Place, rule?: Rule): boolean {
  const base = rule ?? (CEREMONY_RULES as unknown as Record<string, unknown>)[category];
  if (base) {
    try {
      return windowsFor(sky, base as Rule, jdn, place, false).length > 0;
    } catch {
      return false;
    }
  }
  if (category === "rudri-jurne" || category === "agni-jurne") return jurne(sky, jdn, place, category);
  return false;
}

/** `scan_year`: the days (BS day numbers) of each BS month that match. */
function scanYear(sky: Sky, bsYear: number, category: string, place: Place, rule?: Rule): Record<string, number[]> | null {
  const byMonth: Record<string, number[]> = {};
  for (let month = 1; month <= 12; month += 1) {
    const range = bsMonth(bsYear, month);
    if (!range) return null;
    const days: number[] = [];
    for (let d = 1; d <= range.length; d += 1) if (matches(sky, category, range.first + d - 1, place, rule)) days.push(d);
    if (days.length) byMonth[String(month)] = days;
  }
  return byMonth;
}

const categoryMeta = (id: string) => SAIT_CATEGORIES.find((c) => c.id === id);

/** `GET /nepal/sait/{bs_year}/{category}`: null when this device cannot answer (the server does). */
export function saitMonthEntries(sky: Sky, bsYear: number, category: string, place: Place): Json | null {
  const meta = categoryMeta(category);
  if (!meta || bsYear < SAIT_GENERATE_MIN_YEAR || bsYear > SAIT_GENERATE_MAX_YEAR) return null;
  const rule = (CEREMONY_RULES as unknown as Record<string, Rule | undefined>)[category];
  let months = scanYear(sky, bsYear, category, place, rule);
  if (!months) return null;
  // A ceremony with a fallback nakshatra list widens to it when the year is thin.
  const fallback = rule as unknown as { fallbackNakshatras?: number[]; fallbackMinDays?: number } | undefined;
  if (rule && fallback?.fallbackNakshatras?.length && Object.values(months).reduce((a, d) => a + d.length, 0) < (fallback.fallbackMinDays ?? 0)) {
    months = scanYear(sky, bsYear, category, place, { ...rule, nakshatras: fallback.fallbackNakshatras } as Rule);
    if (!months) return null;
  }
  const out: Json = {
    bs_year: bsYear,
    category,
    category_label_ne: meta.label_ne,
    months: Object.entries(months)
      .map(([key, days]) => ({ month: Number(key), month_name_ne: BS_MONTHS_NE[Number(key) - 1], days: [...days].sort((a, b) => a - b) }))
      .sort((a, b) => a.month - b.month),
    source: "computed",
  };
  if (category === "annaprasan") out.note = ANNAPRASAN_NOTE;
  return out;
}

/** `GET /nepal/sait/{bs_year}/month/{bs_month}`: every category's days in one month. */
export function saitMonthAll(sky: Sky, bsYear: number, bsMonthNumber: number, place: Place): Json | null {
  if (bsMonthNumber < 1 || bsMonthNumber > 12) return null;
  const range = bsMonth(bsYear, bsMonthNumber);
  if (!range) return null;
  const categories: Json = {};
  if (civilFromJdn(range.first).year < 1582 || bsDateOf(range.first) === null) {
    for (const c of SAIT_CATEGORIES) categories[c.id] = [];
    return { bs_year: bsYear, bs_month: bsMonthNumber, month_name_ne: BS_MONTHS_NE[bsMonthNumber - 1], categories, unavailable_reason: "pre_ce" };
  }
  for (const c of SAIT_CATEGORIES) {
    const days: number[] = [];
    for (let d = 1; d <= range.length; d += 1) if (matches(sky, c.id, range.first + d - 1, place, (CEREMONY_RULES as unknown as Record<string, Rule | undefined>)[c.id])) days.push(d);
    categories[c.id] = days;
  }
  return { bs_year: bsYear, bs_month: bsMonthNumber, month_name_ne: BS_MONTHS_NE[bsMonthNumber - 1], categories };
}

// ---------------------------------------------------------------- detail: the muhurta window of each day

import { civilJdn, bsToJdn } from "../astronomy/lunar-month";
import { localInstant } from "../panchanga/engine/midnight";
import { wallIn } from "../panchanga/engine/instant";
import { nakshatraAt } from "../panchanga/engine/blocks";
import { KARANA_NAMES, NAKSHATRA_NAMES, YOGA_NAMES } from "../panchanga/engine/tables.generated";
import { dayPanchanga } from "./ceremony-windows";
import { SAIT_KARANA_NAMES_NE, SAIT_NAKSHATRA_NAMES_NE, SAIT_RASHI_NAMES_EN, SAIT_RASHI_NAMES_NE, SAIT_TITHI_NAMES_EN, SAIT_TITHI_NAMES_NE, SAIT_VAARA_NAMES_NE, SAIT_WEEKDAY_EN, SAIT_YOGA_NAMES_NE } from "./sait-names.generated";

const SAIT_ENGINE_VERSION = "4.13.0+a6";
const LUNAR_MASA_NE: Record<string, string> = { Baishakh: "वैशाख", Jestha: "ज्येष्ठ", Ashadh: "आषाढ", Shrawan: "श्रावण", Bhadra: "भाद्रपद", Ashwin: "आश्विन", Kartik: "कार्तिक", Mangsir: "मार्गशीर्ष", Poush: "पौष", Magh: "माघ", Falgun: "फाल्गुन", Chaitra: "चैत्र" };
const BRATABANDHA_NAKSHATRAS: Record<string, number[]> = {
  classical: [1, 4, 5, 7, 8, 10, 12, 13, 14, 15, 17, 19, 21, 22, 23, 24, 26, 27],
  nepali: [1, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  liberal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27],
};
/** `toggleable_rule_ids`: the rules a reader may switch off, by category. */
const TOGGLEABLE: Record<string, string[]> = {
  vivah: ["month", "solar-month", "tithi", "nakshatra", "yoga", "karana", "vara", "dosha", "graha", "simhastha", "kshaya-paksha"],
  bratabandha: ["nakshatra", "tithi", "galagraha", "vara", "yoga", "karana", "dosha", "graha", "simhastha", "time-window"],
  "griha-aarambha": ["solar-month", "tithi", "nakshatra", "graha", "yoga", "karana", "lagna"],
};
type MutableRule = { -readonly [K in keyof Rule]: Rule[K] };

/** `relax_rule`: the rule with the switched-off parts emptied. */
function relaxRule(category: string, rule: Rule, disabled: Set<string>): Rule {
  const r = { ...rule } as MutableRule;
  const noTithis = () => {
    r.tithis = [];
    r.shuklaTithis = [];
    r.krishnaTithis = [];
    r.shuklaOnly = false;
  };
  const noDosha = () => {
    r.checkDagdha = false;
    r.checkShunya = false;
    r.grahaVedhaPlanets = [];
  };
  const noGraha = () => {
    r.requireGuruUdaya = false;
    r.requireShukraUdaya = false;
    r.rejectGuruShukraBalaVriddha = false;
  };
  for (const id of disabled) {
    const key = `${category}/${id}`;
    switch (key) {
      case "vivah/month": r.lunarMonths = []; r.blockChaturmas = false; break;
      case "vivah/solar-month": case "griha-aarambha/solar-month": r.sunRashis = []; break;
      case "vivah/tithi": case "bratabandha/tithi": case "griha-aarambha/tithi": noTithis(); break;
      case "vivah/nakshatra": case "griha-aarambha/nakshatra": r.nakshatras = []; break;
      case "bratabandha/nakshatra": r.nakshatras = BRATABANDHA_NAKSHATRAS.nepali; break;
      case "vivah/yoga": case "bratabandha/yoga": case "griha-aarambha/yoga": r.avoidYogas = []; break;
      case "vivah/karana": case "bratabandha/karana": case "griha-aarambha/karana": r.avoidKaranas = []; break;
      case "vivah/vara": case "bratabandha/vara": r.avoidVaras = []; break;
      case "vivah/dosha": case "bratabandha/dosha": noDosha(); break;
      case "vivah/graha": case "bratabandha/graha": case "griha-aarambha/graha": noGraha(); break;
      case "vivah/simhastha": case "bratabandha/simhastha": r.avoidGuruRashis = []; break;
      case "vivah/kshaya-paksha": r.blockKshayaPaksha = false; break;
      case "bratabandha/galagraha": r.avoidTithis = []; break;
      case "bratabandha/time-window": r.endAtMadhyahna = false; break;
      case "griha-aarambha/lagna": r.lagnas = []; break;
      default: break;
    }
  }
  return r;
}
const applyNakshatraMode = (rule: Rule, mode: string | undefined): Rule => {
  const key = (rule as unknown as { key: string }).key;
  if (key !== "bratabandha" || !mode || !BRATABANDHA_NAKSHATRAS[mode]) return rule;
  return { ...rule, nakshatras: BRATABANDHA_NAKSHATRAS[mode] } as Rule;
};

const hm = (jd: number, zone: string) => wallIn(jd, zone).hm;
const NAKSHATRA_SPAN = 360 / 27;

export interface SaitDetailOptions {
  /** Rule ids the reader switched off (only the toggleable ones count). */
  exclude?: string[];
  /** `classical` (default), `nepali` or `liberal`; bratabandha only. */
  nakshatraMode?: string;
}

/** `GET /nepal/sait/{bs_year}/{category}/detail`: each day with its longest window and the panchanga at its start. Null for the server. */
export function saitDetail(sky: Sky, bsYear: number, category: string, place: Place, options: SaitDetailOptions = {}): Json | null {
  const meta = categoryMeta(category);
  const base = (CEREMONY_RULES as unknown as Record<string, Rule | undefined>)[category];
  if (!meta || !base || bsYear < SAIT_GENERATE_MIN_YEAR || bsYear > SAIT_GENERATE_MAX_YEAR) return null;
  const normalized = (options.nakshatraMode ?? "").trim().toLowerCase();
  if (normalized && !["classical", "nepali", "liberal"].includes(normalized)) return null;
  const mode = category === "bratabandha" && normalized ? normalized : undefined;
  const allowed = TOGGLEABLE[category] ?? [];
  const exclude = new Set((options.exclude ?? []).filter((id) => allowed.includes(id)));
  const custom = exclude.size > 0 || (mode !== undefined && mode !== "classical");
  let byMonth: Record<string, number[]> | null;
  let detailRule: Rule;
  if (custom) {
    detailRule = applyNakshatraMode(relaxRule(category, base, exclude), mode);
    byMonth = scanYear(sky, bsYear, category, place, detailRule);
  } else {
    byMonth = scanYear(sky, bsYear, category, place, base);
    detailRule = base;
    const fallback = base as unknown as { fallbackNakshatras?: number[]; fallbackMinDays?: number };
    if (byMonth && fallback.fallbackNakshatras?.length && Object.values(byMonth).reduce((a, d) => a + d.length, 0) < (fallback.fallbackMinDays ?? 0)) {
      detailRule = { ...base, nakshatras: fallback.fallbackNakshatras } as Rule;
      byMonth = scanYear(sky, bsYear, category, place, detailRule);
    }
    if (mode) detailRule = applyNakshatraMode(detailRule, mode);
  }
  if (!byMonth) return null;
  const days: Json[] = [];
  for (const [monthKey, dayNums] of Object.entries(byMonth).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const month = Number(monthKey);
    const range = bsMonth(bsYear, month);
    if (!range) return null;
    for (const bsDay of [...dayNums].sort((a, b) => a - b)) {
      const jdn = range.first + bsDay - 1;
      const windows = windowsFor(sky, detailRule, jdn, place, false);
      if (!windows.length) continue;
      // The longest window; of equal lengths the first.
      const win = windows.reduce((best, w) => (w[1] - w[0] > best[1] - best[0] ? w : best));
      const times = dayTimes(sky, jdn, place);
      if (!times) return null;
      const dp = dayPanchanga(sky, jdn, place, times.sunrise);
      const vaara0 = vaaraOf(sky, jdn, place) - 1;
      const t = tithiInfo(sky, win[0]);
      const nak = nakshatraAt(sky, win[0]).number;
      const yoga = yogaAt(sky, win[0]).number;
      const karana = karanaName(karanaAt(sky, win[0]).number).name;
      const c = civilFromJdn(jdn);
      days.push({
        bs_month: month,
        bs_day: bsDay,
        bs_month_name_ne: BS_MONTHS_NE[month - 1],
        gregorian: `${String(c.year).padStart(4, "0")}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`,
        weekday_en: SAIT_WEEKDAY_EN[vaara0],
        weekday_ne: SAIT_VAARA_NAMES_NE[vaara0],
        window_start: hm(win[0], place.timeZone),
        window_end: hm(win[1], place.timeZone),
        tithi_num: t.display,
        tithi_en: SAIT_TITHI_NAMES_EN[t.display - 1],
        tithi_ne: SAIT_TITHI_NAMES_NE[t.display - 1],
        paksha: t.paksha,
        paksha_ne: t.paksha === "shukla" ? "शुक्ल पक्ष" : "कृष्ण पक्ष",
        nakshatra_num: nak,
        nakshatra_en: NAKSHATRA_NAMES[nak - 1],
        nakshatra_ne: SAIT_NAKSHATRA_NAMES_NE[nak - 1],
        yoga_en: YOGA_NAMES[yoga - 1],
        yoga_ne: SAIT_YOGA_NAMES_NE[yoga - 1],
        karana_en: karana,
        karana_ne: SAIT_KARANA_NAMES_NE[Math.max(0, (KARANA_NAMES as readonly string[]).indexOf(karana))],
        lagna_en: SAIT_RASHI_NAMES_EN[win[2] - 1],
        lagna_ne: SAIT_RASHI_NAMES_NE[win[2] - 1],
        lunar_month_en: dp.lunarMonth ?? "Unknown",
        lunar_month_ne: LUNAR_MASA_NE[dp.lunarMonth ?? "Unknown"] ?? dp.lunarMonth ?? "Unknown",
      });
    }
  }
  return {
    bs_year: bsYear,
    category,
    category_label_ne: meta.label_ne,
    engine_version: SAIT_ENGINE_VERSION,
    excluded_rules: [...exclude].sort(),
    nakshatra_mode: mode ?? (category === "bratabandha" ? "classical" : null),
    days,
  };
}
/** The weekday number 1 (Sunday) to 7 at the day's sunrise. */
const vaaraOf = (sky: Sky, jdn: number, place: Place): number => {
  const t = dayTimes(sky, jdn, place);
  return t ? varaAt(t.sunrise, place.timeZone) + 1 : 1;
};

// ---------------------------------------------------------------- personalize: the days against one birth chart

const taraNumber = (moonIdx: number, targetIdx: number, cycle: number): number => {
  const diff = (((targetIdx - moonIdx + cycle) % cycle) + cycle) % cycle;
  return diff === 0 ? 1 : ((((9 - (diff % 9)) % 9) + 9) % 9) + 1;
};
const taraTone = (n: number) => ([2, 4, 6, 9].includes(n) ? "best" : n === 8 ? "good" : [3, 5].includes(n) ? "bad" : n === 7 ? "worst" : "neutral");
const TARA_NE = ["जन्म", "सम्पत्", "विपत्", "क्षेम", "प्रत्यक्", "साधक", "निधन", "मित्र", "परम मित्र"];
const planetTone = (house: number, good: number[]) => ([4, 8, 12].includes(house) ? "avoid" : good.includes(house) ? "good" : "shanti");
const overallTone = (tones: string[]) => (tones.includes("avoid") ? "avoid" : tones.length && tones.every((t) => t === "good") ? "good" : "shanti");
const rashiAt = (lon: number) => ((Math.floor(lon / 30) % 12) + 12) % 12 + 1;
const BODY_INDEX = { sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6, rahu: 7 } as const;
const bodyLon = (sky: Sky, body: keyof typeof BODY_INDEX, jd: number) => {
  const p = sky.positionsAt(jd, 8, false);
  if (!p) throw new Error("no positions");
  return p.longitude[BODY_INDEX[body]];
};

function kumbhaZone(count: number): Json {
  const z: [string, string, string, string, string, string] =
    count === 1 ? ["mukha", "मुख", "Mouth", "आगोको भय", "risk of fire", "avoid"]
    : count <= 5 ? ["purva", "पूर्व", "East", "सुखपूर्वक बस्न कठिन", "hard to live comfortably", "shanti"]
    : count <= 9 ? ["dakshina", "दक्षिण", "South", "धनलाभ", "brings wealth", "good"]
    : count <= 13 ? ["paschima", "पश्चिम", "West", "लक्ष्मीलाभ", "gain of Lakṣmī", "good"]
    : count <= 17 ? ["uttara", "उत्तर", "North", "कलह", "quarrels", "shanti"]
    : count <= 21 ? ["garbha", "गर्भ", "Womb", "गृहस्वामीको नाश", "harms the owner", "avoid"]
    : count <= 24 ? ["tala", "तल", "Bottom", "दीर्घायु", "long life", "good"]
    : ["kantha", "कण्ठ", "Throat", "स्थिर वास", "lasting residence", "good"];
  return { zone: z[0], zone_ne: z[1], zone_en: z[2], effect_ne: z[3], effect_en: z[4], tone: z[5] };
}
const sunNakshatra = (sky: Sky, sunrise: number) => ((Math.floor(bodyLon(sky, "sun", sunrise) / NAKSHATRA_SPAN) % 27) + 27) % 27 + 1;
const kumbhaChakra = (sky: Sky, sunrise: number, moonNak: number): Json => {
  const sunNak = sunNakshatra(sky, sunrise);
  const count = ((((moonNak - sunNak) % 27) + 27) % 27) + 1;
  return { count, sun_nakshatra: sunNak, ...kumbhaZone(count) };
};
const AGNI_PLANETS: [string, string, string, boolean][] = [["sun", "सूर्य", "Sun", false], ["mercury", "बुध", "Mercury", true], ["venus", "शुक्र", "Venus", true], ["saturn", "शनि", "Saturn", false], ["moon", "चन्द्र", "Moon", true], ["mars", "मंगल", "Mars", false], ["jupiter", "गुरु", "Jupiter", true], ["rahu", "राहु", "Rahu", false], ["ketu", "केतु", "Ketu", false]];
const agniMukha = (sky: Sky, sunrise: number, moonNak: number): Json => {
  const sunNak = sunNakshatra(sky, sunrise);
  const count = ((((moonNak - sunNak) % 27) + 27) % 27) + 1;
  const [planet, ne, en, benefic] = AGNI_PLANETS[Math.min(Math.trunc((count - 1) / 3), AGNI_PLANETS.length - 1)];
  return { count, sun_nakshatra: sunNak, planet, planet_ne: ne, planet_en: en, benefic, tone: benefic ? "good" : "avoid" };
};
const SHUDDHI: Record<string, [string, keyof typeof BODY_INDEX, number[]][]> = {
  bratabandha: [["guru", "jupiter", [2, 5, 7, 9, 11]]],
  "griha-aarambha": [["sun", "sun", [3, 6, 10, 11]], ["moon", "moon", [3, 6, 7, 10, 11]], ["guru", "jupiter", [2, 5, 7, 9, 11]], ["shukra", "venus", [2, 5, 7, 9, 11]]],
  "byaparik-pratisthan": [["moon", "moon", [3, 6, 7, 10, 11]]],
};
function grahaShuddhi(sky: Sky, sunrise: number, janmaRashi: number, moonRashi: number, category: string): Json | null {
  const planets = SHUDDHI[category];
  if (!planets) return null;
  const rows: Json[] = [];
  const tones: string[] = [];
  for (const [key, body, good] of planets) {
    const pRashi = key === "moon" ? moonRashi : rashiAt(bodyLon(sky, body, sunrise));
    const house = ((((pRashi - janmaRashi) % 12) + 12) % 12) + 1;
    const tone = planetTone(house, good);
    tones.push(tone);
    rows.push({ planet: key, house, tone, rashi_ne: SAIT_RASHI_NAMES_NE[pRashi - 1], rashi_en: SAIT_RASHI_NAMES_EN[pRashi - 1] });
  }
  return { tone: overallTone(tones), planets: rows };
}
function annaMonth(jdn: number, birthJdn: number | null, gender: string | undefined): Json | null {
  if (birthJdn === null || !gender) return null;
  const g = gender.trim().toLowerCase();
  const sex = g.startsWith("m") ? "male" : g.startsWith("f") ? "female" : null;
  if (!sex) return null;
  const a = civilFromJdn(jdn);
  const b = civilFromJdn(birthJdn);
  let months = (a.year - b.year) * 12 + (a.month - b.month);
  if (a.day < b.day) months -= 1;
  const matches = sex === "male" ? [6, 8, 10, 12].includes(months) : [5, 7, 9, 11].includes(months);
  return { ordinal_month: months, gender: sex, matches, tone: matches ? "good" : "avoid" };
}
const verdict = (tara: string, chandra: string, categoryBad: boolean, native: string | null): string => {
  if (categoryBad || ["bad", "worst"].includes(tara) || ["bad", "worst"].includes(chandra) || native === "avoid") return "avoid";
  if (native === "shanti") return "neutral";
  return ["best", "good"].includes(tara) && ["best", "good"].includes(chandra) ? "favourable" : "neutral";
};

function annotateOne(sky: Sky, jdn: number, place: Place, janmaNak: number, janmaRashi: number, category: string, birthJdn: number | null, gender: string | undefined): Json | null {
  const times = dayTimes(sky, jdn, place);
  if (!times) return null;
  const sunrise = times.sunrise;
  const tNak = nakshatraAt(sky, sunrise).number;
  const tRashi = rashiAt(bodyLon(sky, "moon", sunrise));
  const tara = taraNumber(janmaNak - 1, tNak - 1, 27);
  const chandra = taraNumber(janmaRashi - 1, tRashi - 1, 12);
  const [taraT, chandraT] = [taraTone(tara), taraTone(chandra)];
  const moonHouse = ((((tRashi - janmaRashi) % 12) + 12) % 12) + 1;
  let categoryBad = false;
  if (category === "rudri-jurne") categoryBad = [4, 8, 12].includes(moonHouse) || tara === 1;
  else if (category === "agni-jurne") categoryBad = [4, 8, 12].includes(moonHouse);
  else if (category === "annaprasan") categoryBad = tara === 1;
  else if (category === "griha-aarambha") categoryBad = tNak === janmaNak;
  const shuddhi = grahaShuddhi(sky, sunrise, janmaRashi, tRashi, category);
  const kumbha = category === "griha-pravesh" ? kumbhaChakra(sky, sunrise, tNak) : null;
  const agni = category === "agni-jurne" ? agniMukha(sky, sunrise, tNak) : null;
  const anna = category === "annaprasan" ? annaMonth(jdn, birthJdn, gender) : null;
  const native = (shuddhi?.tone ?? kumbha?.tone ?? agni?.tone ?? anna?.tone ?? null) as string | null;
  return {
    suitability: verdict(taraT, chandraT, categoryBad, native),
    tara_num: tara,
    tara_tone: taraT,
    tara_ne: TARA_NE[tara - 1],
    chandra_num: chandra,
    chandra_tone: chandraT,
    moon_house: moonHouse,
    shuddhi,
    kumbha,
    agni_mukha: agni,
    anna_month: anna,
    transit_nakshatra: tNak,
    transit_nakshatra_ne: SAIT_NAKSHATRA_NAMES_NE[tNak - 1],
    transit_nakshatra_en: NAKSHATRA_NAMES[tNak - 1],
    transit_rashi_ne: SAIT_RASHI_NAMES_NE[tRashi - 1],
    transit_rashi_en: SAIT_RASHI_NAMES_EN[tRashi - 1],
  };
}

export interface SaitBirth {
  janmaNakshatra?: number;
  janmaRashi?: number;
  /** The birth moment as era parts and a clock on the birth zone's wall. */
  moment?: { era: string; year: number; month: number; day: number; clock?: string; tz: string };
  gender?: string;
}

/** `GET /nepal/sait/{bs_year}/{category}/personalize`: each listed day read against one birth chart. Null for the server. */
export function saitPersonalize(sky: Sky, bsYear: number, category: string, place: Place, birth: SaitBirth): Json | null {
  let janmaNak = birth.janmaNakshatra;
  let janmaRashi = birth.janmaRashi;
  let birthJdn: number | null = null;
  if (birth.moment) {
    const m = birth.moment;
    const jdn = m.era === "ad" ? civilJdn(m.year, m.month, m.day) : m.era === "bs" ? bsToJdn(m.year, m.month, m.day) : null;
    if (jdn === null || jdn === undefined || civilFromJdn(jdn).year < 1970) return null;
    const clock = (m.clock && m.clock !== "" ? m.clock : "12:00").split(":");
    const [h, min] = [Number(clock[0]), Number(clock[1])];
    if (!Number.isInteger(h) || !Number.isInteger(min) || h > 23 || min > 59) return null;
    birthJdn = jdn;
    if (janmaNak === undefined || janmaRashi === undefined) {
      const utc = localInstant(jdn, h * 3600 + min * 60, m.tz);
      const moon = bodyLon(sky, "moon", utc);
      janmaNak = Math.trunc(pyMod360(moon) / NAKSHATRA_SPAN) + 1;
      janmaRashi = rashiAt(moon);
    }
  }
  if (janmaNak === undefined || janmaRashi === undefined || janmaNak < 1 || janmaNak > 27 || janmaRashi < 1 || janmaRashi > 12) return null;
  const entries = saitMonthEntries(sky, bsYear, category, place);
  if (!entries) return null;
  const days: Json[] = [];
  for (const month of entries.months as { month: number; days: number[] }[]) {
    const range = bsMonth(bsYear, month.month);
    if (!range) return null;
    for (const d of month.days) {
      const note = annotateOne(sky, range.first + d - 1, place, janmaNak, janmaRashi, category, birthJdn, birth.gender);
      if (!note) return null;
      days.push({ bs_month: month.month, bs_day: d, ...note });
    }
  }
  const counts: Record<string, number> = { favourable: 0, neutral: 0, avoid: 0 };
  for (const row of days) counts[row.suitability as string] = (counts[row.suitability as string] ?? 0) + 1;
  return { bs_year: bsYear, category, janma: { nakshatra: janmaNak, rashi: janmaRashi }, counts, days };
}
const pyMod360 = (x: number) => ((x % 360) + 360) % 360;
