// `GET /panchanga/at-time`: the udaya day's state with the moving angas, grahas and lagna re-read at a moment
// (`patro::at_time`, `panchanga::at_time`). The day state is the day response's (`dayState`); only the
// instant's own blocks are made here.
import { lagnaAt, wrap360, ayanamshaAt } from "../../astronomy/siddhanta-offline";
import { suryaLatitude, suryaLongitude } from "../../astronomy/surya-formulas";
import { drikLatitudeAt } from "../../astronomy/drik-analytic";
import { drikFrame } from "../../astronomy/drik-source";
import { civilFromJdn, civilJdn } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import { dayState, type DayOptions } from "./day-response";
import type { DayInput } from "./day";
import { dayTimes, karanaBlock, nakshatraBlock, tithiBlock, tithiInfo, varaAt, yogaBlock, type Json } from "./blocks";
import { lagnaBlock, planetTable } from "./lagna-blocks";
import { localInstant } from "./midnight";
import { eraLanguage, renderForEra } from "./era-render";
import { pyInt, pyMod, pyRound } from "./py";
import { utcIso, wallIn } from "./instant";

const RAD = Math.PI / 180;
/** The text's fixed obliquity of the ecliptic. */
const OBLIQUITY = 24;

/** The sky's ayanamsha at an instant: the text's own for the Surya Siddhanta, the sky's for Drik. */
const ayanamshaOf = (sky: Sky, jd: number): number => (sky.system === "drik" ? sky.positionsAt(jd, 1, false)?.ayanamsha ?? 0 : ayanamshaAt(jd));

/** (right ascension, declination), degrees, of a sayana longitude and latitude: the text's 24 degrees, or Drik's mean obliquity of date. */
function equatorial(sky: Sky, jd: number, sayana: number, latitude: number): [number, number] {
  const lam = sayana * RAD;
  const beta = latitude * RAD;
  const eps = (sky.system === "drik" ? drikFrame.obliquityAt(jd) : OBLIQUITY) * RAD;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps), Math.cos(lam));
  const dec = Math.asin(Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lam));
  return [wrap360(ra / RAD), dec / RAD];
}

const BODIES = { sun: "sun", moon: "moon", mercury: "mercury", venus: "venus", mars: "mars", jupiter: "jupiter", saturn: "saturn", rahu: "rahu" } as const;

/** `planets_with_extras`: the graha table with ecliptic latitude (shara), right ascension and declination. */
function planetsWithExtras(sky: Sky, jd: number): Json {
  const table = planetTable(sky, jd) as Record<string, Json>;
  const aya = ayanamshaOf(sky, jd);
  const drik = sky.system === "drik";
  const longitudeOf = (key: keyof typeof BODIES): number => (drik ? ((table[key].longitude as number) ?? 0) : suryaLongitude(BODIES[key], jd));
  const latitudeOf = (key: keyof typeof BODIES): number => (drik ? drikLatitudeAt(BODIES[key], jd) : suryaLatitude(BODIES[key], jd));
  for (const key of Object.keys(BODIES) as (keyof typeof BODIES)[]) {
    const row = table[key];
    const lat = latitudeOf(key);
    const [ra, dec] = equatorial(sky, jd, longitudeOf(key) + aya, lat);
    row.latitude = pyRound(lat, 4);
    row.right_ascension = pyRound(ra, 4);
    row.declination = pyRound(dec, 4);
  }
  const rahuLat = latitudeOf("rahu");
  const [ra, dec] = equatorial(sky, jd, pyMod(longitudeOf("rahu") + 180, 360) + aya, -rahuLat);
  table.ketu.latitude = pyRound(-rahuLat, 4);
  table.ketu.right_ascension = pyRound(ra, 4);
  table.ketu.declination = pyRound(dec, 4);
  return table;
}

const sayanaAscendant = (sky: Sky, jd: number, lat: number, lon: number): number | null => {
  const asc = lagnaAt(sky.source, jd, lat, lon);
  return asc === null ? null : wrap360(asc + ayanamshaOf(sky, jd));
};

/** The lagna at an instant (`anchor: instant`) with its equatorial extras and speed. */
function instantLagna(sky: Sky, jd: number, lat: number, lon: number): Json | null {
  const block = lagnaBlock(sky, jd, lat, lon);
  const sayana = sayanaAscendant(sky, jd, lat, lon);
  const step = 60 / 86400;
  const ahead = sayanaAscendant(sky, jd + step, lat, lon);
  if (!block || sayana === null || ahead === null) return null;
  const speed = (pyMod(ahead - sayana + 540, 360) - 180) / step;
  const [ra, dec] = equatorial(sky, jd, sayana, 0);
  return { ...block, anchor: "instant", latitude: 0, right_ascension: pyRound(ra, 4), declination: pyRound(dec, 4), speed: pyRound(speed, 4) };
}

// ---------------------------------------------------------------- upagrahas

const WEEKDAY_LORDS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
const KALA_VELA: [string, string, boolean][] = [
  ["gulika", "saturn", false],
  ["mandi", "saturn", true],
  ["kala", "sun", true],
  ["mrityu", "mars", true],
  ["ardha_prahara", "mercury", true],
  ["yama_ghantaka", "jupiter", true],
];
const UPAGRAHA_NAMES: Record<string, [string, string]> = {
  gulika: ["Gulika", "गुलिक"],
  mandi: ["Mandi", "माण्डि"],
  kala: ["Kala", "काल"],
  mrityu: ["Mrityu", "मृत्यु"],
  ardha_prahara: ["Ardha Prahara", "अर्धप्रहर"],
  yama_ghantaka: ["Yama Ghantaka", "यमघण्टक"],
  dhuma: ["Dhuma", "धूम"],
  vyatipata: ["Vyatipata", "व्यतीपात"],
  parivesha: ["Parivesha", "परिवेष"],
  indra_chapa: ["Indra Chapa", "इन्द्रचाप"],
  upaketu: ["Upaketu", "उपकेतु"],
};

function upagrahaEntry(key: string, longitude: number, at?: string): Json {
  const lon = pyMod(longitude, 360);
  const [name, nameNe] = UPAGRAHA_NAMES[key];
  const out: Json = { key, name, name_ne: nameNe, longitude: pyRound(lon, 6), rashi: (pyInt(lon / 30) % 12) + 1, deg_in_rashi: pyRound(pyMod(lon, 30), 6) };
  if (at) out.at_utc = at;
  return out;
}

function upagrahas(sky: Sky, instant: number, day: { sunrise: number; sunset: number; nextSunrise: number }, vaara: number, lat: number, lon: number, sunLongitude: number): Json[] {
  const isDay = day.sunrise <= instant && instant < day.sunset;
  const [start, end, firstLord] = isDay ? [day.sunrise, day.sunset, vaara % 7] : [day.sunset, day.nextSunrise, (vaara + 4) % 7];
  const portion = ((end - start) * 86400) / 8;
  const out = KALA_VELA.map(([key, lord, middle]) => {
    let index = 0;
    for (let i = 0; i < 7; i += 1) {
      if (WEEKDAY_LORDS[(firstLord + i) % 7] === lord) {
        index = i;
        break;
      }
    }
    const at = start + (portion * (index + (middle ? 0.5 : 0))) / 86400;
    return upagrahaEntry(key, lagnaAt(sky.source, at, lat, lon) ?? 0, utcIso(at));
  });
  const dhuma = pyMod(sunLongitude + 133 + 20 / 60, 360);
  const vyatipata = pyMod(360 - dhuma, 360);
  const parivesha = pyMod(vyatipata + 180, 360);
  const indraChapa = pyMod(360 - parivesha, 360);
  const upaketu = pyMod(indraChapa + 16 + 40 / 60, 360);
  out.push(upagrahaEntry("dhuma", dhuma), upagrahaEntry("vyatipata", vyatipata), upagrahaEntry("parivesha", parivesha), upagrahaEntry("indra_chapa", indraChapa), upagrahaEntry("upaketu", upaketu));
  return out;
}

const MUHURTA_KEYS = ["hora_duration_minutes", "muhurta_duration_minutes", "rahu_kalam", "yamaganda", "gulika", "abhijit"];
const jdOfIso = (iso: string) => Date.parse(iso) / 86_400_000 + 2_440_587.5;

/** `compute_muhurta_now`: each window of the day's muhurta block, flagged `active`. */
function muhurtaNow(muhurta: Json, instant: number): Json {
  const out: Json = {};
  for (const key of ["rahu_kalam", "yamaganda", "gulika", "abhijit"]) {
    const block = muhurta[key] as Json | undefined;
    if (!block || typeof block !== "object" || Object.keys(block).length === 0) {
      out[key] = null;
      continue;
    }
    const start = typeof block.start_utc === "string" ? jdOfIso(block.start_utc) : NaN;
    const end = typeof block.end_utc === "string" ? jdOfIso(block.end_utc) : NaN;
    out[key] = { ...block, active: start <= instant && instant < end };
  }
  return out;
}

export interface AtTimeOptions extends Omit<DayOptions, "era" | "festivals" | "midnight" | "civil" | "slim" | "detail" | "plainFestivals"> {
  /** `HH:MM[:SS]` on the observer's clock, on the civil day the input names. */
  clock: string;
  /** `era=`: the response is rendered for it; without one it is left as the day state (the route's default). */
  era?: string;
}

/** The at-time response (Surya Siddhanta) for a clock on a civil day, or null when this device cannot answer it. */
export function atTimeResponse(sky: Sky, input: DayInput, options: AtTimeOptions): Json | null {
  const parts = options.clock.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p.trim()))) return null;
  const [h, m, s] = [Number(parts[0]), Number(parts[1]), parts[2] === undefined ? 0 : Number(parts[2])];
  if (h > 23 || m > 59 || s > 59 || input.year < 1970) return null;
  const zone = input.timeZone;
  const jdn = civilJdn(input.year, input.month, input.day);
  const instant = localInstant(jdn, h * 3600 + m * 60 + s, zone);
  const today = dayTimes(sky, jdn, input);
  if (!today) return null;
  const beforeSunrise = instant < today.sunrise;
  const anchorJdn = beforeSunrise ? jdn - 1 : jdn;
  const times = beforeSunrise ? dayTimes(sky, anchorJdn, input) : today;
  if (!times) return null;
  const a = civilFromJdn(anchorJdn);
  const state = dayState(sky, { ...input, year: a.year, month: a.month, day: a.day }, { era: options.era ?? "ad", language: options.language, detail: true, plainFestivals: true, surya: options.surya ?? sky });
  if (!state) return null;
  const vaara = varaAt(times.sunrise, zone);
  const info = tithiInfo(sky, instant);
  const tithi = tithiBlock(sky, instant, times.sunrise, zone, info);
  const nakshatra = nakshatraBlock(sky, instant, times.sunrise, zone);
  const yoga = yogaBlock(sky, instant, times.sunrise, zone);
  const karana = karanaBlock(sky, instant, times.sunrise, zone);
  const planets = planetsWithExtras(sky, instant);
  const lagna = instantLagna(sky, instant, input.latitude, input.longitude);
  if (!lagna) return null;
  const sunLongitude = (planets.sun as Json).longitude as number;
  const kala = upagrahas(sky, instant, times, vaara, input.latitude, input.longitude, sunLongitude);

  const detail = { ...(state.detail as Json) };
  const dayMuhurta = (detail.muhurta ?? {}) as Json;
  const muhurta: Json = {};
  for (const k of MUHURTA_KEYS) if (k in dayMuhurta) muhurta[k] = dayMuhurta[k];
  const now = muhurtaNow(muhurta, instant);
  const local = wallIn(instant, zone);
  const day = local.iso.slice(0, 10);
  const anchorDate = String(state.date_ad);
  const anchorBlock = {
    type: "instant",
    local_time: local.hm,
    label_ne: "क्षणिक स्पष्टग्रह",
    label_en: "Instantaneous positions",
  };
  Object.assign(detail, { planets, planets_anchor: anchorBlock, muhurta_now: now, instant_lagna: lagna, upagrahas: kala });
  Object.assign(state, {
    mode: "ephemeris",
    anchor: "instant",
    query_instant: local.iso,
    query_instant_local: `${day} ${local.hms}`,
    panchanga_date_ad: anchorDate,
    before_sunrise_of_civil_day: day > anchorDate,
    tithi,
    nakshatra,
    yoga,
    karana,
    lagna: lagna.name,
    lagna_ne: lagna.name_ne,
    muhurta,
    planets,
    planets_anchor: anchorBlock,
    muhurta_now: now,
    detail,
  });
  return options.era ? renderForEra(state, options.era, options.language ?? eraLanguage(options.era)) : state;
}
