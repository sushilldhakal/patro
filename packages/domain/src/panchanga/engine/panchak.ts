// पञ्चक: the Moon's transit from Dhanishta pada 3 through Revati (`jyotish::panchak`,
// `engine/jyotish/panchak_calendar.py`), and the year routes' shared front half (`handlers::graha`).
import { bsDateOf, bsMonth, civilFromJdn, civilJdn } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import { nepaliDigits, sunMoon, type Json } from "./blocks";
import { locationBlock, type DayInput } from "./day";
import { eraLanguage, renderForEra } from "./era-render";
import { wallIn } from "./instant";
import { pyInt, pyMod } from "./py";

/** The Moon's pada (0-107) at an instant. */
const padaFlat = (sky: Sky, jd: number): number => Math.floor(sunMoon(sky, jd)[1] / (360 / 108)) % 108;
/** Dhanishta (22) pada 3: Panchak begins; Ashwini pada 1: it ends. */
const START_FLAT = 22 * 4 + 2;
const END_FLAT = 0;
const DAY = 86_400;

type Place = Omit<DayInput, "year" | "month" | "day">;

/** `_moment_stamp`. */
function stamp(jd: number, zone: string): Json {
  const w = wallIn(jd, zone);
  const day = civilFromJdn(w.jdn);
  const hour = Number(w.hm.slice(0, 2));
  const minute = Number(w.hm.slice(3));
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const bs = bsDateOf(w.jdn);
  const date = `${String(day.year).padStart(4, "0")}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
  return {
    iso: `${date}T${w.hms}${w.iso.slice(-6)}`,
    jd: w.jdn - 0.5,
    bs_year: bs?.year ?? null,
    bs_month: bs?.month ?? null,
    bs_day: bs?.day ?? null,
    time_short: w.hm,
    time_en: `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`,
    time_ne: `${nepaliDigits(h12)}:${nepaliDigits(String(minute).padStart(2, "0"))} ${hour >= 12 ? "अपराह्न" : "पूर्वाह्न"}`,
  };
}

/** `_format_duration`. */
function duration(start: number, end: number): [string, string] {
  const total = Math.max((end - start) * DAY, 0);
  const days = pyInt(Math.floor(total / DAY));
  const hours = pyInt(Math.floor(pyMod(total, DAY) / 3600));
  const plural = (n: number) => (n === 1 ? "" : "s");
  return [`${days} day${plural(days)} ${hours} hour${plural(hours)}`, `${nepaliDigits(days)} दिन ${nepaliDigits(hours)} घण्टा`];
}

/** `build_panchak_span(jd_start, jd_end, location)`; null before 1970 (the server answers those). */
export function panchakSpan(sky: Sky, jdStart: number, jdEnd: number, place: Place): Json | null {
  const start = Math.floor(jdStart + 0.5);
  const end = Math.floor(jdEnd + 0.5);
  if (civilFromJdn(start).year < 1970) return null;
  // The Moon's entries into the first Panchak pada and into Ashwini, from a week before the window to a week after.
  const from = start - 0.5 - 14;
  const to = end + 0.5 + 7;
  const events: { jd: number; kind: "start" | "end" }[] = [];
  let cursor = from;
  for (let guard = 0; cursor < to && guard < 3000; guard += 1) {
    const b = sky.nextBoundary("pada", cursor);
    if (!b) break;
    const flat = padaFlat(sky, b.jd + 90 / DAY);
    if (flat === START_FLAT) events.push({ jd: b.jd, kind: "start" });
    else if (flat === END_FLAT) events.push({ jd: b.jd, kind: "end" });
    cursor = b.jd + 30 / DAY;
  }
  // A window opening inside a Panchak starts from the Moon's entry before it.
  const first = events[0];
  if (first && first.kind === "end") {
    let back = from;
    for (let guard = 0; guard < 400; guard += 1) {
      const b = sky.prevBoundary("pada", back);
      if (!b) break;
      if (padaFlat(sky, b.jd + 90 / DAY) === START_FLAT) {
        events.unshift({ jd: b.jd, kind: "start" });
        break;
      }
      back = b.jd - 30 / DAY;
    }
  }
  const zone = place.timeZone;
  const periods: Json[] = [];
  for (let i = 0; i < events.length - 1; i += 1) {
    if (events[i].kind !== "start" || events[i + 1].kind !== "end") continue;
    const [s, e] = [events[i].jd, events[i + 1].jd];
    if (wallIn(s, zone).jdn > end || wallIn(e, zone).jdn < start) continue;
    const [en, ne] = duration(s, e);
    periods.push({ start: stamp(s, zone), end: stamp(e, zone), duration_en: en, duration_ne: ne });
  }
  return { range_start_jd: jdStart, range_end_jd: jdEnd, location: locationBlock({ year: 0, month: 0, day: 0, ...place }), count: periods.length, periods };
}

/** `year_span_jd(era, year)` for the eras the apps send: the first and last day (0h UT) of a BS or AD year. */
export function yearSpanJd(era: string, year: number): [number, number] | null {
  if (era === "ad") {
    if (year < 1970) return null;
    return [civilJdn(year, 1, 1) - 0.5, civilJdn(year, 12, 31) - 0.5];
  }
  if (era !== "bs") return null;
  const a = bsMonth(year, 1);
  const b = bsMonth(year, 12);
  return a && b ? [a.first - 0.5, b.first + b.length - 1 - 0.5] : null;
}

/** `stamp_year_era` and the era layer: the year, era and `gregorian_range` of a year route's payload. */
export function stampYear(payload: Json, era: string, year: number, span: [number, number], language: string | undefined): Json {
  const out = { ...payload };
  if (era === "ad") {
    out.ad_year = year;
    out.era = "ad";
  } else {
    out.bs_year = year;
    out.era = "bs";
  }
  const iso = (jd: number) => {
    const c = civilFromJdn(Math.floor(jd + 0.5));
    return `${String(c.year).padStart(4, "0")}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
  };
  out.gregorian_range = { start: iso(span[0]), end: iso(span[1]) };
  return renderForEra(out, era, language ?? eraLanguage(era));
}

/** `GET /nepal/panchak/year/{year}`. */
export function panchakYear(sky: Sky, era: string, year: number, place: Place, language?: string): Json | null {
  const span = yearSpanJd(era, year);
  const payload = span && panchakSpan(sky, span[0], span[1], place);
  return span && payload ? stampYear(payload, era, year, span, language) : null;
}
