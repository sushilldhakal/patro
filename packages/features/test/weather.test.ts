import { test } from "node:test";
import assert from "node:assert/strict";
import type { WeatherForecastResponse } from "@vedic-patro/api-client";
import { buildWeatherView, compassPoint, hourlyRows, placeHourKey, uvLevel, weatherKind } from "../src/weather/model";

const text = { t: (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k), digits: (s: string | number) => String(s), lang: "en" };

const data = {
  location: { name: "Kathmandu", latitude: 27.7, longitude: 85.3 },
  forecast: {
    utc_offset_seconds: 20700,
    hourly: {
      time: ["2026-11-25T13:00", "2026-11-25T14:00", "2026-11-25T15:00"],
      temperature_2m: [18.4, 19.6, null],
      precipitation_probability: [0, 10, 20],
      weather_code: [0, 3, 95],
      wind_speed_10m: [4.2, 5.5, 6],
    },
    daily: {
      time: ["2026-11-24", "2026-11-25", "2026-11-26"],
      weather_code: [1, 2, 61],
      temperature_2m_max: [20, 21.2, 17],
      temperature_2m_min: [6, 7.4, 8],
      precipitation_probability_max: [0, 10, 80],
      sunrise: ["2026-11-24T06:38", "2026-11-25T06:39", "2026-11-26T06:40"],
      sunset: ["2026-11-24T17:05", "2026-11-25T17:05", "2026-11-26T17:04"],
      uv_index_max: [4, 4.4, 2],
    },
  },
  forecast_days: 16,
  display_days: 7,
  source: "Open-Meteo",
  fetched_at: 0,
  cached: true,
} satisfies WeatherForecastResponse;

test("WMO codes fold into kinds", () => {
  assert.deepEqual([0, 2, 3, 45, 53, 63, 73, 81, 85, 95].map(weatherKind), [
    "clear", "partly", "cloudy", "fog", "drizzle", "rain", "snow", "showers", "snow", "thunder",
  ]);
});

test("now is the place's current hour, days start today", () => {
  // 08:20 UTC = 14:05 in Kathmandu (+5:45).
  const nowMs = Date.UTC(2026, 10, 25, 8, 20);
  assert.equal(placeHourKey(nowMs, 20700), "2026-11-25T14");
  const view = buildWeatherView(data, nowMs, text);
  assert.equal(view.now?.temperature, "19.6°");
  assert.equal(view.now?.glyph.icon, "overcast-day");
  assert.equal(view.now?.range[1]?.value, "21°");
  assert.equal(view.now?.range[1]?.label, "weather.today_max");
  const hours = view.hourGroups.flatMap((g) => g.hours);
  assert.equal(hours.length, 2);
  assert.equal(hours[0]?.time, "weather.now");
  assert.equal(hours[1]?.temperature, "–");
  assert.equal(hours[1]?.glyph.icon, "thunderstorms-day-rain");
  assert.deepEqual(view.days.map((d) => d.date), ["2026-11-25", "2026-11-26"]);
  assert.equal(view.days[0]?.weekday, "weather.today");
  assert.equal(view.days[1]?.weekday, "weather.tomorrow");
  // BS by default; AD when the reader's calendar is AD.
  assert.match(view.days[1]!.dateLabel, /^\d+ Mangsir$/);
  const ad = buildWeatherView(data, nowMs, text, "ad");
  assert.equal(ad.days[1]!.dateLabel, "26 November");
});

test("compass, UV bands and filters", () => {
  assert.deepEqual([0, 22, 200, 350].map(compassPoint), ["N", "NNE", "SSW", "N"]);
  assert.deepEqual([1, 4, 7, 10, 12].map(uvLevel), ["low", "moderate", "high", "very_high", "extreme"]);
  assert.deepEqual(hourlyRows("wind"), ["wind", "gust"]);
});

test("no data → empty view", () => {
  assert.equal(buildWeatherView(undefined, 0, text).now, null);
});

test("moon phase from our own sky: full on 25 Nov 2026, last quarter next on 1 Dec", async () => {
  const { moonPhaseAt, nextPrincipalPhase } = await import("../src/weather/moon");
  const t = Date.UTC(2026, 10, 25, 8);
  assert.equal(moonPhaseAt(t), "full");
  const next = nextPrincipalPhase(t);
  assert.equal(next.key, "last_quarter");
  // Actual: 2026-12-01 06:08 UTC.
  assert.ok(Math.abs(next.ms - Date.UTC(2026, 11, 1, 6, 8)) < 90 * 60_000);
});

test("rain never shows a dash", () => {
  const view = buildWeatherView(data, Date.UTC(2026, 10, 25, 8, 20), text);
  assert.equal(view.days[0]?.rainAmount, 'weather.mm:{"amount":"0"}');
  assert.equal(view.hourGroups[0]?.hours[0]?.rainMm, "0");
});
