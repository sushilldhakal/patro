// Eclipses made on the client against the server's own responses (the Rust golden, Surya Siddhanta).
// Times may differ by a second or two (the text's positions move in ten-second steps).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { suryaEclipseSpan } from "../src/astronomy/surya-eclipse";

const cases = JSON.parse(readFileSync(new URL("../../../apps/rust/tests/fixtures/http_golden_eclipse.json", import.meta.url), "utf8")) as { path: string; status: number; body: string }[];

const seconds = (iso: string | null) => (iso === null ? null : Date.parse(iso) / 1000);

for (const c of cases.filter((x) => x.status === 200)) {
  test(`eclipses ${c.path.slice(0, 70)}`, () => {
    const want = JSON.parse(c.body);
    const loc = want.location;
    const got = suryaEclipseSpan(want.range_start_jd, want.range_end_jd, want.kind, { latitude: loc.lat, longitude: loc.lon, timeZone: loc.timezone });
    assert.ok(got);
    assert.equal(got.events.length, want.events.length, "count");
    got.events.forEach((e, i) => {
      const w = want.events[i];
      for (const k of ["kind", "type", "type_ne", "type_en", "visible", "date_jd"] as const) assert.equal(e[k], w[k], `${i} ${k}`);
      for (const k of ["max_utc", "max_local", "begin_local", "end_local"] as const) {
        const a = seconds(e[k]);
        const b = seconds(w[k]);
        if (a === null || b === null) assert.equal(a, b, `${i} ${k}`);
        else assert.ok(Math.abs(a - b) <= 12, `${i} ${k} ${e[k]} vs ${w[k]}`);
      }
    });
  });
}

import { eclipseYearPayload } from "../src/festivals/eclipse-payload";

test("the year payload matches the server's whole response (key set, dates, location)", () => {
  const places: Record<string, { latitude: number; longitude: number; timeZone: string; cityId: number; cityName: string }> = {
    "1283240": { latitude: 27.70169, longitude: 85.3206, timeZone: "Asia/Kathmandu", cityId: 1283240, cityName: "Kathmandu" },
    "5128581": { latitude: 40.71427, longitude: -74.00597, timeZone: "America/New_York", cityId: 5128581, cityName: "New York City" },
  };
  let checked = 0;
  for (const c of cases.filter((x) => x.status === 200)) {
    const m = /eclipse\/(solar|lunar)\/year\/(\d+)\?([^#]*)/.exec(c.path);
    const city = /city_id=(\d+)/.exec(c.path)?.[1];
    if (!m || !city || !places[city] || !c.path.includes("year=")) continue;
    const q = new URLSearchParams(m[3]);
    const want = JSON.parse(c.body);
    const got = eclipseYearPayload({ kind: m[1] as "solar" | "lunar", year: Number(m[2]), era: q.get("era") ?? "bs", language: q.get("language") ?? undefined }, places[city]);
    assert.ok(got, c.path);
    assert.deepEqual(Object.keys(got).sort(), Object.keys(want).sort(), `${c.path} keys`);
    for (const k of ["kind", "range_start_jd", "range_start_jd_date", "range_end_jd", "range_end_jd_date", "location", "era", "gregorian_range", "language", "bs_year", "ad_year"]) assert.deepEqual((got as any)[k], want[k], `${c.path} ${k}`);
    (got.events as any[]).forEach((e, i) => assert.equal(e.date_jd_date, want.events[i].date_jd_date, `${c.path} date_jd_date ${i}`));
    checked += 1;
  }
  assert.ok(checked >= 3, `checked ${checked}`);
});
