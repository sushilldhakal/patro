import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cityKeys, fetchNearestCity, searchCities, type City } from "@/lib/api";
import {
  NEPAL_NEAREST_MAX_KM,
  nearestNepalCity,
  nepalCityToCity,
  searchNepalCities,
} from "@/lib/cities/nepal-cities";
import { useLocale } from "@/i18n/locale";
import { cityToLocation, type PanchangaLocation } from "./use-panchanga-location";

/**
 * City lookup shared by the two places a location can be picked: the popup
 * selector in the desktop header and the panel inside the mobile date sheet.
 * Keeping the debounce, the Nepal-first merge and the geolocation fallback in
 * one place stops the two from drifting apart.
 */
export function useCitySearch({
  onLocationChange,
  enabled = true,
}: {
  onLocationChange: (location: PanchangaLocation) => void;
  /** Skip the network while the surface is closed. */
  enabled?: boolean;
}) {
  const { lang } = useLocale();
  const { t } = useTranslation();
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

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError(t("location.geolocation_unavailable"));
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // Always resolve to a named city — never raw coordinates. Inside Nepal
        // snap to the nearest district HQ (curated, works offline); elsewhere
        // ask the backend for the nearest GeoNames city, which has no distance
        // limit, so even a city 200 km away is used instead of bare lat/lon.
        const nearest = nearestNepalCity(lat, lon);
        try {
          if (nearest.distanceKm <= NEPAL_NEAREST_MAX_KM) {
            onLocationChange(cityToLocation(nepalCityToCity(nearest.city, lang)));
          } else {
            const { city } = await fetchNearestCity(lat, lon);
            onLocationChange(cityToLocation(city));
          }
        } catch {
          // Backend unreachable (offline): still snap to a named city — the
          // nearest district HQ — rather than falling back to raw coordinates.
          onLocationChange(cityToLocation(nepalCityToCity(nearest.city, lang)));
        }
        reset();
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(t("location.permission_denied"));
        } else if (err.code === err.TIMEOUT) {
          setGeoError(t("location.timed_out"));
        } else {
          setGeoError(t("location.not_found"));
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
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
    geoLoading,
    geoError,
    pickCity,
    useCurrentLocation,
    reset,
  };
}
