import { useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { searchCities } from "@/lib/api";
import {
  DEFAULT_PANCHANGA_LOCATION as BASE_DEFAULT_LOCATION,
  displayLocationLabel as displayFullLocationLabel,
  hasCoords,
  healStoredLocation as healSharedLocation,
  type PanchangaLocation,
} from "@vedic-patro/domain/panchanga-location";
import { KATHMANDU } from "@vedic-patro/domain/sky3d/horizon";

export {
  cityToLocation,
  coordsToLocation,
  hasCoords,
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@vedic-patro/domain/panchanga-location";

const STORAGE_KEY = "vedicPatroLocation";

const DEFAULT_CITY_ID = 1283240;

/* Coordinates ride along with the city_id: client-side geometry (the 3D sky's
   observer frame and its "you are here" pin) has no way to turn an id into a
   place, and without them it silently falls back to a fixed point. */
export const DEFAULT_PANCHANGA_LOCATION: PanchangaLocation = {
  ...BASE_DEFAULT_LOCATION,
  params: {
    ...BASE_DEFAULT_LOCATION.params,
    lat: KATHMANDU.lat,
    lon: KATHMANDU.lon,
    timezone: "Asia/Kathmandu",
  },
};

/**
 * The shared repair of old stored places, plus the app's own: entries written
 * before places carried coordinates hold a bare default city_id, which can be
 * filled in from here (anything else needs `backfillCoords` below).
 */
function healStoredLocation(loc: PanchangaLocation): PanchangaLocation {
  if (!hasCoords(loc) && loc.params.city_id === DEFAULT_CITY_ID) {
    return { ...loc, params: { ...loc.params, lat: KATHMANDU.lat, lon: KATHMANDU.lon } };
  }
  return healSharedLocation(loc);
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

/** Short place name (city only) for the app's compact headers. */
export function displayLocationLabel(
  location: PanchangaLocation | null | undefined,
  apiName?: string | null,
  lang = "ne",
): string {
  return displayFullLocationLabel(location ?? DEFAULT_PANCHANGA_LOCATION, apiName, lang)
    .split(",")[0]!
    .trim();
}
