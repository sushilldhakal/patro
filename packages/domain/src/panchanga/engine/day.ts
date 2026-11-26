// The day's panchanga (`/panchanga/{date}`), built from the sky on the device. The blocks this builds
// are listed in `DAY_BLOCKS`; the rest of the server's payload is added as each is ported, and
// `isComplete` says whether the result may stand in for the server's answer.
import { bsDateOf } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import {
  aayan,
  choghadiya,
  hora,
  aayanVedic,
  chandraRashiSpans,
  dayLength,
  dayTimes,
  karanaBlock,
  moonPhase,
  nakshatraBlock,
  nakshatraPadaSpans,
  rashiPayload,
  rituAt,
  rituVedic,
  sunMoon,
  suryaNakshatra,
  nepaliDigits,
  tithiBlock,
  tithiInfo,
  timeBlock,
  varaAt,
  yogaBlock,
  type Json,
  type Place,
} from "./blocks";
import { nivasShool } from "./nivas-blocks";
import { muhurtaBlock } from "./muhurta-blocks";
import { lagnaBlock, lagnaRows, lagnaSpans, panchakaRahita, planetTable, udayaLagna } from "./lagna-blocks";
import { solarCorrections } from "./solar-blocks";
import { chandrabalaTable, chandrabalam, rashifal, tarabalaTable, tarabalam } from "./bala-blocks";
import { displayHeaders, lunarCalendarBlock, lunarMonthBlock, nsDateBlock, pakshaBlock, samvatsaraBlock } from "./calendar-blocks";
import { pyRound } from "./py";
import { addSeconds, secondsSince, wallAt } from "./instant";
import { utcOffsetMinutes, civilJdn as jdnOf, FIRST_DEVICE_JDN } from "../../astronomy/lunar-month";
import { BS_MONTH_NAMES, BS_MONTH_NAMES_NE, PAYLOAD_KEYS, TITHI_NAMES_NE, VAARA_ENGLISH, VAARA_NAMES, VAARA_NAMES_NE } from "./tables.generated";

const tithiBlockOf = (t: { display: number; paksha: string }): string => (t.display === 15 ? (t.paksha === "shukla" ? "पूर्णिमा" : "औंसी") : (TITHI_NAMES_NE[t.display - 1] as string));

export interface DayInput extends Place {
  year: number;
  month: number;
  day: number;
  /** Echoed as `location.name` (and `city_id`). */
  name?: string;
  cityId?: number;
}

/** The `location` block every route echoes. */
export const locationBlock = (input: DayInput): Json => ({ lat: input.latitude, lon: input.longitude, timezone: input.timeZone, name: input.name ?? "Kathmandu", ...(input.cityId !== undefined ? { city_id: input.cityId } : {}) });

/** Keys of the server's day payload this engine makes today. */
export const DAY_BLOCKS = [
  "date", "date_ad", "jd_ut", "anchor", "display", "bs_date", "samvatsara", "ns_date", "location", "sunrise", "sunset", "day_ghati", "moonrise", "moonset",
  "dinamaan", "ratrimana", "madhyahna", "lahiri_ayanamsa", "vaara", "aayan", "aayan_vedic", "tithi", "nakshatra", "yoga",
  "choghadiya", "hora", "solar_corrections", "karana", "paksha", "chandra_rashi", "moon_phase", "chandra_rashi_spans", "nakshatra_pada_spans", "surya_rashi", "surya_nakshatra",
  "ritu", "ritu_vedic", "lunar_month", "lunar_calendar", "muhurta", "nivas_shool", "planets", "planets_anchor", "lagna", "lagna_spans", "udaya_lagna", "panchaka_rahita", "chandrabalam", "tarabalam", "tarabala_table", "chandrabala_table", "rashifal", "markers", "ayanamsa",
] as const;

/** Whether every key of the server's payload (slim or full) is made here. */
export const isComplete = (): boolean => PAYLOAD_KEYS.every((k) => (DAY_BLOCKS as readonly string[]).includes(k));

/**
 * `lean`: only what the year wheel keeps (year.ts WHEEL_DROP): the muhurta block without its full
 * list (the wheel reads only abhijit's solar noon), and no lagna spans, hora, choghadiya, nivas shool,
 * solar corrections or bala tables — over half the work of a day, done 365 times for a wheel.
 */
export function buildDay(sky: Sky, input: DayInput, lean = false): Json | null {
  const jdn = jdnOf(input.year, input.month, input.day);
  if (jdn < FIRST_DEVICE_JDN) return null;
  const zone = input.timeZone;
  const times = dayTimes(sky, jdn, input);
  if (!times) return null;
  const { sunrise, sunset, nextSunrise, moonrise, moonset } = times;
  const bs = bsDateOf(jdn);
  if (!bs) return null;
  const tithi = tithiInfo(sky, sunrise);
  const vaara = varaAt(sunrise, zone);
  const daySeconds = secondsSince(sunset, sunrise);
  const nightSeconds = secondsSince(nextSunrise, sunset);
  const dayGhati = Math.min((daySeconds / (daySeconds + nightSeconds)) * 60, 60);
  const ayanamsa = {
    name: sky.system === "drik" ? "Lahiri" : "Surya Siddhanta",
    // The server prints no ayanamsha for the Surya Siddhanta (its longitudes are already sidereal).
    degrees: sky.system === "drik" ? pyRound(sky.positionsAt(sunrise, 1, false)?.ayanamsha ?? 0, 6) : null,
  };
  const [sunLon, moonLon] = sunMoon(sky, sunrise);
  const observer = { sky, latitude: input.latitude, longitude: input.longitude, timeZone: zone };
  const lunar = lunarMonthBlock(jdn, tithi.paksha, observer);
  const nsBlock = nsDateBlock({ jdn, bsYear: bs.year, display: tithi.display, absolute: tithi.number, tithiNameNe: (tithiBlockOf(tithi) as string), paksha: tithi.paksha, month: lunar.name as string | null, isAdhik: Boolean(lunar.is_adhik) }, observer);
  if (!nsBlock) return null;
  const date = `${String(input.year).padStart(4, "0")}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`;
  const b: Json = {};
  b.date = date;
  b.date_ad = date;
  b.jd_ut = jdn - 0.5;
  b.anchor = "sunrise";
  b.display = displayHeaders(jdn, bs, VAARA_ENGLISH[vaara], nsBlock);
  b.bs_date = { year: bs.year, month: bs.month, day: bs.day, month_name: BS_MONTH_NAMES[bs.month - 1], month_name_ne: BS_MONTH_NAMES_NE[bs.month - 1] };
  b.samvatsara = samvatsaraBlock(bs.year);
  b.ns_date = nsBlock;
  b.location = locationBlock(input);
  b.sunrise = timeBlock(sunrise, zone, "nearest");
  b.sunset = timeBlock(sunset, zone, "nearest");
  b.day_ghati = dayGhati;
  b.muhurta = muhurtaBlock(sky, sunrise, sunset, nextSunrise, vaara, zone, !lean);
  if (!lean) b.nivas_shool = nivasShool(sky, sunrise, nextSunrise, (vaara + 6) % 7, zone);
  b.moonrise = moonrise === null ? null : timeBlock(moonrise, zone, "truncated");
  b.moonset = moonset === null ? null : timeBlock(moonset, zone, "truncated");
  if (!lean) {
    b.choghadiya = choghadiya(dayGhati, vaara);
    b.hora = hora(sunrise, sunset, nextSunrise, vaara, zone);
    b.solar_corrections = solarCorrections(sky, jdn, input, sunrise);
  }
  b.dinamaan = dayLength(sunrise, sunset);
  b.ratrimana = dayLength(sunset, nextSunrise);
  b.madhyahna = timeBlock((sunrise + sunset) / 2, zone, "truncated");
  b.lahiri_ayanamsa = ayanamsa;
  b.vaara = { number: vaara, name_sanskrit: VAARA_NAMES[vaara], name_english: VAARA_ENGLISH[vaara], name_ne: VAARA_NAMES_NE[vaara] };
  b.aayan = aayan(sky, sunrise);
  b.aayan_vedic = aayanVedic(sky, sunrise);
  b.tithi = tithiBlock(sky, sunrise, sunrise, zone, tithi);
  b.nakshatra = nakshatraBlock(sky, sunrise, sunrise, zone);
  b.tarabalam = tarabalam(b.nakshatra as Json);
  b.tarabala_table = tarabalaTable(b.nakshatra as Json);
  b.yoga = yogaBlock(sky, sunrise, sunrise, zone);
  b.karana = karanaBlock(sky, sunrise, sunrise, zone);
  b.paksha = pakshaBlock(lunar, tithi.paksha);
  b.chandra_rashi = rashiPayload(moonLon);
  b.moon_phase = moonPhase(sky, sunrise);
  b.chandra_rashi_spans = chandraRashiSpans(sky, sunrise, nextSunrise, zone);
  b.chandrabalam = chandrabalam(b.chandra_rashi_spans as Json[]);
  const bala = chandrabalaTable(b.chandra_rashi as Json);
  b.chandrabala_table = bala;
  b.rashifal = rashifal(bala, vaara);
  b.nakshatra_pada_spans = nakshatraPadaSpans(sky, sunrise, nextSunrise, zone);
  b.surya_rashi = rashiPayload(sunLon);
  b.surya_nakshatra = suryaNakshatra(sunLon);
  b.ritu = rituAt(sky, sunrise, input.latitude);
  b.ritu_vedic = rituVedic(sky, sunrise, input.latitude);
  b.lunar_calendar = lunarCalendarBlock(jdn, tithi.paksha, observer);
  b.lunar_month = lunar;
  b.planets_anchor = {
    type: "udayakal",
    local_time: wallAt(addSeconds(sunrise, 30), utcOffsetMinutes(zone, sunrise)).hm,
    label_ne: "उदयकालिक स्पष्टग्रह (सूर्योदय)",
    label_en: "Udayakalika Spashtagraha (sunrise)",
  };
  b.planets = planetTable(sky, sunrise);
  b.lagna = lagnaBlock(sky, sunrise, input.latitude, input.longitude);
  if (lean) {
    b.markers = { is_purnima: tithi.paksha === "shukla" && tithi.display === 15, is_Aausi: tithi.paksha === "krishna" && tithi.display === 15, is_ekadashi: tithi.display === 11 };
    b.ayanamsa = ayanamsa;
    const leanOrdered: Json = {};
    for (const k of PAYLOAD_KEYS) if (k in b) leanOrdered[k] = b[k];
    return leanOrdered;
  }
  const spans = lagnaSpans(sky, sunrise, nextSunrise, input);
  if (!spans) return null;
  b.lagna_spans = lagnaRows(spans);
  b.udaya_lagna = udayaLagna(spans);
  b.panchaka_rahita = panchakaRahita(sky, sunrise, spans, vaara, zone);
  b.markers = { is_purnima: tithi.paksha === "shukla" && tithi.display === 15, is_Aausi: tithi.paksha === "krishna" && tithi.display === 15, is_ekadashi: tithi.display === 11 };
  b.ayanamsa = ayanamsa;
  const ordered: Json = {};
  for (const k of PAYLOAD_KEYS) if (k in b) ordered[k] = b[k];
  void nepaliDigits;
  return ordered;
}
