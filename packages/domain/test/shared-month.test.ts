// The shared-month flow of the local calendar: ask the store, make the month on a miss and offer it,
// reuse a stored one, never offer after an error, and keep the caller's own location and language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar, type SharedMonthStore } from "../src/festivals/local-calendar";

const io: SkyIo = {
  bundled: async (name) => new Uint8Array(readFileSync(new URL(`../../../apps/web/public/sky/${name}.bin`, import.meta.url))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("the bundled years need no server");
  },
};
const skies = new Map<string, Sky>();
const loadSky = async (system: "surya" | "drik") => {
  let s = skies.get(system);
  if (!s) {
    s = new Sky(system, io);
    await s.open();
    skies.set(system, s);
  }
  return s;
};
const calc = (ayanamsha: "lahiri" | "kp") => () => ({ system: "drik" as const, ayanamsha });

test("a miss computes the month, offers it without the caller's location, and the next call is free", async () => {
  const puts: { key: string; body: string }[] = [];
  const shared: SharedMonthStore = { get: async () => "miss", put: (key, body) => void puts.push({ key, body }) };
  const local = makeLocalCalendar({ loadSky, system: () => ({ system: "surya", ayanamsha: "lahiri" }), enabled: () => true, shared });
  const a = await local.month({ year: 2083, month: 8, era: "bs", language: "en" }, { city_id: 1283240 });
  assert.ok(a);
  assert.equal(puts.length, 1);
  assert.match(puts[0].key, /^surya\.2083\.8\.n2770\.e8532\.x0$/);
  const sent = JSON.parse(puts[0].body);
  assert.equal("location" in sent, false);
  assert.equal("language" in sent, false);
  assert.equal(sent.calendar.length, 29);
  assert.equal((a.location as { city_id: number }).city_id, 1283240);
  assert.equal(a.language, "en");
  // The same month for a GPS caller at the same place: from memory, with its own location echo.
  const b = await local.month({ year: 2083, month: 8, era: "bs", language: "ne" }, { lat: 27.7012, lon: 85.3198, timezone: "Asia/Kathmandu" });
  assert.ok(b);
  assert.equal(puts.length, 1, "nothing computed or offered again");
  assert.equal((b.location as { city_id?: number }).city_id, undefined);
  assert.deepEqual(b.calendar, a.calendar);
});

test("a stored month is used as it is", async () => {
  const stored = { year_bs: 2083, month_bs: 9, month_length: 2, calendar: [{ day: 1 }, { day: 2 }], grid_mode: "full_panchanga" };
  let asked = "";
  const shared: SharedMonthStore = { get: async (key) => ((asked = key), stored), put: () => assert.fail("nothing to offer") };
  const local = makeLocalCalendar({ loadSky, system: () => ({ system: "surya", ayanamsha: "lahiri" }), enabled: () => true, shared });
  const got = await local.month({ year: 2083, month: 9, era: "bs" }, { lat: 40.71, lon: -74.01, timezone: "America/New_York" });
  assert.ok(got);
  assert.match(asked, /^surya\.2083\.9\.n4071\.w7401\.x0$/);
  assert.equal((got.calendar as unknown[]).length, 2);
});

test("an unreachable store offers nothing, and each ayanamsha has its own key", async () => {
  const keys: string[] = [];
  const shared: SharedMonthStore = { get: async (key) => (keys.push(key), "error"), put: () => assert.fail("never after an error") };
  const kp = makeLocalCalendar({ loadSky, system: calc("kp"), enabled: () => true, shared });
  const got = await kp.month({ year: 2083, month: 8, era: "bs" }, { city_id: 1283240 });
  assert.ok(got);
  assert.match(keys[0], /^drik-kp\./);
  assert.notEqual(keys[0], "drik-lahiri.2083.8.n2770.e8532.x0");
});
