// A place given as coordinates (a phone's GPS) is computed on the device, not sent to the server.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { coordinateName, makeLocalCalendar } from "../src/festivals/local-calendar";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = {
  bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("offline");
  },
};

test("coordinates name the nearest known city, or themselves", () => {
  assert.equal(coordinateName({ latitude: 27.7, longitude: 85.3167 }), "Kathmandu");
  assert.equal(coordinateName({ latitude: 10.5, longitude: 20.25 }), "10.50°, 20.25°");
});

test("an at-time request for a GPS place is answered on the device, with the server down", async () => {
  const skies = new Map<string, Promise<Sky>>();
  const calendar = makeLocalCalendar({
    loadSky: (system) => {
      let sky = skies.get(system);
      if (!sky) {
        const made = new Sky(system, io);
        sky = made.open().then(() => made, () => made);
        skies.set(system, sky);
      }
      return sky;
    },
    system: () => ({ system: "drik", ayanamsha: "lahiri" }),
    enabled: () => true,
    onError: (e) => {
      throw e;
    },
  });
  const got = await calendar.atTime(
    { jd: 2461369.5, clock: "09:00:00", era: "bs", language: "ne" },
    { lat: 27.7, lon: 85.3167, timezone: "Asia/Kathmandu" },
  );
  assert.ok(got, "the device answered");
  assert.equal(JSON.stringify(got).includes("Kathmandu"), true, "named after the nearest city");
  // No time zone: inside Nepal it is Nepal time; elsewhere the server finds the zone.
  assert.ok(await calendar.atTime({ jd: 2461369.5, clock: "09:00:00", era: "bs", language: "ne" }, { lat: 27.7, lon: 85.3167 }));
  assert.equal(await calendar.atTime({ jd: 2461369.5, clock: "09:00:00", era: "bs", language: "ne" }, { lat: 51.5, lon: -0.12 }), null);
});
