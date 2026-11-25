// The civil day (midnight to midnight) timeline: `patro::civil_timeline` (`services/panchanga/civil_timeline.py`).
// A civil day overlaps two vedic days (sunrise to sunrise); this stitches the previous and current day payloads and
// re-projects every band onto minutes from local midnight (0 to 1440). No astronomy is recomputed.
import { civilFromJdn, civilJdn, utcOffsetMinutes } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import type { Json } from "./blocks";
import { buildDay, type DayInput } from "./day";
import { pyRound } from "./py";

const DAY_MIN = 1440;
type Block = Json | null | undefined;

/** `_hhmm_to_min`: "HH:MM" to minutes from that day's midnight. */
function hhmmToMin(short: unknown): number | null {
  if (typeof short !== "string" || !short) return null;
  const parts = short.trim().split(":");
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0].trim(), 10);
  const m = Number.parseInt(parts[1].trim(), 10);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
}

const shortOf = (payload: Json, key: string): unknown => (payload[key] as Json | undefined)?.local_time_short;

/** `_ghati_clock_to_ghati`: "G:P:V" to ghati. */
function ghatiClockToGhati(clock: unknown): number | null {
  if (typeof clock !== "string" || !clock) return null;
  const parts = clock.split(":");
  const gh = Number(parts[0].trim());
  const pa = parts[1] === undefined ? 0 : Number(parts[1].trim());
  return Number.isNaN(gh) || Number.isNaN(pa) ? null : gh + pa / 60;
}

/** `_clip`: clamp to [lo, hi], dropping a slice that collapses. */
function clip(start: number, end: number, lo: number, hi: number): [number, number] | null {
  const s = start >= lo ? start : lo;
  const e = end <= hi ? end : hi;
  return e - s > 0.05 ? [s, e] : null;
}

const round2 = (x: number) => pyRound(x, 2);

function projectGhatiSegments(out: Json[], segments: unknown, sunriseMin: number, dayOffset: number, lo: number, hi: number, fields: string[]): void {
  for (const seg of (Array.isArray(segments) ? segments : []) as Json[]) {
    const startG = typeof seg.start_g === "number" ? seg.start_g : 0;
    const endG = typeof seg.end_g === "number" ? seg.end_g : 0;
    const c = clip(sunriseMin + startG * 24 - dayOffset, sunriseMin + endG * 24 - dayOffset, lo, hi);
    if (!c) continue;
    const item: Json = { start_min: round2(c[0]), end_min: round2(c[1]) };
    for (const k of fields) item[k] = seg[k] ?? null;
    out.push(item);
  }
}

/** Python truthiness as the Rust port reads it: numbers, arrays and objects are always true. */
const truthy = (v: unknown): boolean => v !== null && v !== undefined && v !== false && v !== "";

type Link = [unknown, unknown, unknown, unknown];

/** `_anga_chain`: (name_ne, name, start, end) for the block and its `next` chain. */
function angaChain(block: Block): Link[] {
  if (!block || !truthy(block)) return [];
  if (!truthy(block.name) && !truthy(block.name_ne)) return [];
  const end = block.end_time;
  const chain: Link[] = [[block.name_ne, block.name, block.start_time, end]];
  const nxt = block.next as Json | undefined;
  if (nxt && truthy(nxt) && (truthy(nxt.name) || truthy(nxt.name_ne))) {
    chain.push([nxt.name_ne, nxt.name, end, nxt.end_time]);
    const third = nxt.next as Json | undefined;
    if (third && truthy(third) && (truthy(third.name) || truthy(third.name_ne))) chain.push([third.name_ne, third.name, nxt.end_time, third.end_time]);
  }
  return chain;
}

/** `_iso_to_civil_min`: minutes from the civil day's local midnight, on the zone's wall clock. */
function isoToCivilMin(iso: unknown, zone: string, midnightWallMs: number): number | null {
  if (typeof iso !== "string" || !iso) return null;
  const ms = Date.parse(iso.replace("Z", "+00:00"));
  if (Number.isNaN(ms)) return null;
  const offset = utcOffsetMinutes(zone, ms / 86_400_000 + 2_440_587.5);
  return (ms + offset * 60_000 - midnightWallMs) / 60_000;
}

/** `_row_segments`: the ordered {name_ne, name, end_min} anga sequence. */
function rowSegments(prev: Block, cur: Block, zone: string, midnightWallMs: number): Json[] {
  const intervals: [number, number, unknown, unknown][] = [];
  for (const chain of [angaChain(prev), angaChain(cur)]) {
    for (const [nameNe, name, sIso, eIso] of chain) {
      const s = isoToCivilMin(sIso, zone, midnightWallMs) ?? -1e9;
      const e = isoToCivilMin(eIso, zone, midnightWallMs) ?? 1e9;
      if (e > 0 && s < DAY_MIN) intervals.push([s, e, nameNe ?? null, name ?? null]);
    }
  }
  intervals.sort((a, b) => a[0] - b[0]);
  const result: Json[] = [];
  let t = 0;
  for (const [, e, nameNe, name] of intervals) {
    if (e <= t + 0.05) continue;
    const endMin = Math.min(e, DAY_MIN);
    const last = result[result.length - 1];
    if (last && last.name_ne === nameNe) last.end_min = round2(endMin);
    else result.push({ name_ne: nameNe, name, end_min: round2(endMin) });
    t = endMin;
    if (t >= DAY_MIN) break;
  }
  return result;
}

/** `_lagna_segments`: lagna spans projected through their ghati clocks. */
function lagnaSegments(prevSpans: unknown, curSpans: unknown, srPrev: number | null, srCur: number): Json[] {
  const out: [number, Json][] = [];
  const project = (spans: unknown, sunriseMin: number | null, offset: number, lo: number, hi: number) => {
    if (sunriseMin === null) return;
    for (const span of (Array.isArray(spans) ? spans : []) as Json[]) {
      const gs = ghatiClockToGhati(span.start_ghati_clock);
      const ge = ghatiClockToGhati(span.end_ghati_clock);
      if (gs === null || ge === null) continue;
      const c = clip(sunriseMin + gs * 24 - offset, sunriseMin + ge * 24 - offset, lo, hi);
      if (!c) continue;
      const start = round2(c[0]);
      out.push([start, { name_ne: span.name_ne ?? null, name: span.name ?? null, start_min: start, end_min: round2(c[1]) }]);
    }
  };
  project(prevSpans, srPrev, DAY_MIN, 0, srCur);
  project(curSpans, srCur, 0, srCur, DAY_MIN);
  out.sort((a, b) => a[0] - b[0]);
  return out.map((o) => o[1]);
}

const clipMarker = (m: number | null): number | null => (m !== null && m >= 0 && m <= DAY_MIN ? round2(m) : null);
const pick = (v: Json, outer: string, inner: string): unknown => (v[outer] as Json | undefined)?.[inner] ?? null;

/** `build_civil_timeline(greg, location)`; null when either day's panchanga cannot be made here. */
export function civilTimeline(sky: Sky, input: DayInput): Json | null {
  const cur = buildDay(sky, input);
  const jdn = civilJdn(input.year, input.month, input.day);
  const p = civilFromJdn(jdn - 1);
  const prev = buildDay(sky, { ...input, year: p.year, month: p.month, day: p.day });
  if (!cur || !prev) return null;
  const midnightWallMs = Date.UTC(input.year, input.month - 1, input.day);
  const sunriseCur = hhmmToMin(shortOf(cur, "sunrise")) ?? 0;
  const sunsetCur = hhmmToMin(shortOf(cur, "sunset"));
  const sunrisePrev = hhmmToMin(shortOf(prev, "sunrise"));
  const choghadiya: Json[] = [];
  const hora: Json[] = [];
  for (const [out, key, fields] of [[choghadiya, "choghadiya", ["name_ne", "bad"]], [hora, "hora", ["planet_ne", "planet_en", "bad"]]] as [Json[], string, string[]][]) {
    projectGhatiSegments(out, prev[key], sunrisePrev ?? 0, DAY_MIN, 0, sunriseCur, fields);
    projectGhatiSegments(out, cur[key], sunriseCur, 0, sunriseCur, DAY_MIN, fields);
  }
  const row = (key: string) => rowSegments(prev[key] as Block, cur[key] as Block, input.timeZone, midnightWallMs);
  const date = `${String(input.year).padStart(4, "0")}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`;
  return {
    anchor: "civil",
    date_ad: date,
    sunrise_min: round2(sunriseCur),
    sunset_min: sunsetCur === null ? null : round2(sunsetCur),
    moonrise_min: clipMarker(hhmmToMin(shortOf(cur, "moonrise"))),
    moonset_min: clipMarker(hhmmToMin(shortOf(cur, "moonset"))),
    weekday_ne: pick(cur, "vaara", "name_ne"),
    weekday_en: pick(cur, "vaara", "name_english"),
    rows: { tithi: row("tithi"), nakshatra: row("nakshatra"), yoga: row("yoga"), karana: row("karana") },
    paksha_ne: pick(cur, "paksha", "label_ne"),
    choghadiya,
    hora,
    lagna: lagnaSegments(prev.lagna_spans, cur.lagna_spans, sunrisePrev, sunriseCur),
    planets: cur.planets ?? null,
    planets_anchor: cur.planets_anchor ?? null,
  };
}
