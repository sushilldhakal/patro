// The year views made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { yearSunTimes, yearWheel } from "../src/panchanga/engine/year";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases = JSON.parse(readFileSync(new URL("apps/rust/tests/fixtures/http_golden_year.json", root), "utf8")) as Case[];
const PLACES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string; cityId?: number }> = {
  "1283240": { latitude: 27.7, longitude: 85.32, timeZone: "Asia/Kathmandu", name: "Kathmandu", cityId: 1283240 },
  "5128581": { latitude: 40.71, longitude: -74.01, timeZone: "America/New_York", name: "New York City", cityId: 5128581 },
  "": { latitude: 27.7172, longitude: 85.324, timeZone: "Asia/Kathmandu", name: "Kathmandu" },
};

test("the year sun grid made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  for (const c of cases) {
    const m = /^\/v1\/panchanga\/year\/(\d+)\/sun(?:\?(.*))?$/.exec(c.path);
    if (!m || c.status !== 200) continue;
    const q = new URLSearchParams(m[2] ?? "");
    const place = PLACES[q.get("city_id") ?? ""];
    const got = yearSunTimes(sky, Number(m[1]), place);
    assert.ok(got, c.path);
    checked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  assert.equal(checked, 3);
  assert.equal(failures.length, 0, failures.slice(0, 10).join("\n"));
});

test("the year wheel made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  for (const c of cases) {
    const m = /^\/v1\/panchanga\/year\/(\d+)\?(.*)$/.exec(c.path);
    if (!m || c.status !== 200 || !m[2].includes("wheel=true")) continue;
    const q = new URLSearchParams(m[2]);
    const place = PLACES[q.get("city_id") ?? ""];
    if (!place) continue;
    const era = q.get("era");
    const got = yearWheel(sky, Number(m[1]), place, era ? { era, language: q.get("language") ?? undefined } : undefined);
    assert.ok(got, c.path);
    checked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  assert.ok(checked >= 1);
  assert.equal(failures.length, 0, failures.slice(0, 10).join("\n"));
});
