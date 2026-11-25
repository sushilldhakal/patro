/**
 * Weather page rows, built from the server's Open-Meteo forecast. Pure: no React,
 * no clock (the caller passes `nowMs`), so both apps and the tests get the same rows.
 * Each app only draws these: icons are Meteocon names the UI kit holds.
 */
import type { WeatherForecastResponse } from "@vedic-patro/api-client";
import {
  AD_MONTH_NAMES,
  AD_MONTH_NAMES_NE,
  BS_MONTHS_NE,
  BS_MONTH_NAMES,
  WEEKDAYS_EN,
  WEEKDAYS_NE,
  WEEKDAYS_SHORT,
  WEEKDAYS_SHORT_NE,
  adToBS,
} from "@vedic-patro/domain/calendar/bs-calendar";
import { moonPhaseAt, nextPrincipalPhase } from "./moon";

/** The WMO weather codes Open-Meteo sends, folded into what a reader tells apart. */
export type WeatherKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "showers"
  | "thunder";

export function weatherKind(code: number | null | undefined): WeatherKind {
  if (code == null || code <= 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "showers";
  if (code <= 86) return "snow";
  return "thunder";
}

/** Meteocons (https://github.com/basmilius/meteocons) the page draws; the UI kit holds the artwork. */
export type WeatherIconName =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "overcast-day"
  | "overcast-night"
  | "fog-day"
  | "fog-night"
  | "drizzle"
  | "rain"
  | "partly-cloudy-day-rain"
  | "partly-cloudy-night-rain"
  | "snow"
  | "thunderstorms-day-rain"
  | "thunderstorms-night-rain";

export function weatherIcon(kind: WeatherKind, day: boolean): WeatherIconName {
  const dn = day ? "day" : "night";
  switch (kind) {
    case "clear":
      return `clear-${dn}`;
    case "partly":
      return `partly-cloudy-${dn}`;
    case "cloudy":
      return `overcast-${dn}`;
    case "fog":
      return `fog-${dn}`;
    case "drizzle":
      return "drizzle";
    case "rain":
      return "rain";
    case "showers":
      return `partly-cloudy-${dn}-rain`;
    case "snow":
      return "snow";
    case "thunder":
      return `thunderstorms-${dn}-rain`;
  }
}

export type UvLevel = "low" | "moderate" | "high" | "very_high" | "extreme";

/** WHO UV index bands. */
export function uvLevel(uv: number): UvLevel {
  if (uv < 3) return "low";
  if (uv < 6) return "moderate";
  if (uv < 8) return "high";
  if (uv < 11) return "very_high";
  return "extreme";
}

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

/** 16-point compass key of a wind bearing (where the wind blows from). */
export function compassPoint(deg: number): (typeof COMPASS)[number] {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]!;
}

/** Which rows the hourly table shows. */
export type WeatherHourlyFilter = "temp_rain" | "wind" | "humidity_uv" | "all";
export type WeatherHourlyRow =
  "feels" | "rain_mm" | "wind" | "gust" | "humidity" | "dew" | "uv";

export const WEATHER_HOURLY_FILTERS: readonly WeatherHourlyFilter[] = [
  "temp_rain",
  "wind",
  "humidity_uv",
  "all",
];

const FILTER_ROWS: Record<WeatherHourlyFilter, readonly WeatherHourlyRow[]> = {
  temp_rain: ["feels", "rain_mm"],
  wind: ["wind", "gust"],
  humidity_uv: ["humidity", "dew", "uv"],
  all: ["feels", "rain_mm", "wind", "gust", "humidity", "dew", "uv"],
};

export function hourlyRows(
  filter: WeatherHourlyFilter,
): readonly WeatherHourlyRow[] {
  return FILTER_ROWS[filter];
}

type Text = {
  t: (key: string, vars?: Record<string, unknown>) => string;
  digits: (s: string | number) => string;
  lang: string;
};

export type WeatherGlyph = { icon: WeatherIconName; label: string };
export type WeatherWind = {
  direction: string;
  /** Bearing the arrow points to (where the wind goes). */
  arrowDeg: number;
  /** "11 km/h" */
  speed: string;
  /** "11", for the hourly table whose caption carries the unit. */
  value: string;
};
export type WeatherUv = { value: string; level: UvLevel; label: string };

/** Meteocons drawn beside a fact. */
export type WeatherFactIconName =
  | "sunrise"
  | "sunset"
  | "humidity"
  | "wind"
  | "raindrop"
  | "raindrops"
  | "thermometer"
  | "umbrella"
  | "sun-hot"
  | `moon-${"new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous" | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent"}`
  | `uv-index-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11}`;

/** What a fact is drawn beside: the wind's arrow (it turns), or a Meteocon. */
export type WeatherFactIcon =
  { kind: "arrow"; deg: number } | { kind: "icon"; name: WeatherFactIconName };

export type WeatherFact = {
  key: string;
  value: string;
  label: string;
  icon?: WeatherFactIcon;
};

export type WeatherNowView = {
  glyph: WeatherGlyph;
  temperature: string;
  feelsLike: string;
  /** "14° Overnight min · 29° Tomorrow's max" (or today's, before mid-afternoon). */
  range: WeatherFact[];
  rainLine: string;
  wind: WeatherWind | null;
  /** Current weather: wind, gust, humidity, rain today. */
  current: WeatherFact[];
  rainChanceLine: string;
  /** Sun and UV: sunrise, sunset, max UV, protection window. */
  sun: WeatherFact[];
  uvMax: WeatherUv | null;
};

export type WeatherHourView = {
  key: string;
  time: string;
  night: boolean;
  glyph: WeatherGlyph;
  temperature: string;
  feels: string;
  rainChance: string;
  rainMm: string;
  wind: WeatherWind | null;
  gust: string;
  humidity: string;
  dew: string;
  uv: WeatherUv | null;
};

export type WeatherHourGroup = {
  key: string;
  label: string;
  hours: WeatherHourView[];
};

export type WeatherDayView = {
  key: string;
  /** `YYYY-MM-DD` in the place's own calendar. */
  date: string;
  weekday: string;
  weekdayShort: string;
  /** "26 November · मंसिर १०" */
  dateLabel: string;
  glyph: WeatherGlyph;
  high: string;
  low: string;
  rainAmount: string;
  rainChance: string;
  details: WeatherFact[];
};

const round = (v: number | null | undefined, places = 0) =>
  v == null || Number.isNaN(v)
    ? null
    : Math.round(v * 10 ** places) / 10 ** places;

/** `YYYY-MM-DDTHH` of `nowMs` on the place's clock. */
export function placeHourKey(nowMs: number, utcOffsetSeconds: number): string {
  return new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 13);
}

export function buildWeatherView(
  data: WeatherForecastResponse | undefined,
  nowMs: number,
  text: Text,
  /** The reader's calendar: dates are drawn in BS or AD, in the UI language's script. */
  era: "bs" | "ad" = "bs",
) {
  const { t, digits, lang } = text;
  const en = lang === "en";
  const deg = (v: number | null | undefined, places = 0) => {
    const r = round(v, places);
    return r == null ? "–" : `${digits(places ? r.toFixed(places) : r)}°`;
  };
  const pct = (v: number | null | undefined) =>
    round(v) == null ? "–" : `${digits(round(v)!)}%`;
  const num = (v: number | null | undefined, places = 0) =>
    round(v, places) == null ? "–" : digits(round(v, places)!);
  const kmh = (v: number | null | undefined) =>
    round(v) == null ? "–" : t("weather.kmh", { speed: digits(round(v)!) });
  const mm = (v: number | null | undefined) =>
    round(v, 1) == null
      ? "–"
      : t("weather.mm", { amount: digits(round(v, 1)!) });
  const clock = (iso: string | undefined) => {
    if (!iso) return "–";
    const h = Number(iso.slice(11, 13));
    const m = iso.slice(14, 16);
    if (!en) return digits(iso.slice(11, 16));
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${h < 12 ? "am" : "pm"}`;
  };
  const hourLabel = (iso: string) => {
    const h = Number(iso.slice(11, 13));
    return en
      ? `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`
      : digits(iso.slice(11, 16));
  };
  const glyph = (
    code: number | null | undefined,
    day: boolean,
  ): WeatherGlyph => {
    const kind = weatherKind(code);
    return { icon: weatherIcon(kind, day), label: t(`weather.kind.${kind}`) };
  };
  const wind = (
    speed: number | null | undefined,
    from: number | null | undefined,
  ): WeatherWind | null =>
    speed == null || from == null
      ? null
      : {
          direction: t(`weather.dir.${compassPoint(from)}`),
          arrowDeg: (from + 180) % 360,
          speed: kmh(speed),
          value: num(speed),
        };
  const uv = (v: number | null | undefined): WeatherUv | null => {
    const r = round(v);
    if (r == null) return null;
    const level = uvLevel(r);
    return { value: digits(r), level, label: t(`weather.uv_level.${level}`) };
  };
  const chanceWord = (p: number) =>
    t(
      p < 30
        ? "weather.chance.low"
        : p < 60
          ? "weather.chance.medium"
          : p < 85
            ? "weather.chance.high"
            : "weather.chance.very_high",
    );
  const dayName = (date: string, short: boolean, offset: number) => {
    if (offset === 0) return t("weather.today");
    if (offset === 1) return t("weather.tomorrow");
    const [y, m, d] = date.split("-").map(Number);
    const wd = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
    return (
      (short
        ? en
          ? WEEKDAYS_SHORT
          : WEEKDAYS_SHORT_NE
        : en
          ? WEEKDAYS_EN
          : WEEKDAYS_NE)[wd] ?? ""
    );
  };
  /** "१० मंसिर" / "10 Mangsir" in BS, "२६ नोभेम्बर" / "26 November" in AD. */
  const dateLabel = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    if (era === "ad")
      return `${digits(d!)} ${(en ? AD_MONTH_NAMES : AD_MONTH_NAMES_NE)[m! - 1] ?? ""}`;
    const bs = adToBS(new Date(y!, m! - 1, d!));
    return `${digits(bs.day)} ${(en ? BS_MONTH_NAMES : BS_MONTHS_NE)[bs.month - 1] ?? ""}`;
  };

  const empty = {
    now: null as WeatherNowView | null,
    hourGroups: [] as WeatherHourGroup[],
    days: [] as WeatherDayView[],
  };
  const hourly = data?.forecast.hourly;
  const daily = data?.forecast.daily;
  if (!hourly || !daily) return empty;

  const hourKey = placeHourKey(nowMs, data.forecast.utc_offset_seconds ?? 0);
  const found = hourly.time.findIndex((time) => time.slice(0, 13) === hourKey);
  const at = found < 0 ? 0 : found;
  const today = hourKey.slice(0, 10);
  const todayAt = Math.max(0, daily.time.indexOf(today));
  const isDayAt = (i: number) => (hourly.is_day?.[i] ?? 1) === 1;

  // ── Now ──
  const cur = data.forecast.current;
  const nowDay = cur?.is_day != null ? cur.is_day === 1 : isDayAt(at);
  const afternoon = Number(hourKey.slice(11, 13)) >= 15;
  const next = todayAt + 1;
  const range: WeatherFact[] = afternoon
    ? [
        {
          key: "min",
          value: deg(daily.temperature_2m_min[next]),
          label: t("weather.overnight_min"),
        },
        {
          key: "max",
          value: deg(daily.temperature_2m_max[next]),
          label: t("weather.tomorrow_max"),
        },
      ]
    : [
        {
          key: "min",
          value: deg(daily.temperature_2m_min[todayAt]),
          label: t("weather.today_min"),
        },
        {
          key: "max",
          value: deg(daily.temperature_2m_max[todayAt]),
          label: t("weather.today_max"),
        },
      ];
  const rainToday = daily.precipitation_sum?.[todayAt];
  const rainChance = round(daily.precipitation_probability_max[todayAt]);
  const nowWind = wind(
    cur?.wind_speed_10m ?? hourly.wind_speed_10m[at],
    cur?.wind_direction_10m ?? hourly.wind_direction_10m?.[at],
  );

  // Hours of today with UV ≥ 3: when to cover up.
  const uvHours = hourly.time
    .map((time, i) => ({ time, uv: hourly.uv_index?.[i] ?? 0 }))
    .filter((h) => h.time.startsWith(today) && h.uv >= 3);
  const uvMax = uv(daily.uv_index_max[todayAt]);
  const nextMoon = nextPrincipalPhase(nowMs);
  /** The phase's date on the place's own clock, in the reader's calendar. */
  const placeDay = (ms: number) =>
    dateLabel(
      new Date(ms + (data.forecast.utc_offset_seconds ?? 0) * 1000)
        .toISOString()
        .slice(0, 10),
    );

  const now: WeatherNowView = {
    glyph: glyph(cur?.weather_code ?? hourly.weather_code[at], nowDay),
    temperature: deg(cur?.temperature_2m ?? hourly.temperature_2m[at], 1),
    feelsLike: t("weather.feels_like", {
      temp: deg(
        cur?.apparent_temperature ?? hourly.apparent_temperature?.[at],
        1,
      ),
    }),
    range,
    rainLine:
      rainToday != null && rainToday >= 0.2
        ? t("weather.rain_today", { amount: mm(rainToday) })
        : t("weather.no_rain"),
    wind: nowWind,
    current: [
      ...(nowWind
        ? [
            {
              key: "wind",
              value: `${nowWind.direction} ${nowWind.speed}`,
              label: t("weather.wind"),
            },
          ]
        : []),
      {
        key: "gust",
        value: kmh(cur?.wind_gusts_10m ?? hourly.wind_gusts_10m?.[at]),
        label: t("weather.gust"),
      },
      {
        key: "humidity",
        value: pct(
          cur?.relative_humidity_2m ?? hourly.relative_humidity_2m?.[at],
        ),
        label: t("weather.humidity"),
      },
      {
        key: "rain",
        value: mm(rainToday ?? 0),
        label: t("weather.rain_today_label"),
      },
    ],
    rainChanceLine:
      rainChance == null
        ? ""
        : t("weather.rain_chance_line", {
            chance: digits(rainChance),
            word: chanceWord(rainChance),
          }),
    sun: [
      {
        key: "sunrise",
        value: clock(daily.sunrise[todayAt]),
        label: t("weather.sunrise"),
      },
      {
        key: "sunset",
        value: clock(daily.sunset[todayAt]),
        label: t("weather.sunset"),
      },
      {
        key: "moon",
        value: t(`weather.moon.${moonPhaseAt(nowMs)}`),
        label: t("weather.moon_phase"),
      },
      {
        key: "next_moon",
        value: `${t(`weather.moon.${nextMoon.key}`)}, ${placeDay(nextMoon.ms)}`,
        label: t("weather.next_moon_phase"),
      },
      ...(uvMax
        ? [
            {
              key: "uv",
              value: `${uvMax.value} (${uvMax.label})`,
              label: t("weather.uv_max"),
            },
          ]
        : []),
      ...(uvHours.length
        ? [
            {
              key: "protect",
              value: `${clock(uvHours[0]!.time)}–${clock(`${uvHours.at(-1)!.time.slice(0, 11)}${String(Number(uvHours.at(-1)!.time.slice(11, 13)) + 1).padStart(2, "0")}:00`)}`,
              label: t("weather.sun_protection"),
            },
          ]
        : []),
    ],
    uvMax,
  };

  // Each fact's icon, by its key.
  const iconOf: Partial<Record<string, WeatherFactIconName>> = {
    gust: "wind",
    humidity: "humidity",
    rain: "raindrop",
    sunrise: "sunrise",
    sunset: "sunset",
    protect: "sun-hot",
  };
  const moonIcon = (key: string) =>
    `moon-${key.replace("_", "-")}` as WeatherFactIconName;
  const withIcon = (f: WeatherFact): WeatherFact => {
    if (f.key === "wind" && nowWind)
      return { ...f, icon: { kind: "arrow", deg: nowWind.arrowDeg } };
    if (f.key === "uv" && uvMax)
      return {
        ...f,
        icon: {
          kind: "icon",
          name: `uv-index-${Math.min(11, Math.max(1, Number(round(daily.uv_index_max[todayAt]) ?? 1)))}` as WeatherFactIconName,
        },
      };
    if (f.key === "moon")
      return {
        ...f,
        icon: { kind: "icon", name: moonIcon(moonPhaseAt(nowMs)) },
      };
    if (f.key === "next_moon")
      return { ...f, icon: { kind: "icon", name: moonIcon(nextMoon.key) } };
    const name = iconOf[f.key];
    return name ? { ...f, icon: { kind: "icon", name } } : f;
  };
  now.current = now.current.map(withIcon);
  now.sun = now.sun.map(withIcon);

  // ── Hours: the next 48, grouped by day ──
  const hourGroups: WeatherHourGroup[] = [];
  for (let i = at; i < Math.min(hourly.time.length, at + 48); i++) {
    const time = hourly.time[i]!;
    const date = time.slice(0, 10);
    let group = hourGroups.at(-1);
    if (!group || group.key !== date) {
      const offset = Math.round(
        (Date.parse(date) - Date.parse(today)) / 86_400_000,
      );
      group = { key: date, label: dayName(date, false, offset), hours: [] };
      hourGroups.push(group);
    }
    const day = isDayAt(i);
    group.hours.push({
      key: time,
      time: i === at ? t("weather.now") : hourLabel(time),
      night: !day,
      glyph: glyph(hourly.weather_code[i], day),
      temperature: deg(hourly.temperature_2m[i]),
      feels: deg(hourly.apparent_temperature?.[i]),
      rainChance: pct(hourly.precipitation_probability[i]),
      rainMm: num(hourly.precipitation?.[i] ?? 0, 1),
      wind: wind(hourly.wind_speed_10m[i], hourly.wind_direction_10m?.[i]),
      gust: num(hourly.wind_gusts_10m?.[i]),
      humidity: pct(hourly.relative_humidity_2m?.[i]),
      dew: deg(hourly.dew_point_2m?.[i]),
      uv: uv(hourly.uv_index?.[i]),
    });
  }

  // ── Days from today ──
  const days: WeatherDayView[] = daily.time.slice(todayAt).map((date, j) => {
    const i = todayAt + j;
    const sum = daily.precipitation_sum?.[i];
    const dayWind = wind(
      daily.wind_speed_10m_max?.[i],
      daily.wind_direction_10m_dominant?.[i],
    );
    const dayUv = uv(daily.uv_index_max[i]);
    const chance = round(daily.precipitation_probability_max[i]);
    return {
      key: date,
      date,
      weekday: dayName(date, false, j),
      weekdayShort: dayName(date, true, j),
      dateLabel: dateLabel(date),
      glyph: glyph(daily.weather_code[i], true),
      high: deg(daily.temperature_2m_max[i]),
      low: deg(daily.temperature_2m_min[i]),
      rainAmount: mm(sum ?? 0),
      rainChance: pct(chance),
      details: [
        ...(chance == null
          ? []
          : [
              {
                key: "rain",
                value: t("weather.rain_chance_line", {
                  chance: digits(chance),
                  word: chanceWord(chance),
                }),
                label: t("weather.rain"),
              },
            ]),
        ...(dayWind
          ? [
              {
                key: "wind",
                value: `${dayWind.direction} ${dayWind.speed}`,
                label: t("weather.wind"),
              },
            ]
          : []),
        {
          key: "gust",
          value: kmh(daily.wind_gusts_10m_max?.[i]),
          label: t("weather.gust"),
        },
        ...(dayUv
          ? [
              {
                key: "uv",
                value: `${dayUv.value} (${dayUv.label})`,
                label: t("weather.uv_max"),
              },
            ]
          : []),
        {
          key: "sunrise",
          value: clock(daily.sunrise[i]),
          label: t("weather.sunrise"),
        },
        {
          key: "sunset",
          value: clock(daily.sunset[i]),
          label: t("weather.sunset"),
        },
      ],
    };
  });

  return { now, hourGroups, days };
}
