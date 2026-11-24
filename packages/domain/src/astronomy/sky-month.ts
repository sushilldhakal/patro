// A BS month grid made on the client, in the server's `/panchanga/{year}/{month}` (lite) shape, so
// the screens do not change. Every row is derived from the sky the app carries: sunrise and sunset,
// the five angas at sunrise, the Moon's rise and set, the ayana, the Abhijit window, and the day's
// festivals from the client festival engine. The server holds none of it.
//
// BS months only (Surya civil grid), BS 1951-2149 where the bundled sky answers. Anything else
// returns null and the caller asks the server.
import { bsMonth, civilFromJdn, isoFromJdn, observedYear, setReferenceOffsetDate, utcOffsetMinutes, type PatroObserver } from "./lunar-month";
import { moonRiseSet } from "./moon-rise";
import type { Sky } from "./sky";
import { skyDay } from "./sky-day";
import { festivalsForDay, generateBsFestivals, type FestivalEntry } from "../festivals/festival-engine";

const TITHI = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
const TITHI_NE = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"];
const NAKSHATRA = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const NAKSHATRA_NE = ["अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा", "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी", "उत्तराफाल्गुनी", "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढा", "उत्तराषाढा", "श्रवण", "धनिष्ठा", "शतभिषा", "पूर्वभाद्रपदा", "उत्तरभाद्रपदा", "रेवती"];
const YOGA = ["Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];
const YOGA_NE = ["विष्कुम्भ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा", "धृति", "शूल", "गण्ड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र", "सिद्धि", "व्यतीपात", "वरीयान", "परिघ", "शिव", "सिद्ध", "साध्य", "शुभ", "शुक्ल", "ब्रह्म", "इन्द्र", "वैधृति"];
const KARANA = ["Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna"];
const KARANA_NE = ["बव", "बालव", "कौलव", "तैतिल", "गर", "वणिज", "विष्टि", "शकुनि", "चतुष्पाद", "नाग", "किमस्तुघ्न"];
const VAARA_NE = ["आइतवार", "सोमवार", "मङ्गलवार", "बुधवार", "बिहिवार", "शुक्रवार", "शनिवार"];
const VAARA_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];
const RASHI_NE = ["मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"];
const BS_MONTH = ["Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const BS_MONTH_NE = ["बैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "आश्विन", "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र"];

const LIMITS = {
  signed_year_min: -3891138, signed_year_max: 17053, ephemeris_signed_min: -3891137, ephemeris_signed_max: 17052,
  ad_year_min: 1, ad_year_max: 16995, bc_year_min: 1, bc_year_max: 3891194, bbs_url_year_max: 3891137,
  festival_stack_min_year: 60,
};

/** The BS years the bundled sky answers for (a lunar year is read on either side of each). */
export const MONTH_BS_YEARS: [number, number] = [1951, 2149];

export interface MonthPlace {
  latitude: number;
  longitude: number;
  timeZone: string;
  /** The `location` object the server prints (the city as resolved); built here from the place when absent. */
  location?: Record<string, unknown>;
}

export interface SkyMonthInput {
  bsYear: number;
  bsMonth: number;
  place: MonthPlace;
  excludeInternational?: boolean;
  /** `language=` of the request; the BS rows are the same in either. */
  language?: string;
}

export interface SkyMonthSkies {
  /** The reader's system (and ayanamsha): lunar rules, angas, rise and set. */
  sky: Sky;
  /** Surya, for the BS civil grid and the solar rules. */
  surya: Sky;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** HH:MM on the zone's clock, seconds truncated (as the server prints). */
function hm(jd: number, offsetMinutes: number): string {
  const minutes = Math.floor((jd + 0.5) * 1440 + offsetMinutes + 1e-9);
  const inDay = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`;
}

/** The ISO instant with offset, seconds truncated (`2026-11-17T12:38:59+05:45`). */
export function isoLocal(jd: number, offsetMinutes: number): string {
  const totalSeconds = Math.floor((jd + 0.5) * 86400 + offsetMinutes * 60 + 1e-6);
  const dayNumber = Math.floor(totalSeconds / 86400);
  const rem = totalSeconds - dayNumber * 86400;
  const c = civilFromJdn(dayNumber); // (jd + 0.5) counts days from the Julian Day epoch: the integer part is the civil JDN
  const sign = offsetMinutes < 0 ? "-" : "+";
  const ao = Math.abs(offsetMinutes);
  return `${c.year}-${pad(c.month)}-${pad(c.day)}T${pad(Math.floor(rem / 3600))}:${pad(Math.floor((rem % 3600) / 60))}:${pad(rem % 60)}${sign}${pad(Math.floor(ao / 60))}:${pad(ao % 60)}`;
}

function karanaName(number: number): number {
  const i = number - 1;
  if (i === 0) return 10;
  if (i >= 57) return 7 + (i - 57);
  return (i - 1) % 7;
}

function festivalNames(list: FestivalEntry[], excludeInternational: boolean): string[] {
  const names: string[] = [];
  for (const f of list) {
    if (excludeInternational && f.category === "international") continue;
    const pick = [f.name_ne, f.name_en].find((v) => typeof v === "string" && v !== "");
    if (typeof pick === "string") names.push(pick);
  }
  return names;
}

/** The month grid, or null when the sky cannot answer for it. */
export function skyMonth(skies: SkyMonthSkies, input: SkyMonthInput): Record<string, unknown> | null {
  const { bsYear, bsMonth: month, place } = input;
  if (!(month >= 1 && month <= 12) || bsYear < MONTH_BS_YEARS[0] || bsYear > MONTH_BS_YEARS[1]) return null;
  const range = bsMonth(bsYear, month);
  if (!range) return null;
  const observer: PatroObserver = { sky: skies.sky, latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone };
  setReferenceOffsetDate(Date.now());
  const festivals = generateBsFestivals({ observer, surya: skies.surya }, bsYear);
  const rows: Record<string, unknown>[] = [];
  let midLunar: { name: string; full: string; adhik: boolean } | null = null;
  const lunar = [-1, 0, 1].map((d) => observedYear(observer, civilFromJdn(range.first).year + d));
  for (let offset = 0; offset < range.length; offset += 1) {
    const jdn = range.first + offset;
    const c = civilFromJdn(jdn);
    const off = utcOffsetMinutes(place.timeZone, jdn - 0.5 + 0.5);
    const day = skyDay(skies.sky, { year: c.year, month: c.month, day: c.day, latitude: place.latitude, longitude: place.longitude, utcOffsetMinutes: off });
    if (!day || day.sunriseJd === null || day.sunsetJd === null) return null;
    const weekday = (jdn + 1) % 7;
    const rise = day.sunriseJd;
    const set = day.sunsetJd;
    const n = civilFromJdn(jdn + 1);
    const nextRise = skyDay(skies.sky, { year: n.year, month: n.month, day: n.day, latitude: place.latitude, longitude: place.longitude, utcOffsetMinutes: off })?.sunriseJd ?? null;
    const moon = moonRiseSet(skies.sky.source, rise, place.latitude, place.longitude);
    const moonrise = moon.rise !== null && (nextRise === null || moon.rise < nextRise) ? moon.rise : null;
    const moonset = moon.set !== null && (nextRise === null || moon.set < nextRise) ? moon.set : null;
    const tithiIndex = day.tithi.withinPaksha;
    const krishna = day.tithi.paksha === "krishna";
    const tithiName = tithiIndex === 15 ? (krishna ? "Aausi" : "Purnima") : TITHI[tithiIndex - 1];
    const tithiNe = tithiIndex === 15 ? (krishna ? "औंसी" : "पूर्णिमा") : TITHI_NE[tithiIndex - 1];
    const tropicalSun = (skies.sky.positionsAt(rise)?.longitude[0] ?? 0) + (skies.sky.positionsAt(rise)?.ayanamsha ?? 0);
    const sunDeg = ((tropicalSun % 360) + 360) % 360;
    const uttara = !(sunDeg >= 90 && sunDeg < 270);
    const k = karanaName(day.karana.number);
    const row: Record<string, unknown> = {
      day: offset + 1,
      date_ad: isoFromJdn(jdn),
      weekday: VAARA_NE[weekday],
      weekday_en: VAARA_EN[weekday],
      weekday_ne: VAARA_NE[weekday],
      tithi: tithiName,
      tithi_ne: tithiNe,
      paksha: krishna ? "krishna" : "shukla",
      paksha_ne: krishna ? "कृष्ण पक्ष" : "शुक्ल पक्ष",
      nakshatra: NAKSHATRA[day.nakshatra.number - 1],
      nakshatra_ne: NAKSHATRA_NE[day.nakshatra.number - 1],
      yoga: YOGA[day.yoga.number - 1],
      yoga_ne: YOGA_NE[day.yoga.number - 1],
      karana: KARANA[k],
      karana_ne: KARANA_NE[k],
      chandra_rashi: RASHI[day.moonRashi - 1],
      chandra_rashi_ne: RASHI_NE[day.moonRashi - 1],
      sunrise: hm(rise, off),
      sunset: hm(set, off),
      aayan: uttara ? "Uttarayana" : "Dakshinayana",
      aayan_ne: uttara ? "उत्तरायण" : "दक्षिणायण",
      ayana_mark: uttara ? "उ" : "द",
      moonrise: moonrise === null ? null : hm(moonrise, off),
      moonrise_local: moonrise === null ? null : isoLocal(moonrise, off),
      moonset: moonset === null ? null : hm(moonset, off),
      moonset_local: moonset === null ? null : isoLocal(moonset, off),
      festivals: festivalNames(festivalsForDay(festivals, isoFromJdn(jdn)), input.excludeInternational === true),
    };
    if (weekday !== 3) {
      const unit = (set - rise) / 15;
      row.abhijit = { start_time: hm(rise + 7 * unit, off), end_time: hm(rise + 8 * unit, off), solar_noon: hm(rise + (set - rise) / 2, off) };
    }
    rows.push(row);
    if (offset + 1 === Math.min(range.length, 15)) {
      for (const y of lunar) {
        const i = y.days.findIndex((d) => d.first <= jdn && jdn <= d.last);
        if (i >= 0) {
          const m = y.year.months[i];
          midLunar = { name: m.name, full: m.isAdhik ? `Adhik ${m.name}` : m.name, adhik: m.isAdhik };
          break;
        }
      }
    }
  }
  const start = civilFromJdn(range.first);
  return {
    year_bs: bsYear,
    month_bs: month,
    month_name: BS_MONTH[month - 1],
    month_name_ne: BS_MONTH_NE[month - 1],
    month_start_ad: `${start.year}-${pad(start.month)}-${pad(start.day)}`,
    month_length: range.length,
    lunar_month: midLunar?.name ?? null,
    lunar_month_full: midLunar?.full ?? null,
    lunar_month_is_adhik: midLunar?.adhik ?? false,
    lunar_month_type: midLunar ? (midLunar.adhik ? "adhik" : "nija") : null,
    location: place.location ?? { lat: place.latitude, lon: place.longitude, timezone: place.timeZone, name: "observer" },
    calendar: rows,
    grid_mode: "full_panchanga",
    first_weekday: range.first % 7, // Monday = 0 (the server: JDN mod 7)
    limits: LIMITS,
    era: "bs",
    language: input.language === "en" || input.language === "ne" ? input.language : "ne",
  };
}
