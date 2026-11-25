// The day route's response (`GET /panchanga/{date}`): the day payload mapped to the shape the apps read
// (`patro::day::build_daily_state`), slimmed, and rendered for the era (`patro::era`).
import type { Sky } from "../../astronomy/sky";
import { buildDay, type DayInput } from "./day";
import { eraLanguage, renderForEra } from "./era-render";
import type { Json } from "./blocks";
import { wallIn } from "./instant";

export interface DayOptions {
  /** `detail=` (default true). */
  detail?: boolean;
  /** `slim=`. */
  slim?: boolean;
  /** The era the request names (`era=`); the response is rendered for it. */
  era: string;
  language?: string;
}

const get = (o: unknown, ...path: string[]): unknown => path.reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Json)[k] : undefined), o) ?? null;

const jdOfIso = (iso: string) => Date.parse(iso) / 86_400_000 + 2_440_587.5;
function localStamp(iso: unknown, zone: string): string | null {
  if (typeof iso !== "string") return null;
  const w = wallIn(jdOfIso(iso), zone);
  return `${w.iso.slice(0, 10)} ${w.hm}`;
}

function elementState(block: Json, zone: string): Json {
  const next = (block.next ?? null) as Json | null;
  const out: Json = {
    name: block.name ?? null,
    name_ne: block.name_ne ?? null,
    start: localStamp(block.start_time, zone),
    end: localStamp(block.end_time, zone),
    next: next?.name ?? null,
    next_ne: next?.name_ne ?? null,
    end_ghati_clock: block.end_ghati_clock ?? null,
    end_hours_clock: block.end_hours_clock ?? null,
    progress: block.progress ?? null,
  };
  if (next && typeof next.end_time === "string" && next.end_time) {
    out.next_end = localStamp(next.end_time, zone);
    out.next_end_ghati_clock = next.end_ghati_clock ?? null;
    out.next_end_hours_clock = next.end_hours_clock ?? null;
  }
  const third = next?.next as Json | undefined;
  if (third && typeof third === "object") {
    out.next_next = third.name ?? null;
    out.next_next_ne = third.name_ne ?? null;
    out.next_next_end_ghati_clock = third.end_ghati_clock ?? null;
    out.next_next_end_hours_clock = third.end_hours_clock ?? null;
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The day response, or null when the engine cannot answer (a year before 1970, no sunrise). `festivals` is not
 * part of it yet: the caller must not use this for a request with `festivals=true`.
 */
export function dayResponse(sky: Sky, input: DayInput, options: DayOptions): Json | null {
  const f = buildDay(sky, input);
  if (!f) return null;
  const zone = input.timeZone;
  const bs = f.bs_date as Json;
  const hora = (f.hora as Json[]) ?? [];
  const out: Json = {};
  out.date_bs = `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}`;
  out.date_ad = f.date_ad;
  out.jd_ut = f.jd_ut;
  out.weekday = get(f.vaara, "name_ne");
  out.weekday_en = get(f.vaara, "name_english");
  out.sun = { sunrise: get(f.sunrise, "local_time_short"), sunset: get(f.sunset, "local_time_short"), noon: get(f.muhurta, "abhijit", "solar_noon") };
  out.moon = { rise: get(f.moonrise, "local_time_short"), set: get(f.moonset, "local_time_short") };
  for (const k of ["tithi", "nakshatra", "yoga", "karana"]) out[k] = elementState(f[k] as Json, zone);
  out.paksha = get(f.paksha, "label_en");
  out.paksha_ne = get(f.paksha, "label_ne");
  out.chandra_rashi = get(f.chandra_rashi, "name");
  out.chandra_rashi_ne = get(f.chandra_rashi, "name_ne");
  out.chandra_rashi_spans = f.chandra_rashi_spans ?? [];
  out.surya_rashi = get(f.surya_rashi, "name");
  out.surya_rashi_ne = get(f.surya_rashi, "name_ne");
  out.ritu = get(f.ritu, "name");
  out.ritu_ne = get(f.ritu, "name_ne");
  out.ritu_vedic = get(f.ritu_vedic, "name");
  out.ritu_vedic_ne = get(f.ritu_vedic, "name_ne");
  out.aayan = get(f.aayan, "name");
  out.aayan_ne = get(f.aayan, "name_ne");
  out.aayan_vedic = get(f.aayan_vedic, "name");
  out.aayan_vedic_ne = get(f.aayan_vedic, "name_ne");
  out.ayana_mark = get(f.aayan, "kranti_mark");
  out.lagna = get(f.lagna, "name");
  out.lagna_ne = get(f.lagna, "name_ne");
  out.lagna_spans = f.lagna_spans ?? [];
  out.udaya_lagna = f.udaya_lagna ?? [];
  out.planets = f.planets ?? null;
  out.planets_anchor = f.planets_anchor ?? null;
  out.solar_corrections = f.solar_corrections ?? null;
  out.dinamaan = get(f.dinamaan, "label_en");
  out.muhurta = f.muhurta ?? null;
  out.nivas_shool = f.nivas_shool ?? null;
  out.location = f.location ?? null;
  out.lunar_calendar = f.lunar_calendar ?? null;
  out.lunar_month = f.lunar_month ?? null;
  out.bs_date = bs;
  out.from_cache = false;
  const detailOn = options.detail !== false;
  if (detailOn) out.detail = { ...f };
  out.hora = hora;
  out.hora_day = hora.filter((s) => s.phase === "day");
  out.choghadiya = f.choghadiya ?? [];
  out.tarabala_table = f.tarabala_table ?? null;
  out.chandrabala_table = f.chandrabala_table ?? null;
  out.rashifal = f.rashifal ?? null;
  if (options.slim) {
    delete out.rashifal;
    const detail = out.detail as Json | undefined;
    if (detail) {
      const kept: Json = {};
      const shared: string[] = [];
      for (const [key, value] of Object.entries(detail)) {
        if (key === "rashifal") continue;
        if (key !== "detail" && key in out && same(out[key], value)) shared.push(key);
        else kept[key] = value;
      }
      out.detail = kept;
      out.detail_shared = shared;
    }
  }
  out.jd_ut = f.jd_ut;
  out.date_ad = f.date_ad;
  return renderForEra(out, options.era, options.language ?? eraLanguage(options.era));
}
