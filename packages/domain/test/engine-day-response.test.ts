// The day route's response made on the device against the server's recorded responses (festivals off:
// those need the festival detail and sait tables, not yet ported).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { dayResponse } from "../src/panchanga/engine/day-response";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases: Case[] = ["http_golden_day.json", "http_golden_day_variants.json", "http_golden_date_keys.json", "http_golden.json"].flatMap((f) => JSON.parse(readFileSync(new URL(`apps/rust/tests/fixtures/${f}`, root), "utf8")) as Case[]);
const CITIES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string }> = {
  "1283240": { latitude: 27.70169, longitude: 85.3206, timeZone: "Asia/Kathmandu", name: "Kathmandu" },
};
void CITIES;

import { diff } from "./golden-diff";
type Json = Record<string, unknown>;

const PLACES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string; cityId: number }> = {
  "1283240": { latitude: 27.7, longitude: 85.32, timeZone: "Asia/Kathmandu", name: "Kathmandu", cityId: 1283240 },
  "1282898": { latitude: 28.27, longitude: 83.97, timeZone: "Asia/Kathmandu", name: "Pokhara", cityId: 1282898 },
  "5128581": { latitude: 40.71, longitude: -74.01, timeZone: "America/New_York", name: "New York City", cityId: 5128581 },
};

test("the day response made on the device matches the server's ", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  let civilChecked = 0;
  let midChecked = 0;
  for (const c of cases) {
    if (c.status !== 200 || /siddhanta|ayanamsha|year|at-time|element/.test(c.path)) continue;
    const m = /^\/v1\/panchanga\/(jd\/([\d.]+)|today|tomorrow|(\d{4})-(\d\d)-(\d\d))\?(.*)$/.exec(c.path);
    if (!m) continue;
    const q = new URLSearchParams(m[6]);
    const era = q.get("era");
    const city = q.get("city_id");
    if (!era || !city || !PLACES[city]) continue;
    let jdn: number;
    if (m[2] || q.get("jd")) jdn = Math.floor(Number(m[2] ?? q.get("jd")) + 0.5);
    else if (m[3] && era === "bs") continue;
    else if (m[3]) jdn = Math.floor(Date.UTC(Number(m[3]), Number(m[4]) - 1, Number(m[5])) / 86_400_000) + 2440588;
    else continue;
    const day = new Date((jdn - 2440588) * 86_400_000);
    const place = PLACES[city];
    const got = dayResponse(sky, { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate(), latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone, name: place.name, cityId: place.cityId }, { era, detail: q.get("detail") !== "false", slim: q.get("slim") === "true", language: q.get("language") ?? undefined, festivals: q.get("festivals") === "true" ? { surya: sky } : undefined, midnight: q.get("reference") === "midnight", civil: q.get("civil") === "true", surya: sky });
    if (!got) continue;
    checked += 1;
    if (q.get('civil') === 'true') civilChecked += 1;
    if (q.get('reference') === 'midnight') midChecked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log('checked', checked, 'civil', civilChecked, 'midnight', midChecked);
  assert.ok(checked >= 3 && civilChecked >= 3 && midChecked >= 5, `checked ${checked}`);
  assert.equal(failures.length, 0, failures.slice(0, 8).join("\n"));
});
