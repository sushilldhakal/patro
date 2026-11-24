// Solar corrections: Belaantar, Deshaantar and Akshamsha (`panchanga::blocks_solar`).
import { civilFromJdn, utcOffsetMinutes } from "../../astronomy/lunar-month";
import { sunriseSunset } from "../../astronomy/siddhanta-offline";
import type { Sky } from "../../astronomy/sky";
import { drikFrame } from "../../astronomy/drik-source";
import { wholeSeconds, type Json, type Place } from "./blocks";
import { pyInt, pyRound, pyRoundInt } from "./py";
import { wallIn } from "./instant";

const GAURISHANKAR_MERIDIAN = 86.25;
const REFERENCE_LATITUDE = 27.7172;
const RAD = Math.PI / 180;

function splitMinutes(total: number): Json {
  const dhan = total >= 0;
  const abs = Math.abs(total);
  let minutes = pyInt(abs);
  let seconds = pyRoundInt((abs - minutes) * 60);
  if (seconds >= 60) {
    seconds -= 60;
    minutes += 1;
  }
  const prefix = dhan ? "+" : "-";
  const s2 = String(seconds).padStart(2, "0");
  return {
    minutes_total: pyRound(total, 6),
    minutes,
    seconds,
    sign: dhan ? "dhan" : "rin",
    sign_ne: dhan ? "धन" : "ऋण",
    apply: dhan ? "add" : "subtract",
    label_en: `${prefix}${minutes}m ${s2}s`,
    label_ne: `${prefix}${minutes} मि ${s2} से`,
  };
}

/** Apparent minus mean solar time, in days. */
function equationOfTimeDays(sky: Sky, jd: number): number {
  const p = sky.positionsAt(jd, 1, false);
  if (!p) return 0;
  const eps = (sky.system === "drik" ? drikFrame.obliquityAt(jd) : 24) * RAD;
  const lam = (p.longitude[0] + p.ayanamsha) * RAD;
  const ra = (((Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam)) / RAD) % 360) + 360) % 360;
  const mean = sky.system === "drik" ? p.meanSunSayana - 0.0057183 : p.meanSunSayana;
  const d = ((((mean - ra) % 360) + 540) % 360) - 180;
  return d / 360;
}

const nepalEra = (jdn: number): Json => {
  const c = civilFromJdn(jdn);
  const key = c.year * 10000 + c.month * 100 + c.day;
  if (key <= 19191231) return { key: "kmt", name_en: "Kathmandu Mean Time", name_ne: "काठमाडौं औसत सूर्य समय", utc_offset: "+05:41:16", utc_offset_seconds: 20476 };
  if (key <= 19851231) return { key: "ist", name_en: "Indian Standard Time", name_ne: "भारतीय मानक समय", utc_offset: "+05:30", utc_offset_seconds: 19800 };
  return { key: "npt", name_en: "Nepal Standard Time", name_ne: "नेपाल मानक समय", utc_offset: "+05:45", utc_offset_seconds: 20700 };
};

const isNepalObserver = (lat: number, lon: number) => lat >= 26.35 && lat <= 30.45 && lon >= 80.05 && lon <= 88.2;

export function solarCorrections(sky: Sky, jdn: number, place: Place, sunrise: number): Json {
  const zone = place.timeZone;
  const meridian = (utcOffsetMinutes(zone, jdn) / 60) * 15;
  const belaantar = -(equationOfTimeDays(sky, sunrise) * 24 * 60);
  const deshaantar = (place.longitude - meridian) * 4;
  const rise = (lat: number) => {
    const r = sunriseSunset(sky.source, jdn - 0.5, lat, GAURISHANKAR_MERIDIAN).sunriseJd;
    return r === null ? null : wholeSeconds(r);
  };
  const a = rise(place.latitude);
  const b = rise(REFERENCE_LATITUDE);
  const akshamsha = a !== null && b !== null ? ((a - b) * 86400) / 60 : null;
  const out: Json = {
    belaantar: { ...splitMinutes(belaantar), name_ne: "बेलान्तर", name_en: "Belaantar (equation of time)" },
    deshaantar: { ...splitMinutes(deshaantar), name_ne: "देशान्तर", name_en: "Deshaantar (longitude correction)", local_longitude: pyRound(place.longitude, 6), standard_meridian_longitude: pyRound(meridian, 6) },
    standard_meridian_longitude: meridian,
    computed_at_local: wallIn(sunrise, zone).iso,
    sunrise_includes_corrections: true,
    timezone_era: isNepalObserver(place.latitude, place.longitude) ? nepalEra(jdn) : null,
    ishtakaal_note_ne: "सूचीबद्ध सूर्योदय/अस्त स्थानको वास्तविक अक्षांश र देशान्तरबाट गणना गरिएको हो — इष्टकाल गणनामा पुनः देशान्तर वा अक्षांश थप्नु पर्दैन। बेलान्तर सन्दर्भका लागि मात्र देखाइएको हो।",
    ishtakaal_note_en: "Listed sunrise/sunset are computed from the observer's own latitude and longitude, so Deshaantar and Akshamsha are already inherent; do not apply them again for Ishtakaal. Belaantar is shown for reference only.",
  };
  if (akshamsha !== null) {
    out.akshamsha = { ...splitMinutes(akshamsha), name_ne: "अक्षांश", name_en: "Akshamsha (latitude correction)", local_latitude: pyRound(place.latitude, 6), reference_latitude: pyRound(REFERENCE_LATITUDE, 6), meridian_longitude: pyRound(GAURISHANKAR_MERIDIAN, 6) };
  }
  return out;
}
