// The panchak year route made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { panchakYear } from "../src/panchanga/engine/panchak";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases = JSON.parse(readFileSync(new URL("apps/rust/tests/fixtures/http_golden_panchak.json", root), "utf8")) as Case[];
const PLACES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string; cityId: number }> = {
  "1283240": { latitude: 27.7, longitude: 85.32, timeZone: "Asia/Kathmandu", name: "Kathmandu", cityId: 1283240 },
  "1282898": { latitude: 28.27, longitude: 83.97, timeZone: "Asia/Kathmandu", name: "Pokhara", cityId: 1282898 },
  "5128581": { latitude: 40.71, longitude: -74.01, timeZone: "America/New_York", name: "New York City", cityId: 5128581 },
};

test("the panchak year made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  for (const c of cases) {
    const m = /^\/v1\/nepal\/panchak\/year\/(\d+)\?(.*)$/.exec(c.path);
    if (!m || c.status !== 200) continue;
    const q = new URLSearchParams(m[2]);
    const place = PLACES[q.get("city_id") ?? ""];
    const era = q.get("era");
    if (!place || !era || Number(q.get("year")) !== Number(m[1])) continue;
    const got = panchakYear(sky, era, Number(m[1]), place, q.get("language") ?? undefined);
    assert.ok(got, c.path);
    checked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", checked);
  assert.ok(checked >= 3);
  assert.equal(failures.length, 0, failures.slice(0, 10).join("\n"));
});
