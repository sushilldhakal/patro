import { test } from "node:test";
import assert from "node:assert/strict";
import type { City } from "@vedic-patro/api-client";
import { mergeCityResults } from "../src/panchanga/use-location-selector";

const city = (name: string, lat: number, lon: number, country = "NP"): City =>
  ({ id: Math.round(lat * 1000 + lon), name, ascii_name: name, lat, lon, country, population: 0, timezone: "Asia/Kathmandu" }) as City;

test("backend Nepal towns the district list lacks are kept; repeats of a listed city are dropped", () => {
  const listed = [city("Pokhara", 28.21, 83.99)];
  const server = [city("Pokhara", 28.2096, 83.9856), city("Lekhnath", 28.215, 84.0), city("Kewalpur", 27.617, 83.082), city("Paris", 48.85, 2.35, "FR")];
  assert.deepEqual(mergeCityResults(listed, server).map((c) => c.name), ["Pokhara", "Kewalpur", "Paris"]);
});
