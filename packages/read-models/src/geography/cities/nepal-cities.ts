import type { City } from "@vedic-patro/api-client";
import { NEPAL_TIMEZONE, type NepalCity, nepalCityEnglishLabel, nepalCityLabel } from "@vedic-patro/domain/geography/cities/nepal-cities";

export * from "@vedic-patro/domain/geography/cities/nepal-cities";

/**
 * Adapt a curated Nepal city to the shared `City` shape so it flows through the
 * same combobox/rendering as backend results. Marked `local` so the location is
 * built from lat/lon (not a backend city_id). Keep `ascii_name` English so API
 * resolve never receives Devanagari; `name` is locale-aware for display.
 */
export function nepalCityToCity(city: NepalCity, lang: string): City {
  const en = nepalCityEnglishLabel(city);
  return {
    id: city.id,
    name: nepalCityLabel(city, lang),
    ascii_name: en,
    lat: city.lat,
    lon: city.lon,
    country: "NP",
    population: 0,
    timezone: NEPAL_TIMEZONE,
    admin1_name: lang === "ne" ? city.zone_ne : city.zone_en,
    local: true,
  };
}
