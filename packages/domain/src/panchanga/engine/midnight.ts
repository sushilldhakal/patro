// `reference=midnight`: the moving angas of a civil day re-read at local 00:00 (`panchanga::midnight`).
// Midnight is both the reference moment and the ghati origin; the day window runs midnight to next midnight,
// and every instant prints on the observer's clock (the server hands its builders zone-aware bounds).
import type { Sky } from "../../astronomy/sky";
import { utcOffsetMinutes } from "../../astronomy/lunar-month";
import { chandrabalaTable, chandrabalam, tarabalaTable, tarabalam } from "./bala-blocks";
import { chandraRashiSpans, karanaBlock, nakshatraBlock, nakshatraPadaSpans, rashiPayload, sunMoon, tithiBlock, tithiInfo, yogaBlock, type Json, type Place } from "./blocks";
import { pakshaBlock } from "./calendar-blocks";
import { wallIn } from "./instant";
import { lagnaBlock, lagnaRows, lagnaSpans, panchakaRahita, udayaLagna } from "./lagna-blocks";

/** The UT instant of local 00:00 on a civil day (`jdn`), on the zone's clock at that moment. */
export function localMidnight(jdn: number, zone: string): number {
  const utcMidnight = jdn - 0.5;
  let guess = utcMidnight - utcOffsetMinutes(zone, utcMidnight) / 1440;
  guess = utcMidnight - utcOffsetMinutes(zone, guess) / 1440;
  return guess;
}

const ISO_UTC = /^(-?\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?)\+00:00$/;
const jdOfIso = (iso: string) => Date.parse(iso) / 86_400_000 + 2_440_587.5;

/** Prints every UTC instant in a tree on the observer's clock. */
function onClock<T>(value: T, zone: string): T {
  if (typeof value === "string") {
    return (ISO_UTC.test(value) ? wallIn(jdOfIso(value), zone).iso : value) as T;
  }
  if (Array.isArray(value)) return value.map((v) => onClock(v, zone)) as T;
  if (value && typeof value === "object") {
    const out: Json = {};
    for (const [k, v] of Object.entries(value as Json)) out[k] = onClock(v, zone);
    return out as T;
  }
  return value;
}

/** The blocks `build_panchanga_civil_day` overlays onto the daily detail, in its order. `null` when no lagna can be placed. */
export function midnightOverlay(sky: Sky, jdn: number, place: Place, lunar: Json, vaara: number): Json | null {
  const zone = place.timeZone;
  const midnight = localMidnight(jdn, zone);
  const nextMidnight = midnight + 1; // Python adds 24 absolute hours: a DST day ends an hour off its civil midnight
  const info = tithiInfo(sky, midnight);
  const tithi = tithiBlock(sky, midnight, midnight, zone, info);
  const nakshatra = nakshatraBlock(sky, midnight, midnight, zone);
  const yoga = yogaBlock(sky, midnight, midnight, zone);
  const karana = karanaBlock(sky, midnight, midnight, zone);
  const paksha = pakshaBlock(lunar, info.paksha);
  const [sunLon, moonLon] = sunMoon(sky, midnight);
  const chandraRashi = rashiPayload(moonLon);
  const suryaRashi = rashiPayload(sunLon);
  const lagna = lagnaBlock(sky, midnight, place.latitude, place.longitude);
  const spans = lagnaSpans(sky, midnight, nextMidnight, place);
  if (!spans) return null;
  const rashiSpans = chandraRashiSpans(sky, midnight, nextMidnight, zone);
  const padaSpans = nakshatraPadaSpans(sky, midnight, nextMidnight, zone);
  const overlay: Json = {
    tithi,
    nakshatra,
    yoga,
    karana,
    paksha,
    chandra_rashi: chandraRashi,
    surya_rashi: suryaRashi,
    chandra_rashi_spans: rashiSpans,
    nakshatra_pada_spans: padaSpans,
    lagna,
    lagna_spans: lagnaRows(spans),
    udaya_lagna: udayaLagna(spans),
    tarabalam: tarabalam(nakshatra),
    chandrabalam: chandrabalam(rashiSpans),
    tarabala_table: tarabalaTable(nakshatra),
    chandrabala_table: chandrabalaTable(chandraRashi),
    panchaka_rahita: panchakaRahita(sky, midnight, spans, vaara, zone),
  };
  return onClock(overlay, zone);
}
