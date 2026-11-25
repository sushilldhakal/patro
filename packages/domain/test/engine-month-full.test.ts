// The full month grid (`full=true`, `slim=true`) made on the device against the server's recorded months.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { skyMonth } from "../src/astronomy/sky-month";
import { fullMonth } from "../src/panchanga/engine/month-full";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases: Case[] = ["http_golden_year.json", "http_golden_civil_month.json"].flatMap((f) => JSON.parse(readFileSync(new URL(`apps/rust/tests/fixtures/${f}`, root), "utf8")) as Case[]);
const PLACES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string; cityId: number }> = {
  "1283240": { latitude: 27.7, longitude: 85.32, timeZone: "Asia/Kathmandu", name: "Kathmandu", cityId: 1283240 },
  "1282898": { latitude: 28.27, longitude: 83.97, timeZone: "Asia/Kathmandu", name: "Pokhara", cityId: 1282898 },
  "5128581": { latitude: 40.71, longitude: -74.01, timeZone: "America/New_York", name: "New York City", cityId: 5128581 },
};

test("the full month grid made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  for (const c of cases) {
    const m = /^\/v1\/panchanga\/(\d{4})\/(\d{1,2})\?(.*)$/.exec(c.path);
    if (!m || c.status !== 200) continue;
    const q = new URLSearchParams(m[3]);
    if (q.get("full") !== "true" || q.get("clock") || (q.get("era") ?? "bs") !== "bs") continue;
    const place = PLACES[q.get("city_id") ?? "1283240"];
    if (!place) continue;
    const lite = skyMonth({ sky, surya: sky }, { bsYear: Number(m[1]), bsMonth: Number(m[2]), excludeInternational: q.get("exclude_international") === "true", language: q.get("language") ?? undefined, place: { latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone, location: { lat: place.latitude, lon: place.longitude, timezone: place.timeZone, name: place.name, city_id: place.cityId } } });
    if (!lite) continue;
    const got = fullMonth(sky, sky, lite, { slim: q.get("slim") === "true", era: q.get("era") ?? undefined });
    assert.ok(got, `${c.path}: no month`);
    checked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", checked);
  assert.ok(checked >= 3, `checked ${checked}`);
  assert.equal(failures.length, 0, failures.slice(0, 6).join("\n"));
});
