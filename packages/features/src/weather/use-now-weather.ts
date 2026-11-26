/**
 * The weather right now at a place, for a small badge (home's "आजको पञ्चाङ्ग" card): temperature,
 * condition and its icon (sun by day, moon by night). Shares the weather page's query, so opening
 * one warms the other.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWeatherForecast, weatherKeys, type LocationParams } from "@vedic-patro/api-client";
import { useLiveCalendarSystem, useLocale } from "@vedic-patro/i18n/react";
import { displayLocationLabel } from "@vedic-patro/read-models/geography/panchanga-location";
import { useNowMs } from "../common/now-hero";
import { buildWeatherView, type WeatherDayView, type WeatherGlyph, type WeatherHourView, type WeatherNowView } from "./model";

export type NowWeather = {
  /** The place, in the reader's language ("काठमाडौँ"). */
  place: string;
  temperature: string;
  /** "महसुस १७.५°" */
  feelsLike: string;
  label: string;
  glyph: WeatherGlyph;
};

export function useNowWeather(
  location: LocationParams | undefined,
  enabled = true,
  /** The place's own label, when the caller has one (the server's city name otherwise). */
  label?: string,
): NowWeather | null {
  const { t, lang, digits } = useLocale();
  const era = useLiveCalendarSystem();
  const nowMs = Math.floor(useNowMs() / 60_000) * 60_000;
  const { data } = useQuery({
    queryKey: weatherKeys.forecast(location),
    queryFn: () => fetchWeatherForecast(location),
    enabled,
    // Same as the weather page: the server refreshes every 20 minutes.
    staleTime: 1000 * 60 * 15,
  });
  return useMemo(() => {
    // shortcut: always °C (the weather page's unit choice lives in its own storage); read it here if asked.
    const now = data ? buildWeatherView(data, nowMs, { t, digits, lang }, era).now : null;
    if (!now || !data) return null;
    // "Nearby location" is the server's name for a grid cell with no city: fall back to the place's own name.
    const server = data.location.name === "Nearby location" ? undefined : data.location.name;
    const place = displayLocationLabel({ label: label ?? "", params: location ?? {} }, server, lang)
      .split(",")[0]!
      .trim();
    return {
      place,
      temperature: `${now.temperature} C`,
      feelsLike: now.feelsLike,
      label: now.glyph.label,
      glyph: now.glyph,
    };
  }, [data, nowMs, t, digits, lang, era, label, location]);
}

export type WeatherCard = {
  place: string;
  now: WeatherNowView;
  /** Today's high, low, rain chance and sun facts. */
  today: WeatherDayView | null;
  /** The next hours, starting with the current one. */
  hours: WeatherHourView[];
};

/** The home weather card: now, today and the next six hours, from the weather page's query. */
export function useWeatherCard(location: LocationParams | undefined, label?: string): WeatherCard | null {
  const { t, lang, digits } = useLocale();
  const era = useLiveCalendarSystem();
  const nowMs = Math.floor(useNowMs() / 60_000) * 60_000;
  const { data } = useQuery({
    queryKey: weatherKeys.forecast(location),
    queryFn: () => fetchWeatherForecast(location),
    staleTime: 1000 * 60 * 15,
  });
  return useMemo(() => {
    if (!data) return null;
    const view = buildWeatherView(data, nowMs, { t, digits, lang }, era);
    if (!view.now) return null;
    const server = data.location.name === "Nearby location" ? undefined : data.location.name;
    const place = displayLocationLabel({ label: label ?? "", params: location ?? {} }, server, lang).split(",")[0]!.trim();
    return { place, now: view.now, today: view.days[0] ?? null, hours: view.hourGroups.flatMap((g) => g.hours).slice(0, 6) };
  }, [data, nowMs, t, digits, lang, era, label, location]);
}
