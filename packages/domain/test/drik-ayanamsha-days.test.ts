// A month of Drik days in every ayanamsha against production Python (Swiss Ephemeris, which served
// these modes before the Rust server): the nakshatra at sunrise, the minute it ends, and the Moon's
// rashi. The client reads only the bundled files; non-Lahiri boundaries are solved from positions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { DrikAyanamsha } from "../src/astronomy/ayanamsha-modes";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { localClock, skyDay } from "../src/astronomy/sky-day";

const NAKSHATRA = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];

const YOGA = ["Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"];

const io: SkyIo = {
  bundled: async (name) => new Uint8Array(readFileSync(new URL(`../../../apps/web/public/sky/${name}.bin`, import.meta.url))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("the bundled years need no server");
  },
};
const fixture = JSON.parse(readFileSync(new URL("./fixtures/drik-ayanamsha-days.json", import.meta.url), "utf8")) as {
  place: { latitude: number; longitude: number; utcOffsetMinutes: number };
  modes: Record<DrikAyanamsha, { date_ad: string; nakshatra: string; nakshatra_end: string; chandra_rashi: string; yoga: string; yoga_end: string }[]>;
};

const minutesOf = (stamp: string) => {
  const [date, clock] = stamp.split(" ");
  const [h, m] = clock.split(":").map(Number);
  return Date.parse(`${date}T00:00:00Z`) / 60000 + h * 60 + m;
};

let base: Sky | null = null;
for (const mode of Object.keys(fixture.modes) as DrikAyanamsha[]) {
  test(`drik ${mode}: a month of nakshatras matches Swiss`, async () => {
    if (!base) {
      base = new Sky("drik", io);
      await base.open();
    }
    const sky = base.withAyanamsha(mode);
    const { latitude, longitude, utcOffsetMinutes } = fixture.place;
    let worst = 0;
    for (const row of fixture.modes[mode]) {
      const [y, m, d] = row.date_ad.split("-").map(Number);
      const day = skyDay(sky, { year: y, month: m, day: d, latitude, longitude, utcOffsetMinutes });
      assert.ok(day);
      assert.equal(NAKSHATRA[day.nakshatra.number - 1], row.nakshatra, `${row.date_ad} nakshatra`);
      assert.equal(RASHI[day.moonRashi - 1], row.chandra_rashi, `${row.date_ad} rashi`);
      assert.ok(day.nakshatra.endJd);
      const endLocal = (day.nakshatra.endJd + 0.5) * 1440 + utcOffsetMinutes - 2440588 * 1440;
      const diff = Math.abs(endLocal - minutesOf(row.nakshatra_end));
      worst = Math.max(worst, diff);
      assert.ok(diff <= 2, `${row.date_ad} ends ${localClock(day.nakshatra.endJd, utcOffsetMinutes)} vs ${row.nakshatra_end}`);
    }
    assert.ok(worst <= 2);
  });

  test(`drik ${mode}: a month of yogas matches Swiss`, async () => {
    base ??= new Sky("drik", io);
    await base.open();
    const sky = base.withAyanamsha(mode);
    const { latitude, longitude, utcOffsetMinutes } = fixture.place;
    for (const row of fixture.modes[mode]) {
      const [y, m, d] = row.date_ad.split("-").map(Number);
      const day = skyDay(sky, { year: y, month: m, day: d, latitude, longitude, utcOffsetMinutes });
      assert.ok(day?.yoga.endJd);
      assert.equal(YOGA[day.yoga.number - 1], row.yoga, `${row.date_ad} yoga`);
      const endLocal = (day.yoga.endJd + 0.5) * 1440 + utcOffsetMinutes - 2440588 * 1440;
      const diff = Math.abs(endLocal - minutesOf(row.yoga_end));
      assert.ok(diff <= 2, `${row.date_ad} yoga ends ${localClock(day.yoga.endJd, utcOffsetMinutes)} vs ${row.yoga_end}`);
    }
  });
}
