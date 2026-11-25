// The festivals of one day for the day route (`patro::day::festival_rows`): the slim rows with their details,
// the full rows for `detail`, and `festival_saits` (festival and ceremony windows).
import { isoFromJdn } from "../astronomy/lunar-month";
import type { Sky } from "../astronomy/sky";
import type { Json, Place } from "../panchanga/engine/blocks";
import { ceremonyWindows } from "./ceremony-windows";
import { attachFestivalDetails } from "./festival-details";
import { festivalObserver, festivalsForDay, generateFestivals } from "./festival-engine";
import { ceremonySaits, festivalSaits } from "./festival-saits";

// A year's festivals are the same for every day of it at a place: the year views ask for all 366, so the list is kept.
const YEAR_LISTS = new Map<string, ReturnType<typeof generateFestivals>>();
function yearFestivals(sky: Sky, surya: Sky, place: Place, year: number, observer: ReturnType<typeof festivalObserver>) {
  const key = `${sky.system}|${place.latitude}|${place.longitude}|${place.timeZone}|${year}`;
  let list = YEAR_LISTS.get(key);
  if (!list) {
    list = generateFestivals({ observer, surya }, year);
    if (YEAR_LISTS.size >= 6) YEAR_LISTS.delete(YEAR_LISTS.keys().next().value as string);
    YEAR_LISTS.set(key, list);
  }
  return list;
}

export function dayFestivals(sky: Sky, surya: Sky, jdn: number, year: number, place: Place, withSaits: boolean): { slim: Json[]; detail: Json[]; saits: Json[] | null } {
  const observer = festivalObserver({ sky, latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone });
  const all = yearFestivals(sky, surya, place, year, observer);
  const detail = festivalsForDay(all, isoFromJdn(jdn)) as unknown as Json[];
  const slim = detail.map((f): Json => ({ id: f.id ?? null, name: f.name_en ?? f.name ?? null, name_ne: f.name_ne ?? null, type: f.type ?? null, category: f.category ?? null }));
  if (!withSaits) return { slim, detail, saits: null };
  attachFestivalDetails(slim);
  const ids = slim.map((f) => f.id).filter((id): id is string => typeof id === "string");
  const saits = [...festivalSaits(sky, jdn, ids, place), ...ceremonySaits(sky, jdn, place, ceremonyWindows(sky, jdn, place))];
  return { slim, detail, saits };
}
