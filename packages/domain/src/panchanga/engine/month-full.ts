// The BS month grid with `full=true`: every row carries the day's panchanga under `panchanga`.
// Follows `patro::month::embed_for` (Rust): `build_daily_state` with the detail left out and the plain
// festival rows in, the sunrise row's `lunar_calendar` and `lunar_month` kept, and, for `slim=true`,
// the heavy blocks a month view never reads dropped (`MONTH_EMBED_SLIM_DROP_KEYS`).
import type { Sky } from "../../astronomy/sky";
import type { Json } from "./blocks";
import { dayState } from "./day-response";
import { renderPartForEra } from "./era-render";

/** `MONTH_EMBED_SLIM_DROP_KEYS`. */
const SLIM_DROP = ["rashifal", "muhurta", "hora", "hora_day", "choghadiya", "tarabala_table", "chandrabala_table", "nivas_shool", "planets_anchor", "festivals"];

const truthy = (v: unknown): boolean =>
  v === null || v === undefined ? false : Array.isArray(v) ? v.length > 0 : typeof v === "object" ? Object.keys(v as object).length > 0 : Boolean(v);

export interface FullMonthOptions {
  /** `slim=true`: drop the blocks a month view does not read. */
  slim?: boolean;
  /** The request named `era=`: the embedded days are rendered for it (`date` beside each Julian Day) and `era`/`language` stay on the month. Without it neither is added. */
  era?: string;
}

/**
 * The lite month with each row's panchanga added, or null when a day cannot be made (the server answers).
 * `lite` is the grid `skyMonth` made (its `location` echo is the place every row is built for).
 */
export function fullMonth(sky: Sky, surya: Sky, lite: Record<string, unknown>, options: FullMonthOptions = {}): Record<string, unknown> | null {
  const where = lite.location as Json | undefined;
  const rows = lite.calendar as Json[] | undefined;
  if (!where || !rows) return null;
  const place = {
    latitude: where.lat as number,
    longitude: where.lon as number,
    timeZone: where.timezone as string,
    name: typeof where.name === "string" && where.name !== "" ? (where.name as string) : undefined,
    cityId: typeof where.city_id === "number" ? (where.city_id as number) : undefined,
  };
  const out: Json[] = [];
  for (const row of rows) {
    const [year, month, day] = String(row.date_ad).split("-").map(Number);
    const state = dayState(sky, { year, month, day, ...place }, { era: "bs", detail: false, plainFestivals: true, surya });
    if (!state) return null;
    const { date_bs: _a, ...rest } = state;
    void _a;
    const embed: Json = { date_bs: state.date_bs, ...rest };
    if (options.slim) {
      for (const key of SLIM_DROP) delete embed[key];
      if (truthy(embed.udaya_lagna)) delete embed.lagna_spans;
    }
    out.push({ ...row, panchanga: options.era ? renderPartForEra(embed, options.era) : embed });
  }
  const month: Json = { ...lite, calendar: out };
  if (!options.era) {
    delete month.era;
    delete month.language;
  }
  return month;
}
