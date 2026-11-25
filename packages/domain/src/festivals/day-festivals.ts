// The festivals of one day for the day route (`patro::day::festival_rows`): the slim rows with their details,
// the full rows for `detail`, and `festival_saits` (festival and ceremony windows).
import { isoFromJdn } from "../astronomy/lunar-month";
import type { Sky } from "../astronomy/sky";
import type { Json, Place } from "../panchanga/engine/blocks";
import { ceremonyWindows } from "./ceremony-windows";
import { attachFestivalDetails } from "./festival-details";
import { festivalObserver, festivalsForDay, generateFestivals } from "./festival-engine";
import { ceremonySaits, festivalSaits } from "./festival-saits";

export function dayFestivals(sky: Sky, surya: Sky, jdn: number, year: number, place: Place, withSaits: boolean): { slim: Json[]; detail: Json[]; saits: Json[] | null } {
  const observer = festivalObserver({ sky, latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone });
  const all = generateFestivals({ observer, surya }, year);
  const detail = festivalsForDay(all, isoFromJdn(jdn)) as unknown as Json[];
  const slim = detail.map((f): Json => ({ id: f.id ?? null, name: f.name_en ?? f.name ?? null, name_ne: f.name_ne ?? null, type: f.type ?? null, category: f.category ?? null }));
  if (!withSaits) return { slim, detail, saits: null };
  attachFestivalDetails(slim);
  const ids = slim.map((f) => f.id).filter((id): id is string => typeof id === "string");
  const saits = [...festivalSaits(sky, jdn, ids, place), ...ceremonySaits(sky, jdn, place, ceremonyWindows(sky, jdn, place))];
  return { slim, detail, saits };
}
