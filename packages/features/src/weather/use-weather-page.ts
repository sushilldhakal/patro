/**
 * Weather page logic, shared by the website (`apps/web/src/pages/Weather.tsx`) and
 * the app (`apps/mobile/app/weather.tsx`). The server snaps the place to its nearest
 * city and serves one cached forecast to everyone there; this hook shapes it and
 * holds the page's state (hourly filter, open day, today's details), so both apps
 * behave the same and only draw.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { LocateDevice } from "../panchanga/use-location-selector";
import { useQuery } from "@tanstack/react-query";
import { fetchWeatherForecast, weatherKeys } from "@vedic-patro/api-client";
import {
  displayLocationLabel,
  type PanchangaLocation,
} from "@vedic-patro/read-models/geography/panchanga-location";
import { useLiveCalendarSystem, useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";
import { spanText, useNowMs } from "../common/now-hero";
import {
  buildWeatherView,
  hourlyRows,
  WEATHER_HOURLY_FILTERS,
  type WeatherDayView,
  type WeatherHourGroup,
  type WeatherHourlyFilter,
  type WeatherHourlyRow,
  type WeatherNowView,
} from "./model";

export * from "./model";

export type WeatherPage = {
  copy: {
    title: string;
    back: string;
    changePlace: string;
    subtitle: string;
    showMoreToday: string;
    showLessToday: string;
    currentTitle: string;
    sunTitle: string;
    rainTitle: string;
    dailyTitle: string;
    showAllDays: string;
    showFewerDays: string;
    loading: string;
    loadError: string;
    updatedTitle: string;
    updated: string;
    locationTitle: string;
    locationNote: string;
    unitsNote: string;
    source: string;
    /** Caption of each hourly row. */
    rows: Record<
      WeatherHourlyRow,
      { label: string; infoTitle: string; info: string }
    >;
    /** Accessible name of a row's ⓘ button. */
    aboutRow: string;
    close: string;
  };
  /** The city the forecast is for (the server's nearest city, else the picked place). */
  placeName: string;
  /** True while the forecast is for the device's GPS position rather than the chosen place. */
  usingGps: boolean;
  status: PageStatus;
  now: WeatherNowView | null;
  todayOpen: boolean;
  toggleToday: () => void;
  filters: {
    id: WeatherHourlyFilter;
    label: string;
    active: boolean;
    select: () => void;
  }[];
  /** Rows the hourly table shows under the temperature, in order. */
  rows: readonly WeatherHourlyRow[];
  /** The next 48 hours, one group per day. */
  hourGroups: WeatherHourGroup[];
  /** Days shown now: the first `display_days`, or all 16. */
  days: WeatherDayView[];
  allDays: boolean;
  /** Null when there is nothing more to show. */
  toggleAllDays: (() => void) | null;
  openDay: string | null;
  /** The row whose ⓘ dialog is open. */
  info: { title: string; body: string } | null;
  openInfo: (row: WeatherHourlyRow) => void;
  closeInfo: () => void;
  toggleDay: (key: string) => void;
};

/** Give up on GPS after this long (a permission prompt left open, no fix indoors) and use the chosen place. */
const GPS_WAIT_MS = 12_000;

export function useWeatherPage({
  location,
  locate,
}: {
  location: PanchangaLocation;
  /** The app's "use my location": the forecast follows the device when it answers. */
  locate?: LocateDevice;
}): WeatherPage {
  const { t, lang, digits } = useLocale();

  // GPS first, once per visit; the chosen place when it is refused or slow. A place picked on
  // this page afterwards is the reader's choice, so it wins over GPS.
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsState, setGpsState] = useState<"trying" | "on" | "off">(
    locate ? "trying" : "off",
  );
  useEffect(() => {
    if (!locate) return;
    let live = true;
    const timer = setTimeout(
      () => live && setGpsState((s) => (s === "trying" ? "off" : s)),
      GPS_WAIT_MS,
    );
    locate()
      .then(({ lat, lon }) => {
        if (!live) return;
        // ~1 km: the server snaps to the nearest city anyway, and the exact position never leaves the device.
        setGps({
          lat: Math.round(lat * 100) / 100,
          lon: Math.round(lon * 100) / 100,
        });
        setGpsState((s) => (s === "trying" ? "on" : s));
      })
      .catch(() => live && setGpsState("off"))
      .finally(() => clearTimeout(timer));
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [locate]);
  const placeKey = JSON.stringify(location.params);
  const startKey = useRef(placeKey);
  useEffect(() => {
    if (placeKey !== startKey.current) setGpsState("off");
  }, [placeKey]);
  const usingGps = gpsState === "on" && gps != null;
  const params = usingGps ? gps : location.params;

  const query = useQuery({
    queryKey: weatherKeys.forecast(params),
    queryFn: () => fetchWeatherForecast(params),
    enabled: gpsState !== "trying",
    // The server refreshes every 45 minutes; asking more often only returns the same copy.
    staleTime: 1000 * 60 * 15,
  });
  const data = query.data;
  // Re-pick "now" once a minute, so the current hour rolls over on an open page.
  const era = useLiveCalendarSystem();
  const nowMs = Math.floor(useNowMs() / 60_000) * 60_000;
  const view = useMemo(
    () => buildWeatherView(data, nowMs, { t, digits, lang }, era),
    [data, nowMs, t, digits, lang, era],
  );

  const [filter, setFilter] = useState<WeatherHourlyFilter>("temp_rain");
  const [todayOpen, setTodayOpen] = useState(false);
  const [allDays, setAllDays] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [infoRow, setInfoRow] = useState<WeatherHourlyRow | null>(null);

  // "Nearby location" is the server's name for a grid cell with no city: show the picked place then.
  const serverName =
    data?.location.name === "Nearby location" ? undefined : data?.location.name;
  const placeName = usingGps
    ? displayLocationLabel(
        { label: serverName ?? "", params },
        serverName,
        lang,
      ) || t("weather.current_location")
    : displayLocationLabel(location, serverName, lang);
  const displayDays = data?.display_days ?? 7;
  const ago = data ? Math.max(60_000, nowMs - data.fetched_at * 1000) : 0;

  const rowCopy = Object.fromEntries(
    (
      ["feels", "rain_mm", "wind", "gust", "humidity", "dew", "uv"] as const
    ).map((row) => [
      row,
      {
        label: t(`weather.row.${row}`),
        infoTitle: t(`weather.info.${row}.title`),
        info: t(`weather.info.${row}.body`),
      },
    ]),
  ) as WeatherPage["copy"]["rows"];

  return {
    copy: {
      title: t("weather.title"),
      back: t("weather.back"),
      changePlace: t("weather.change_place"),
      subtitle: t("weather.subtitle"),
      showMoreToday: t("weather.show_more_today"),
      showLessToday: t("weather.show_less_today"),
      currentTitle: t("weather.current_title"),
      sunTitle: t("weather.sun_title"),
      rainTitle: t("weather.rain"),
      dailyTitle: t("weather.daily_title"),
      showAllDays: t("weather.show_all_days", {
        count: digits(view.days.length),
      }),
      showFewerDays: t("weather.show_fewer_days"),
      loading: t("common.loading"),
      loadError: t("weather.load_error"),
      updatedTitle: t("weather.updated_title"),
      updated: data
        ? t("weather.updated_ago", { time: spanText(ago, t, digits) })
        : "",
      locationTitle: t("weather.location_title"),
      locationNote: t(
        usingGps ? "weather.location_note_gps" : "weather.location_note",
        { place: placeName },
      ),
      unitsNote: t("weather.units_note"),
      source: t("weather.source"),
      rows: rowCopy,
      aboutRow: t("weather.about_row"),
      close: t("common.close"),
    },
    placeName,
    usingGps,
    status: statusOf(query),
    now: view.now,
    todayOpen,
    toggleToday: () => setTodayOpen((v) => !v),
    filters: WEATHER_HOURLY_FILTERS.map((id) => ({
      id,
      label: t(`weather.filter.${id}`),
      active: id === filter,
      select: () => setFilter(id),
    })),
    rows: hourlyRows(filter),
    hourGroups: view.hourGroups,
    days: allDays ? view.days : view.days.slice(0, displayDays),
    allDays,
    toggleAllDays:
      view.days.length > displayDays ? () => setAllDays((v) => !v) : null,
    openDay,
    toggleDay: (key) => setOpenDay((v) => (v === key ? null : key)),
    info: infoRow
      ? { title: rowCopy[infoRow].infoTitle, body: rowCopy[infoRow].info }
      : null,
    openInfo: setInfoRow,
    closeInfo: () => setInfoRow(null),
  };
}
