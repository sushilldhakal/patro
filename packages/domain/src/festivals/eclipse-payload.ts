// `/nepal/eclipse/{solar,lunar}/year/{year}` made on the client (Surya Siddhanta only; Drik has no
// eclipse rules on the server either). Null means "ask the server".
import { bsDateOf, bsToJdn, civilFromJdn, civilJdn } from "../astronomy/lunar-month";
import { suryaEclipseSpan } from "../astronomy/surya-eclipse";
import { LOCAL_BS_YEARS, type FestivalPlace } from "./festival-payloads";

export interface EclipseQuery {
  kind: "solar" | "lunar";
  year: number;
  era: string;
  language?: string;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const iso = (jdn: number) => {
  const c = civilFromJdn(jdn);
  return `${pad(c.year, 4)}-${pad(c.month)}-${pad(c.day)}`;
};

export function eclipseYearPayload(q: EclipseQuery, place: FestivalPlace): Record<string, unknown> | null {
  if (q.kind !== "solar" && q.kind !== "lunar") return null;
  if (!Number.isInteger(q.year)) return null;
  let firstJdn: number;
  let lastJdn: number;
  if (q.era === "bs") {
    if (q.year < LOCAL_BS_YEARS[0] || q.year > LOCAL_BS_YEARS[1]) return null;
    const a = bsToJdn(q.year, 1, 1);
    const b = bsToJdn(q.year + 1, 1, 1);
    if (a === null || b === null) return null;
    firstJdn = a;
    lastJdn = b - 1;
  } else if (q.era === "ad") {
    if (q.year < 1583 || q.year > 2090) return null;
    firstJdn = civilJdn(q.year, 1, 1);
    lastJdn = civilJdn(q.year, 12, 31);
  } else return null;
  const startJd = firstJdn - 0.5;
  const endJd = lastJdn - 0.5;
  const made = suryaEclipseSpan(startJd, endJd, q.kind, place);
  if (!made) return null;
  const dateOf = (jdn: number) => {
    if (q.era === "ad") return iso(jdn);
    const b = bsDateOf(jdn);
    return b ? `${pad(b.year, 4)}-${pad(b.month)}-${pad(b.day)}` : null;
  };
  const lat = Math.round(place.latitude * 100) / 100;
  const lon = Math.round(place.longitude * 100) / 100;
  return {
    kind: q.kind,
    range_start_jd: startJd,
    range_start_jd_date: dateOf(firstJdn),
    range_end_jd: endJd,
    range_end_jd_date: dateOf(lastJdn),
    location: {
      lat,
      lon,
      timezone: place.timeZone,
      name: place.cityName ?? (place.cityId !== undefined ? "" : "Kathmandu"),
      ...(place.cityId !== undefined ? { city_id: place.cityId } : {}),
    },
    events: made.events.map((e) => ({ ...e, date_jd_date: dateOf(Math.round(e.date_jd + 0.5)) })),
    ...(q.era === "ad" ? { ad_year: q.year } : { bs_year: q.year }),
    era: q.era,
    gregorian_range: { start: iso(firstJdn), end: iso(lastJdn) },
    language: q.language === "en" || q.language === "ne" ? q.language : q.era === "bs" ? "ne" : "en",
  };
}
