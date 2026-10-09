import { useCallback, useEffect, useState } from "react";
import { localizeNepalCityLabel } from "@/lib/cities/nepal-cities";
import * as SecureStore from "expo-secure-store";
import { searchCities, type LocationParams } from "@/lib/api";
import { NEPAL_CITIES, nepalCityEnglishLabel } from "@/lib/cities/nepal-cities";
import { KATHMANDU } from "@/lib/sky3d/horizon";

const STORAGE_KEY = "vedicPatroLocation";

export interface PanchangaLocation {
  label: string;
  params: LocationParams;
}

const DEFAULT_CITY_ID = 1283240;

export const DEFAULT_PANCHANGA_LOCATION: PanchangaLocation = {
  label: "Kathmandu, NP",
  /* Coordinates ride along with the city_id: client-side geometry (the 3D sky's
     observer frame and its "you are here" pin) has no way to turn an id into a
     place, and without them it silently falls back to a fixed point. */
  params: {
    city_id: DEFAULT_CITY_ID,
    lat: KATHMANDU.lat,
    lon: KATHMANDU.lon,
    timezone: "Asia/Kathmandu",
  },
};

export function resolveLocationTimezone(location: PanchangaLocation): string {
  return location.params.timezone ?? "Asia/Kathmandu";
}

function hasDevanagari(value: string): boolean {
  return /[\u0900-\u097F]/.test(value);
}

/** True once the location can drive client-side geometry, not just an API call. */
export function hasCoords(loc: PanchangaLocation): boolean {
  return loc.params.lat != null && loc.params.lon != null;
}

function healStoredLocation(loc: PanchangaLocation): PanchangaLocation {
  const { params } = loc;

  /* Entries written before cityToLocation started attaching coordinates hold a
     bare city_id. The default one we can fill in from here; anything else needs
     the lookup in backfillCoords below. */
  if (!hasCoords(loc) && params.city_id === DEFAULT_CITY_ID) {
    return { ...loc, params: { ...params, lat: KATHMANDU.lat, lon: KATHMANDU.lon } };
  }

  if (!params.city || !hasDevanagari(params.city)) return loc;

  if (params.lat != null && params.lon != null) {
    return {
      ...loc,
      params: {
        lat: params.lat,
        lon: params.lon,
        timezone: params.timezone ?? "Asia/Kathmandu",
      },
    };
  }

  const needle = params.city.trim();
  const match = NEPAL_CITIES.find(
    (c) =>
      c.name_ne === needle ||
      c.name_ne.startsWith(needle) ||
      needle.startsWith(c.name_ne.split(" ")[0]!),
  );
  if (!match) return loc;

  return {
    label: `${nepalCityEnglishLabel(match)}, NP`,
    params: {
      lat: match.lat,
      lon: match.lon,
      timezone: "Asia/Kathmandu",
    },
  };
}

/**
 * Last resort for a stored city_id with no coordinates: there is no look-up-by-id
 * endpoint, but the label still carries the city's name, so search for it and take
 * the coordinates off the row whose id matches. Failure just leaves the location
 * as-is — the API side of it works either way.
 */
async function backfillCoords(loc: PanchangaLocation): Promise<PanchangaLocation> {
  const id = loc.params.city_id;
  if (hasCoords(loc) || id == null) return loc;

  const name = loc.label.split(",")[0]?.trim();
  if (!name || name.length < 2) return loc;

  try {
    const { cities } = await searchCities(name, 15);
    const match = cities.find((c) => c.id === id);
    if (!match) return loc;
    return {
      ...loc,
      params: {
        ...loc.params,
        lat: match.lat,
        lon: match.lon,
        timezone: loc.params.timezone ?? match.timezone,
      },
    };
  } catch {
    return loc;
  }
}

/**
 * Reads the saved place from SecureStore only — no network. A stored city id with
 * no coordinates is repaired afterwards by `backfillCoords`; waiting for that
 * lookup here left the Panchanga screen on a spinner whenever the connection was
 * slow or down.
 */
export async function readStoredLocation(): Promise<PanchangaLocation> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_PANCHANGA_LOCATION;
    const parsed = JSON.parse(raw) as PanchangaLocation;
    if (!parsed?.label || !parsed?.params) return DEFAULT_PANCHANGA_LOCATION;
    const healed = healStoredLocation(parsed);
    if (JSON.stringify(healed) !== raw) {
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(healed)).catch(() => {});
    }
    return healed;
  } catch {
    return DEFAULT_PANCHANGA_LOCATION;
  }
}

const BACKFILL_TIMEOUT_MS = 4000;

export function usePanchangaLocation(initial?: PanchangaLocation) {
  const [location, setLocationState] = useState<PanchangaLocation>(
    initial ?? DEFAULT_PANCHANGA_LOCATION,
  );
  const [ready, setReady] = useState(Boolean(initial));

  useEffect(() => {
    if (initial) return;
    let active = true;
    readStoredLocation().then((stored) => {
      if (!active) return;
      setLocationState(stored);
      setReady(true);
      // Repair missing coordinates in the background, with a deadline.
      if (stored.params.city_id != null && !hasCoords(stored)) {
        void Promise.race([
          backfillCoords(stored),
          new Promise<PanchangaLocation>((resolve) => setTimeout(() => resolve(stored), BACKFILL_TIMEOUT_MS)),
        ]).then((healed) => {
          if (!active || healed === stored) return;
          setLocationState((cur) => (cur.label === stored.label ? healed : cur));
          SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(healed)).catch(() => {});
        });
      }
    });
    return () => {
      active = false;
    };
  }, [initial]);

  const setLocation = useCallback((next: PanchangaLocation) => {
    setLocationState(next);
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return { location, setLocation, ready };
}

export function cityToLocation(city: {
  id: number;
  ascii_name: string;
  name: string;
  country: string;
  timezone?: string;
  lat?: number;
  lon?: number;
  local?: boolean;
}): PanchangaLocation {
  const displayName = city.name || city.ascii_name;
  const label = `${displayName}, ${city.country}`;
  if (city.local && city.lat != null && city.lon != null) {
    return {
      label,
      params: {
        lat: city.lat,
        lon: city.lon,
        timezone: city.timezone ?? "Asia/Kathmandu",
      },
    };
  }
  return {
    label,
    params: {
      city_id: city.id,
      // Both, not just city_id: the id is the backend's own for this city (not
      // the curated NEPAL_CITIES namespace above, which isn't valid here), so
      // its coordinates are consistent with it — and client-side geometry that
      // needs real lat/lon (the 3D sky's observer marker) has nowhere else to
      // get them, since there's no "look up a city by id" endpoint to call
      // later from just a city_id.
      ...(city.lat != null && city.lon != null ? { lat: city.lat, lon: city.lon } : {}),
      ...(city.timezone ? { timezone: city.timezone } : {}),
    },
  };
}

const GENERIC_API_LOCATION_NAMES = new Set(["custom"]);

export function displayLocationLabel(
  location: PanchangaLocation | null | undefined,
  apiName?: string | null,
  lang = "ne",
): string {
  const name = apiName?.trim();
  const lat = location?.params.lat;
  const lon = location?.params.lon;
  if (name && !GENERIC_API_LOCATION_NAMES.has(name.toLowerCase())) {
    return localizeNepalCityLabel(name, lang, lat, lon).split(",")[0]!.trim();
  }
  const label = location?.label || DEFAULT_PANCHANGA_LOCATION.label;
  /* A curated Nepal city is shown in the reader's language (काठमाडौँ / Kathmandu),
     as on web; anything else keeps its own name. */
  return localizeNepalCityLabel(label, lang, lat, lon).split(",")[0]!.trim();
}
