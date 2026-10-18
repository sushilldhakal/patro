/**
 * The location picker, shared by the website's and the app's
 * `components/panchanga/LocationSelector.tsx` (and the website's inline
 * `LocationSearchPanel.tsx`): the debounced city search with the Nepal-first
 * merge, each result's labels, "use my location" (the app passes how to read
 * the device position; the nearest named city is always used, never raw
 * coordinates), the trigger labels, the open state, and copy.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cityKeys, fetchNearestCity, searchCities, type City } from "@vedic-patro/api-client";
import {
  NEPAL_NEAREST_MAX_KM,
  nearestNepalCity,
  nepalCityToCity,
  searchNepalCities,
} from "@vedic-patro/read-models/cities/nepal-cities";
import { cityToLocation, displayLocationLabel, type PanchangaLocation } from "@vedic-patro/read-models/panchanga-location";
import { useLocale } from "@vedic-patro/i18n/react";

export function cityLabel(city: City): string {
  return city.name || city.ascii_name;
}

// Resolve a 2-letter ISO country code to a readable, localized name
// ("NP" → "Nepal") via Intl. Cached per locale; falls back to the raw code
// if the runtime lacks the region data.
const countryNameCache = new Map<string, Intl.DisplayNames | null>();

export function countryName(code: string | undefined | null, lang: string): string {
  if (!code) return "";
  const locale = lang === "ne" ? "ne" : "en";
  if (!countryNameCache.has(locale)) {
    try {
      countryNameCache.set(locale, new Intl.DisplayNames([locale], { type: "region" }));
    } catch {
      countryNameCache.set(locale, null);
    }
  }
  const dn = countryNameCache.get(locale);
  const upper = code.toUpperCase();
  try {
    return dn?.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

/** "Pokhara, Gandaki, Nepal" — the full line shown under a search result. */
export function cityItemLabel(city: City, lang: string): string {
  const region = city.admin1_name ?? city.admin1;
  const country = countryName(city.country, lang);
  if (region) return `${cityLabel(city)}, ${region}, ${country}`;
  return `${cityLabel(city)}, ${country}`;
}

/** Why the device position could not be read; anything else reads as "not found". */
export type GeoLocateErrorCode = "unavailable" | "denied" | "timeout";

export class GeoLocateError extends Error {
  code: GeoLocateErrorCode;
  constructor(code: GeoLocateErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Reads the device position; rejects with a `GeoLocateError` when it can. */
export type LocateDevice = () => Promise<{ lat: number; lon: number }>;

const GEO_ERROR: Record<GeoLocateErrorCode, string> = {
  unavailable: "location.geolocation_unavailable",
  denied: "location.permission_denied",
  timeout: "location.timed_out",
};

export function useCitySearch({
  onLocationChange,
  locate,
  enabled = true,
}: {
  onLocationChange: (location: PanchangaLocation) => void;
  locate: LocateDevice;
  /** Skip the network while the surface is closed. */
  enabled?: boolean;
}) {
  const { t, lang } = useLocale();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: cityKeys.search(debouncedQuery),
    queryFn: () => searchCities(debouncedQuery, 15),
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 60_000,
  });

  // Nepal comes from the curated local list; other countries from the backend
  // (its vague NP entries are dropped so Nepal is shown only once, cleanly).
  const results = useMemo<City[]>(() => {
    const nepal = searchNepalCities(debouncedQuery).map((c) => nepalCityToCity(c, lang));
    const world = (searchData?.cities ?? []).filter((c) => c.country?.toUpperCase() !== "NP");
    return [...nepal, ...world];
  }, [debouncedQuery, lang, searchData]);

  const reset = () => {
    setQuery("");
    setDebouncedQuery("");
    setGeoError(null);
  };

  const pickCity = (city: City) => {
    onLocationChange(cityToLocation(city));
    reset();
  };

  /** Resolves to true once a city was picked from the device position. */
  const useCurrentLocation = async (): Promise<boolean> => {
    setGeoLoading(true);
    setGeoError(null);
    let pos: { lat: number; lon: number };
    try {
      pos = await locate();
    } catch (e) {
      setGeoLoading(false);
      setGeoError(t(e instanceof GeoLocateError ? GEO_ERROR[e.code] : "location.not_found"));
      return false;
    }
    // Always resolve to a named city — never raw coordinates. Inside Nepal
    // snap to the nearest district HQ (curated, works offline); elsewhere ask
    // the backend for the nearest GeoNames city.
    const nearest = nearestNepalCity(pos.lat, pos.lon);
    try {
      if (nearest.distanceKm <= NEPAL_NEAREST_MAX_KM) {
        onLocationChange(cityToLocation(nepalCityToCity(nearest.city, lang)));
      } else {
        const { city } = await fetchNearestCity(pos.lat, pos.lon);
        onLocationChange(cityToLocation(city));
      }
    } catch {
      // Backend unreachable (offline): still snap to the nearest district HQ.
      onLocationChange(cityToLocation(nepalCityToCity(nearest.city, lang)));
    }
    reset();
    setGeoLoading(false);
    return true;
  };

  return {
    query,
    setQuery: (value: string) => {
      setQuery(value);
      setGeoError(null);
    },
    debouncedQuery,
    isSearching,
    results,
    /** Shown in place of the results while there are none. */
    emptyText:
      debouncedQuery.length < 2
        ? t("location.type_min_chars")
        : isSearching
          ? t("location.searching")
          : t("location.no_city_found"),
    geoLoading,
    geoError,
    pickCity,
    useCurrentLocation,
    reset,
    cityName: cityLabel,
    citySub: (city: City) => cityItemLabel(city, lang),
    copy: {
      search: t("location.search_city"),
      useMyLocation: t("location.use_my_location"),
      tab: t("location.tab"),
    },
  };
}

export function useLocationSelector({
  location,
  onLocationChange,
  locate,
}: {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  locate: LocateDevice;
}) {
  const { t, lang } = useLocale();
  const [open, setOpenState] = useState(false);
  const search = useCitySearch({ onLocationChange, locate, enabled: open });
  const label = displayLocationLabel(location, undefined, lang);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    if (!next) search.reset();
  };
  return {
    ...search,
    open,
    setOpen,
    /** Picks the city and closes the picker. */
    pickCity: (city: City) => {
      search.pickCity(city);
      setOpenState(false);
    },
    isSelected: (city: City) => location.params.city_id === city.id,
    label,
    /** City only, for compact triggers. */
    labelMain: label.split(",")[0]?.trim() ?? label,
    copy: {
      ...search.copy,
      choose: t("location.choose_location"),
      change: t("ui.common.change_location"),
      title: t("location.label"),
      cancel: t("common.cancel"),
      done: t("common.done"),
    },
  };
}
