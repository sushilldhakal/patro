// Chandrabalam, tarabalam, their navatara tables and the daily rashifal (`panchanga::blocks_bala`).
import { nepaliDigits, type Json } from "./blocks";
import {
  LUCKY_COLOR_EN,
  LUCKY_COLOR_NE,
  MOORTI_EN,
  MOORTI_NE,
  MOORTI_PHALA_EN,
  MOORTI_PHALA_NE,
  NAKSHATRA_NAMES,
  NAKSHATRA_NAMES_NE,
  NAVATARA,
  RASHI_NAMA_AKSHARAS_NE,
  RASHI_NAMES,
  RASHI_NAMES_NE,
  RASHI_TITLE_EN,
  REMEDY_EN,
  REMEDY_NE,
  TONE_PHALA_EN,
  TONE_PHALA_NE,
} from "./tables.generated";

const CHANDRA_GOOD_HOUSES = [1, 3, 6, 7, 10, 11];
const TARA_OFFSETS = [0, 2, 4, 6, 8, 10, 13, 15, 17, 19, 21, 24];

const rashiChip = (i: number): Json => ({ number: i + 1, name: RASHI_NAMES[i], name_ne: RASHI_NAMES_NE[i] });
const nakChip = (i: number): Json => ({ number: i + 1, name: NAKSHATRA_NAMES[i], name_ne: NAKSHATRA_NAMES_NE[i] });

/** The end fields of a span, as the anga blocks print them (`till`). */
function till(span: Json): Json {
  const local = String(span.end_local_time);
  return { end_time: span.end_time, end_local_time: local, end_local_time_short: local.slice(0, 5), end_hours_clock: span.end_hours_clock, end_ghati_clock: span.end_ghati_clock };
}

const janmaSet = (moon: number) => CHANDRA_GOOD_HOUSES.map((h) => rashiChip((moon + 12 - (h - 1)) % 12));

/** `build_chandrabalam`: good janma rashis for this and the next Moon rashi. */
export function chandrabalam(spans: Json[]): Json {
  const first = spans[0];
  if (!first) return { till: null, set1: [], set2: [] };
  const moon = (first.number as number) - 1;
  const second = spans[1];
  const [tillValue, next] = second && first.end_time ? [till(first), (second.number as number) - 1] : [null, (moon + 1) % 12];
  return { till: tillValue, set1: janmaSet(moon), set2: janmaSet(next) };
}

/** `build_tarabalam`: good janma nakshatras for this and the next Moon nakshatra. */
export function tarabalam(block: Json): Json {
  const current = (block.number as number) - 1;
  const set = (from: number) => TARA_OFFSETS.map((o) => nakChip((from + o) % 27));
  const nextNumber = (block.next as Json | undefined)?.number as number | undefined;
  const [tillValue, next] = block.end_time && nextNumber && nextNumber > 0 ? [till(block), nextNumber - 1] : [null, (current + 1) % 27];
  return { till: tillValue, set1: set(current), set2: set(next) };
}

const navataraNumber = (moon: number, target: number, cycle: number) => {
  const diff = (target + cycle - moon) % cycle;
  return diff === 0 ? 1 : ((9 - (diff % 9)) % 9) + 1;
};

export function tarabalaTable(block: Json): Json {
  const moon = (block.number as number) - 1;
  const rows = Array.from({ length: 27 }, (_, i) => {
    const taraNum = navataraNumber(moon, i, 27);
    const [tara, , quality, , tone] = NAVATARA[taraNum - 1];
    return { index: i, name: NAKSHATRA_NAMES_NE[i], name_en: NAKSHATRA_NAMES[i], tara, quality, tone, tara_num: taraNum };
  });
  return { moon_index: moon, moon_label: (block.name_ne as string) ?? NAKSHATRA_NAMES_NE[moon], moon_label_en: (block.name as string) ?? NAKSHATRA_NAMES[moon], rows };
}

function houseQuality(house: number): [string, string] {
  if (house === 8) return ["अष्टम चन्द्र", "worst"];
  if (CHANDRA_GOOD_HOUSES.includes(house)) return ["शुभ", "good"];
  if (house === 4 || house === 12) return ["अशुभ", "bad"];
  return ["मध्यम", "neutral"];
}

interface ChandraRow {
  index: number;
  name: string;
  name_en: string;
  house: number;
  tara: string;
  quality: string;
  tone: string;
}
export function chandrabalaTable(chandraRashi: Json): { moon_index: number; moon_label: string; moon_label_en: string; rows: ChandraRow[] } {
  const moon = (chandraRashi.number as number) - 1;
  const rows = Array.from({ length: 12 }, (_, i): ChandraRow => {
    const house = ((moon + 12 - i) % 12) + 1;
    const [quality, tone] = houseQuality(house);
    return { index: i, name: RASHI_NAMES_NE[i], name_en: RASHI_NAMES[i], house, tara: `${nepaliDigits(house)}औं भाव`, quality, tone };
  });
  return { moon_index: moon, moon_label: (chandraRashi.name_ne as string) ?? RASHI_NAMES_NE[moon], moon_label_en: (chandraRashi.name as string) ?? RASHI_NAMES[moon], rows };
}

const moorti = (house: number) => (house === 1 || house === 6 || house === 11 ? 0 : house === 2 || house === 5 || house === 9 ? 1 : house === 4 || house === 8 || house === 12 ? 3 : 2);
const toneIndex = (tone: string) => Math.max(0, ["best", "good", "neutral", "bad", "worst"].indexOf(tone)) || (tone === "best" ? 0 : 2);

/** `build_daily_rashifal`: twelve signs from the chandrabala table. */
export function rashifal(table: ReturnType<typeof chandrabalaTable>, vaara: number): Json {
  const signs = table.rows.map((row) => {
    const i = row.index;
    const m = moorti(row.house);
    const t = row.tone === "best" ? 0 : toneIndex(row.tone);
    const weak = row.tone === "bad" || row.tone === "worst";
    const predict = (phala: readonly string[], moorti: readonly string[], remedy: readonly string[]) => [phala[t], moorti[m], ...(weak ? [remedy[i % 12]] : [])].join(" ");
    return {
      index: i,
      id: i + 1,
      name: row.name,
      name_en: row.name_en,
      title_en: RASHI_TITLE_EN[i],
      syllables_ne: RASHI_NAMA_AKSHARAS_NE[i],
      tara: row.tara,
      quality: row.quality,
      tone: row.tone,
      house_from_moon: row.house,
      moorti: ["swarna", "rajata", "tamra", "loha"][m],
      moorti_ne: MOORTI_NE[m],
      moorti_en: MOORTI_EN[m],
      lucky_color_ne: LUCKY_COLOR_NE[m],
      lucky_color_en: LUCKY_COLOR_EN[m],
      lucky_number_ne: nepaliDigits(row.house),
      lucky_number_en: String(row.house),
      prediction_ne: predict(TONE_PHALA_NE, MOORTI_PHALA_NE, REMEDY_NE),
      prediction_en: predict(TONE_PHALA_EN, MOORTI_PHALA_EN, REMEDY_EN),
    };
  });
  return {
    period: "daily",
    anchor: "sunrise",
    vaara_num: vaara,
    method: { frame: "surya_siddhanta", ayanamsa: "Surya Siddhanta", chandrabala: "transit_moon_house", moorti: "transit_moon_house_from_janma_rashi" },
    moon_index: table.moon_index,
    moon_label: table.moon_label,
    moon_label_en: table.moon_label_en,
    signs,
  };
}
