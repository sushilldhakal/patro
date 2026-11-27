import { formatClock12, getClockStyle } from "@vedic-patro/domain/calendar/clock-style";
/**
 * Weather page logic, shared by the website (`apps/web/src/pages/Weather.tsx`) and
 * the app (`apps/mobile/app/weather.tsx`). The server snaps the place to its nearest
 * city and serves one cached forecast to everyone there; this hook shapes it and
 * holds the page's state (hourly filter, open day, today's details), so both apps
 * behave the same and only draw.
 */
import { useEffect, useMemo, useState } from "react";
import type { LocateDevice } from "../panchanga/use-location-selector";
import {
  HERE_ID,
  useWeatherPlaces,
  type WeatherPlace,
  type WeatherPlacesStorage,
} from "./use-weather-places";
import { useQueries, useQuery } from "@tanstack/react-query";
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
  DEFAULT_WEATHER_UNITS,
  hourlyRows,
  WEATHER_UNIT_CHOICES,
  type WeatherGlyph,
  type WeatherUnits,
  WEATHER_HOURLY_FILTERS,
  type WeatherDayView,
  type WeatherHourGroup,
  type WeatherHourlyFilter,
  type WeatherHourlyRow,
  type WeatherNowView,
} from "./model";

export * from "./model";
export * from "./use-weather-places";

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
    addPlace: string;
    placesTitle: string;
    primaryAsk: string;
    primaryAskBody: string;
    makePrimary: string;
    justAdd: string;
    primary: string;
    remove: string;
    swipeHint: string;
    editList: string;
    editPlace: string;
    placeName: string;
    save: string;
    done: string;
    moreOptions: string;
    searchPlace: string;
    units: string;
    unitsTemp: string;
    unitsWind: string;
    unitsRain: string;
    unitsDist: string;
    unitsPressure: string;
  };
  /** The reader's units (kept on the device), and the choices for each. */
  units: {
    value: WeatherUnits;
    set: (next: Partial<WeatherUnits>) => void;
    options: {
      [K in keyof WeatherUnits]: { id: WeatherUnits[K]; label: string }[];
    };
  };
  /** The city the forecast is for (the server's nearest city, else the picked place). */
  placeName: string;
  /** True while the forecast is for the device's GPS position rather than the chosen place. */
  usingGps: boolean;
  /** The pages the reader swipes through: "here" first, then the added places. */
  places: {
    pages: {
      id: string;
      name: string;
      primary: boolean;
      here: boolean;
      /** The place as the app's location (label + params), for a list that picks the app's place. */
      location: PanchangaLocation;
      /** For the places list; null until that place's forecast has loaded (only while the list is open). */
      /** This place's own forecast, drawn on its page of the pager (merge over the page: `{ ...page, ...view }`). */
      view: WeatherPlaceView;
      summary: {
        temperature: string;
        low: string;
        high: string;
        time: string;
        glyph: WeatherGlyph;
      } | null;
    }[];
    index: number;
    /** The page slides in from the right (a later place) or the left (an earlier one). */
    fromRight: boolean;
    select: (i: number) => void;
    next: () => void;
    prev: () => void;
    remove: (id: string) => void;
    makePrimary: (id: string) => void;
    rename: (id: string, label: string) => void;
    /** The "+" drawer (search a city to add). */
    addOpen: boolean;
    setAddOpen: (open: boolean) => void;
    /** A city just picked in the drawer, waiting for "make it primary?". */
    pending: { name: string } | null;
    pick: (place: PanchangaLocation) => void;
    confirm: (primary: boolean) => void;
    cancel: () => void;
    /** The list of places (change primary, remove). */
    listOpen: boolean;
    setListOpen: (open: boolean) => void;
    /** The list's edit mode: make primary, remove. */
    editing: boolean;
    setEditing: (on: boolean) => void;
  };
  status: PageStatus;
  /** Pull-to-refresh: asks the server again for this place's forecast. */
  refresh: () => Promise<unknown>;
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

/** Where the reader's units are kept (the weather page and Preferences → General share them). */
export const WEATHER_UNITS_KEY = "weather.units.v1";
const UNITS_KEY = WEATHER_UNITS_KEY;

export function parseUnits(raw: string): WeatherUnits {
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof WeatherUnits, unknown>>;
    const pick = <K extends keyof WeatherUnits>(k: K): WeatherUnits[K] =>
      (WEATHER_UNIT_CHOICES[k] as readonly unknown[]).includes(v[k])
        ? (v[k] as WeatherUnits[K])
        : DEFAULT_WEATHER_UNITS[k];
    return { temp: pick("temp"), wind: pick("wind"), rain: pick("rain"), dist: pick("dist"), pressure: pick("pressure") };
  } catch {
    return DEFAULT_WEATHER_UNITS;
  }
}

/** The place's wall clock now: "8:39 pm" in English, "२०:३९" in Nepali. */
export function placeClock(
  nowMs: number,
  utcOffsetSeconds: number,
  lang: string,
  digits: (s: string | number) => string,
): string {
  const hhmm = new Date(nowMs + utcOffsetSeconds * 1000)
    .toISOString()
    .slice(11, 16);
  const twelve = (getClockStyle() ?? (lang === "en" ? "12" : "24")) === "12";
  return digits(twelve ? formatClock12(hhmm, lang) : hhmm);
}

/** The parts of the page that belong to one place, so every pager page can draw its own. */
export type WeatherPlaceView = Pick<
  WeatherPage,
  | "placeName"
  | "usingGps"
  | "status"
  | "refresh"
  | "now"
  | "hourGroups"
  | "days"
  | "toggleAllDays"
> & { updated: string; locationNote: string };

export function useWeatherPage({
  location,
  locate,
  storage,
}: {
  location: PanchangaLocation;
  /** The app's "use my location": the first page follows the device when it answers. */
  locate?: LocateDevice;
  /** Where the added places are kept. */
  storage?: WeatherPlacesStorage;
}): WeatherPage {
  const { t, lang, digits } = useLocale();
  const places = useWeatherPlaces({ location, locate, storage });
  const [units, setUnits] = useState<WeatherUnits>(DEFAULT_WEATHER_UNITS);
  useEffect(() => {
    if (!storage) return;
    let live = true;
    void Promise.resolve(storage.read(UNITS_KEY)).then((raw) => {
      if (live && raw) setUnits(parseUnits(raw));
    });
    return () => {
      live = false;
    };
  }, [storage]);
  const setUnit = (next: Partial<WeatherUnits>) =>
    setUnits((u) => {
      const merged = { ...u, ...next };
      storage?.write(UNITS_KEY, JSON.stringify(merged));
      return merged;
    });
  const { usingGps } = places;
  const params = places.current.params;

  const query = useQuery({
    queryKey: weatherKeys.forecast(params),
    queryFn: () => fetchWeatherForecast(params),
    enabled: !places.waiting,
    // The server refreshes every 20 minutes; asking more often only returns the same copy.
    staleTime: 1000 * 60 * 15,
  });
  const data = query.data;
  // Re-pick "now" once a minute, so the current hour rolls over on an open page.
  const era = useLiveCalendarSystem();
  const nowMs = Math.floor(useNowMs() / 60_000) * 60_000;
  const view = useMemo(
    () => buildWeatherView(data, nowMs, { t, digits, lang }, era, units),
    [data, nowMs, t, digits, lang, era, units],
  );

  const [filter, setFilter] = useState<WeatherHourlyFilter>("temp_rain");
  const [todayOpen, setTodayOpen] = useState(false);
  const [allDays, setAllDays] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [infoRow, setInfoRow] = useState<WeatherHourlyRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  // Remember the last index to know which way the new place slides in (adjust-state-on-change).
  const [slide, setSlide] = useState({ index: places.index, fromRight: true });
  if (slide.index !== places.index)
    setSlide({ index: places.index, fromRight: places.index > slide.index });
  // Every place's forecast (same cache key as the page's own): the pager draws its neighbours
  // while the finger drags, and the places list shows each one's temperature.
  const pageQueries = useQueries({
    queries: places.pages.map((p) => ({
      queryKey: weatherKeys.forecast(p.params),
      queryFn: () => fetchWeatherForecast(p.params),
      enabled: !(p.id === HERE_ID && places.waiting),
      staleTime: 1000 * 60 * 15,
    })),
  });
  const [pending, setPending] = useState<PanchangaLocation | null>(null);
  const nameOf = (p: WeatherPlace) =>
    p.id === HERE_ID
      ? t("weather.current_location")
      : displayLocationLabel(
          { label: p.label, params: p.params },
          undefined,
          lang,
        )
          .split(",")[0]!
          .trim();

  const placeNameFor = (
    place: WeatherPlace,
    d: typeof data,
    gpsOn: boolean,
  ) => {
    // "Nearby location" is the server's name for a grid cell with no city: show the picked place then.
    const serverName =
      d?.location.name === "Nearby location" ? undefined : d?.location.name;
    return gpsOn
      ? displayLocationLabel(
          { label: serverName ?? "", params: place.params },
          serverName,
          lang,
        ) || t("weather.current_location")
      : displayLocationLabel(
          { label: place.label, params: place.params },
          serverName,
          lang,
        );
  };
  const placeName = placeNameFor(places.current, data, usingGps);
  const displayDays = data?.display_days ?? 7;
  const updatedText = (d: typeof data) =>
    d
      ? t("weather.updated_ago", {
          time: spanText(Math.max(60_000, nowMs - d.fetched_at * 1000), t, digits),
        })
      : "";
  const locationNoteText = (name: string, gpsOn: boolean) =>
    t(gpsOn ? "weather.location_note_gps" : "weather.location_note", {
      place: name,
    });
  const toggleAllDays = (count: number, shown: number) =>
    count > shown ? () => setAllDays((v) => !v) : null;
  const viewAt = (i: number): WeatherPlaceView => {
    const q = pageQueries[i]!;
    const place = places.pages[i]!;
    const gpsOn = place.id === HERE_ID && places.gpsOn;
    const v =
      i === places.index
        ? view
        : buildWeatherView(q.data, nowMs, { t, digits, lang }, era, units);
    const name = placeNameFor(place, q.data, gpsOn);
    const shown = q.data?.display_days ?? 7;
    return {
      placeName: name,
      usingGps: gpsOn,
      status: statusOf(q),
      refresh: () => q.refetch(),
      now: v.now,
      hourGroups: v.hourGroups,
      days: allDays ? v.days : v.days.slice(0, shown),
      toggleAllDays: toggleAllDays(v.days.length, shown),
      updated: updatedText(q.data),
      locationNote: locationNoteText(name, gpsOn),
    };
  };
  const views = places.pages.map((_, i) => viewAt(i));
  const summaryOf = (v: WeatherPlaceView, d: typeof data) =>
    v.now && d
      ? {
          // The hourly "now" column: whole degrees, like a list should.
          temperature: v.hourGroups[0]?.hours[0]?.temperature ?? v.now.temperature,
          low: v.days[0]?.low ?? "–",
          high: v.days[0]?.high ?? "–",
          time: placeClock(nowMs, d.forecast.utc_offset_seconds ?? 0, lang, digits),
          glyph: v.now.glyph,
        }
      : null;

  const rowCopy = Object.fromEntries(
    (
      ["feels", "rain_mm", "wind", "gust", "humidity", "dew", "uv"] as const
    ).map((row) => [
      row,
      {
        label: t(`weather.row.${row}`, {
          unit: t(
            `weather.unit_symbol.${row === "rain_mm" ? units.rain : units.wind}`,
          ),
        }),
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
      updated: updatedText(data),
      locationTitle: t("weather.location_title"),
      locationNote: locationNoteText(placeName, usingGps),
      unitsNote: t("weather.units_note", {
        unit: t(`weather.unit_name.${units.temp}`),
      }),
      source: t("weather.source"),
      rows: rowCopy,
      aboutRow: t("weather.about_row"),
      addPlace: t("weather.add_place"),
      placesTitle: t("weather.places_title"),
      primaryAsk: t("weather.primary_ask", {
        place: pending
          ? nameOf({ id: "", label: pending.label, params: pending.params })
          : "",
      }),
      primaryAskBody: t("weather.primary_ask_body"),
      makePrimary: t("weather.make_primary"),
      justAdd: t("weather.just_add"),
      primary: t("weather.primary"),
      remove: t("weather.remove"),
      swipeHint: t("weather.swipe_hint"),
      editList: t("weather.edit_list"),
      editPlace: t("weather.edit_place"),
      placeName: t("weather.place_name"),
      save: t("common.save"),
      done: t("weather.done"),
      moreOptions: t("weather.more_options"),
      searchPlace: t("weather.search_place"),
      units: t("weather.units"),
      unitsTemp: t("weather.units_temp"),
      unitsWind: t("weather.units_wind"),
      unitsRain: t("weather.units_rain"),
      unitsDist: t("weather.units_dist"),
      unitsPressure: t("weather.units_pressure"),
      close: t("common.close"),
    },
    placeName,
    usingGps,
    units: {
      value: units,
      set: setUnit,
      options: {
        temp: WEATHER_UNIT_CHOICES.temp.map((id) => ({
          id,
          label: t(`weather.unit_name.${id}`),
        })),
        wind: WEATHER_UNIT_CHOICES.wind.map((id) => ({
          id,
          label: t(`weather.unit_name.${id}`),
        })),
        rain: WEATHER_UNIT_CHOICES.rain.map((id) => ({
          id,
          label: t(`weather.unit_name.${id}`),
        })),
        dist: WEATHER_UNIT_CHOICES.dist.map((id) => ({ id, label: t(`weather.unit_name.${id}`) })),
        pressure: WEATHER_UNIT_CHOICES.pressure.map((id) => ({ id, label: t(`weather.unit_name.${id}`) })),
      },
    },
    places: {
      pages: places.pages.map((p, i) => ({
        view: views[i]!,
        summary: summaryOf(views[i]!, pageQueries[i]!.data),
        id: p.id,
        // "Here" is named by its city (GPS: the forecast's nearest city; else the app's place); the card's arrow marks it as here.
        name:
          p.id === HERE_ID
            ? placeNameFor(p, pageQueries[i]!.data, places.gpsOn).split(",")[0]!.trim() ||
              t("weather.current_location")
            : nameOf(p),
        primary: p.id === places.primaryId,
        here: p.id === HERE_ID,
        location: {
          // GPS "here" has no label of its own: the server's nearest city names it.
          label: p.label || (pageQueries[i]!.data?.location.name ?? ""),
          params: p.params,
        },
      })),
      index: places.index,
      fromRight: slide.fromRight,
      select: places.select,
      next: places.next,
      prev: places.prev,
      remove: places.remove,
      rename: places.rename,
      makePrimary: places.makePrimary,
      addOpen,
      setAddOpen,
      pending: pending
        ? {
            name: nameOf({
              id: "",
              label: pending.label,
              params: pending.params,
            }),
          }
        : null,
      pick: (place) => {
        setAddOpen(false);
        setPending(place);
      },
      confirm: (primary) => {
        if (pending) places.add(pending, primary);
        setPending(null);
      },
      cancel: () => setPending(null),
      listOpen,
      setListOpen: (open) => {
        setListOpen(open);
        if (!open) setEditing(false);
      },
      editing,
      setEditing,
    },
    status: statusOf(query),
    refresh: () => query.refetch(),
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
    toggleAllDays: toggleAllDays(view.days.length, displayDays),
    openDay,
    toggleDay: (key) => setOpenDay((v) => (v === key ? null : key)),
    info: infoRow
      ? { title: rowCopy[infoRow].infoTitle, body: rowCopy[infoRow].info }
      : null,
    openInfo: setInfoRow,
    closeInfo: () => setInfoRow(null),
  };
}
