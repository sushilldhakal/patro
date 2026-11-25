// Days before a zone's standard time run on local mean time, to the second, as the server prints them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { utcOffsetMinutes, utcOffsetText } from "../src/astronomy/lunar-month";
import { makeLocalCalendar } from "../src/festivals/local-calendar";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = {
  bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("offline");
  },
};

test("Kathmandu's local mean time is +05:41:16, exact to the second", () => {
  const jd1913 = 2419996.5;
  assert.equal(Math.round(utcOffsetMinutes("Asia/Kathmandu", jd1913) * 60), 20476);
  assert.equal(utcOffsetText(utcOffsetMinutes("Asia/Kathmandu", jd1913)), "+05:41:16");
  assert.equal(utcOffsetText(345), "+05:45");
  assert.equal(utcOffsetText(-300), "-05:00");
});

test("a day in 1913 is answered on the device, on local mean time", async () => {
  const sky = new Sky("surya", io);
  await sky.open().catch(() => {});
  const calendar = makeLocalCalendar({ loadSky: async () => sky, system: () => ({ system: "surya", ayanamsha: "lahiri" }), enabled: () => true, onError: (e) => { throw e; } });
  const day = (await calendar.day({ inputEra: "bs", date: "1970-05-12", era: "bs", language: "ne", detail: true, slim: true }, { city_id: 1283240 })) as Record<string, any> | null;
  assert.ok(day, "answered without the server");
  // The server's own answer for this day: sunrise at 05:37:22 on Kathmandu mean time (the device's
  // float Julian Days can land a few microseconds either side of the second).
  const stamp = day.solar_corrections.computed_at_local as string;
  assert.match(stamp, /^1913-08-27T05:37:2[12](\.\d+)?\+05:41:16$/);
});
