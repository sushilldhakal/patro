// The client month grid against the server's own lite month (recorded from the Rust server, both
// systems, Kathmandu and New York). Strings equal; clock times may differ by a minute (the server
// truncates seconds of its own solved instant); Moon rise and set by two.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { Sky, type SkyIo } from "../src/astronomy/sky";
import { skyMonth } from "../src/astronomy/sky-month";

const io: SkyIo = {
  bundled: async (name) => new Uint8Array(readFileSync(new URL(`../../../apps/web/public/sky/${name}.bin`, import.meta.url))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("the bundled years need no server");
  },
};
type Case = { system: string; year: number; month: number; loc: string; response: Record<string, any> };
const cases = JSON.parse(readFileSync(new URL("./fixtures/month-lite.json", import.meta.url), "utf8")) as Case[];

const minutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const near = (a: string | null, b: string | null, tol: number, what: string) => {
  if (a === null || b === null) return assert.equal(a, b, what);
  const d = Math.abs(minutes(a) - minutes(b));
  assert.ok(Math.min(d, 1440 - d) <= tol, `${what}: ${a} vs ${b}`);
};

const skies: Record<string, Promise<Sky>> = {};
const open = (system: "surya" | "drik") => (skies[system] ??= (async () => {
  const s = new Sky(system, io);
  await s.open();
  return s;
})());

for (const c of cases) {
  test(`${c.system} BS ${c.year}/${c.month} ${c.loc.slice(0, 12)}: month grid matches the server`, async () => {
    const surya = await open("surya");
    const sky = c.system === "drik" ? await open("drik") : surya;
    const ny = c.loc.startsWith("lat=");
    const place = ny
      ? { latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York", location: c.response.location }
      : { latitude: 27.7, longitude: 85.3, timeZone: "Asia/Kathmandu", location: c.response.location };
    const got = skyMonth({ sky, surya }, { bsYear: c.year, bsMonth: c.month, place, language: "en" });
    assert.ok(got);
    const want = c.response;
    for (const k of Object.keys(want)) if (k !== "calendar") assert.deepEqual(got[k], want[k], `header ${k}`);
    const rows = got.calendar as Record<string, any>[];
    assert.equal(rows.length, want.calendar.length);
    const worst: Record<string, number> = {};
    rows.forEach((row, i) => {
      const w = want.calendar[i];
      assert.deepEqual(Object.keys(row), Object.keys(w), `row ${i + 1} keys`);
      for (const k of Object.keys(w)) {
        if (["sunrise", "sunset", "moonrise", "moonset", "moonrise_local", "moonset_local", "abhijit"].includes(k)) continue;
        assert.deepEqual(row[k], w[k], `${w.date_ad} ${k}`);
      }
      near(row.sunrise, w.sunrise, 1, `${w.date_ad} sunrise`);
      near(row.sunset, w.sunset, 1, `${w.date_ad} sunset`);
      near(row.moonrise, w.moonrise, 3, `${w.date_ad} moonrise`);
      near(row.moonset, w.moonset, 3, `${w.date_ad} moonset`);
      assert.equal(Boolean(row.abhijit), Boolean(w.abhijit), `${w.date_ad} abhijit`);
      if (w.abhijit) near(row.abhijit.start_time, w.abhijit.start_time, 1, `${w.date_ad} abhijit`);
      worst.n = (worst.n ?? 0) + 1;
    });
  });
}
