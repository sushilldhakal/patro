// The day engine against the Rust server's own answers for a whole month (BS 2083 Mangsir, 17 Nov
// to 15 Dec 2026, Kathmandu), for both systems. The fixture was recorded from the server; the
// engine reads only the bundled files, so a pass means a phone needs no server for these days.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { Sky, type SkyIo } from "../src/astronomy/sky";
import { julianDayNumber, localClock, skyDay } from "../src/astronomy/sky-day";

const file = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../../../apps/web/public/sky/${name}.bin`, import.meta.url)));
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/sky-day-mangsir-2083.json", import.meta.url), "utf8"),
) as {
  place: { latitude: number; longitude: number; utcOffsetMinutes: number };
  systems: Record<string, Record<string, string>[]>;
};

const TITHI = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
const NAKSHATRA = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];

const io: SkyIo = {
  bundled: async (name) => file(name),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("the bundled years need no server");
  },
};

const minutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

for (const system of ["surya", "drik"] as const) {
  test(`${system}: a month of days from the bundled files matches the server`, async () => {
    const sky = new Sky(system, io);
    await sky.open();
    const { latitude, longitude, utcOffsetMinutes } = fixture.place;
    let checked = 0;
    for (const row of fixture.systems[system]) {
      const [y, m, d] = row.date_ad.split("-").map(Number);
      const day = skyDay(sky, { year: y, month: m, day: d, latitude, longitude, utcOffsetMinutes });
      assert.ok(day, row.date_ad);
      assert.equal(day.origin, "bundled", "no fallback inside the bundled years");

      // sunrise and sunset, to the minute the server prints (it truncates, we round)
      const rise = minutes(localClock(day.sunriseJd, utcOffsetMinutes));
      const set = minutes(localClock(day.sunsetJd, utcOffsetMinutes));
      assert.ok(Math.abs(rise - minutes(row.sunrise)) <= 1, `${row.date_ad} sunrise ${localClock(day.sunriseJd, utcOffsetMinutes)} vs ${row.sunrise}`);
      assert.ok(Math.abs(set - minutes(row.sunset)) <= 1, `${row.date_ad} sunset ${localClock(day.sunsetJd, utcOffsetMinutes)} vs ${row.sunset}`);

      // tithi: the name and the paksha
      const within = day.tithi.withinPaksha;
      const name = within === 15 ? (day.tithi.paksha === "shukla" ? "Purnima" : "Aausi") : TITHI[within - 1];
      assert.equal(name, row.tithi, `${row.date_ad} tithi`);
      assert.equal(day.tithi.paksha, row.paksha, `${row.date_ad} paksha`);
      assert.equal(NAKSHATRA[day.nakshatra.number - 1], row.nakshatra, `${row.date_ad} nakshatra`);
      assert.equal(RASHI[day.moonRashi - 1], row.chandra_rashi, `${row.date_ad} moon rashi`);

      // every end is a real instant after sunrise, and the tithi ends before the next sunrise + 2 days
      assert.ok(day.tithi.endJd !== null && day.tithi.endJd > (day.sunriseJd ?? 0));
      assert.ok(day.tithi.endJd - (day.sunriseJd ?? 0) < 1.5);
      assert.equal(day.grahas.length, 8);
      assert.ok(day.lagna && day.lagna.rashi >= 1 && day.lagna.rashi <= 12);
      checked += 1;
    }
    assert.equal(checked, fixture.systems[system].length);
  });
}

test("julianDayNumber and localClock", () => {
  assert.equal(julianDayNumber(2000, 1, 1), 2451545);
  assert.equal(julianDayNumber(2026, 11, 24), 2461369);
  // 2000-01-01 00:00 UT is JD 2451544.5; Kathmandu is UTC+5:45
  assert.equal(localClock(2451544.5, 345), "05:45");
  assert.equal(localClock(null, 345), "");
});

test("safeSkyDay never throws: a failing loader, a switch set to off, and a good day", async () => {
  const { safeSkyDay } = await import("../src/astronomy/sky-safe");
  const place = { latitude: 27.7172, longitude: 85.324, utcOffsetMinutes: 345 };
  const input = { year: 2026, month: 11, day: 24, ...place };
  let reported: unknown = null;
  const broken = await safeSkyDay(
    async () => {
      throw new Error("native module missing");
    },
    input,
    { enabled: true, onError: (e) => (reported = e) },
  );
  assert.equal(broken, null);
  assert.ok(reported instanceof Error);

  const off = await safeSkyDay(async () => assert.fail("must not load when off"), input, { enabled: false });
  assert.equal(off, null);

  const sky = new Sky("surya", io);
  await sky.open();
  const good = await safeSkyDay(async () => sky, input, { enabled: true });
  assert.ok(good && good.origin === "bundled");

  // a date outside the bundled years with no server: the formulas answer, and nothing throws
  const far = await safeSkyDay(async () => sky, { ...input, year: 2400 }, { enabled: true });
  assert.ok(far, "the built-in fallback answers");
  assert.equal(far.origin, "formulas");
});
