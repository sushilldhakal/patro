// The festival routes made on the client against the server's own responses for the same queries
// (recorded from production, `generated_at` and `hash` left out: they are per response).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { Sky, type SkyIo } from "../src/astronomy/sky";
import {
  KATHMANDU_PLACE,
  festivalListingPayload,
  holidayListingPayload,
  upcomingFestivalsPayload,
  type FestivalPlace,
} from "../src/festivals/festival-payloads";
import { makeLocalCalendar } from "../src/festivals/local-calendar";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = {
  bundled: async (name) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${name}.bin`, root))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("the bundled years need no server");
  },
};
const cases = JSON.parse(readFileSync(new URL("./fixtures/festival-routes.json", import.meta.url), "utf8")) as {
  kind: "festivals" | "holidays";
  path: string;
  place: FestivalPlace | null;
  city_id?: number;
  response: Record<string, unknown>;
}[];

let sky: Sky | null = null;
const surya = async () => {
  if (!sky) {
    sky = new Sky("surya", io);
    await sky.open();
  }
  return sky;
};

for (const c of cases) {
  test(`${c.path} matches the server`, async () => {
    const q = new URLSearchParams(c.path.split("?")[1]);
    const query = {
      year: Number(q.get("year")),
      era: q.get("era") ?? "bs",
      month: q.has("month") ? Number(q.get("month")) : undefined,
      tradition: q.get("tradition") ?? undefined,
      language: q.get("language") ?? undefined,
    };
    const make = c.kind === "festivals" ? festivalListingPayload : holidayListingPayload;
    const local = makeLocalCalendar({ loadSky: surya, system: () => "surya", enabled: () => true });
    const got = c.city_id
      ? await local[c.kind](query, { city_id: c.city_id })
      : make({ sky: await surya(), surya: await surya() }, c.place ?? KATHMANDU_PLACE, query);
    assert.ok(got, "answered locally");
    delete got.generated_at;
    delete got.hash;
    assert.deepEqual(Object.keys(got).sort(), Object.keys(c.response).sort(), "same keys");
    assert.deepEqual(got, c.response);
  });
}

test("upcoming festivals: today's window, sorted, with days_until", async () => {
  const now = Date.UTC(2026, 10, 24, 6, 0);
  const got = upcomingFestivalsPayload({ sky: await surya(), surya: await surya() }, KATHMANDU_PLACE, { days: 90, limit: 15, holidaysOnly: false, nowMs: now });
  assert.ok(got);
  assert.equal(got.from, "2026-11-24");
  const list = got.festivals as { start_date: string; days_until: number; bs_start_date: string }[];
  assert.equal(list.length, 15);
  for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].start_date <= list[i].start_date);
  assert.ok(list.every((f) => f.days_until >= -40 && f.bs_start_date.startsWith("208")));
});

test("the local calendar: off switch, unknown cities and names go to the server", async () => {
  const off = makeLocalCalendar({ loadSky: surya, system: () => "surya", enabled: () => false });
  assert.equal(await off.holidays({ year: 2083, era: "bs" }), null);
  const on = makeLocalCalendar({ loadSky: surya, system: () => "surya", enabled: () => true });
  assert.equal(await on.holidays({ year: 2083, era: "bs" }, { city_id: 42 }), null);
  assert.equal(await on.holidays({ year: 2083, era: "bs" }, { city: "Kathmandu" }), null);
  assert.equal(await on.holidays({ year: 2083, era: "bs" }, { lat: 27.7 }), null);
  const broken = makeLocalCalendar({ loadSky: () => Promise.reject(new Error("no file")), system: () => "surya", enabled: () => true });
  assert.equal(await broken.holidays({ year: 2083, era: "bs" }), null);
});

test("years the bundled sky cannot answer go to the server", async () => {
  const s = { sky: await surya(), surya: await surya() };
  assert.equal(festivalListingPayload(s, KATHMANDU_PLACE, { year: 2160, era: "bs" }), null);
  assert.equal(festivalListingPayload(s, KATHMANDU_PLACE, { year: 1900, era: "bs" }), null);
  assert.equal(festivalListingPayload(s, KATHMANDU_PLACE, { year: 100, era: "bbs" }), null);
});

// Drik: lunar festivals on the Drik sky's tithis (owner, 2026-11-24). Oracle: production Python,
// which already honoured `siddhanta=drik`; it pins Padmini and Parama to Jestha, while the owner's
// rule gives them to the adhik month, so those two rows are left out on both sides.
const drikCases = JSON.parse(readFileSync(new URL("./fixtures/festival-routes-drik.json", import.meta.url), "utf8")) as {
  path: string;
  response: Record<string, unknown>;
}[];
const ADHIK_OWNED = new Set(["padmini-ekadashi", "parama-ekadashi"]);
let drikSky: Sky | null = null;
for (const c of drikCases) {
  test(`drik ${c.path} matches the server`, async () => {
    if (!drikSky) {
      drikSky = new Sky("drik", io);
      await drikSky.open();
    }
    const q = new URLSearchParams(c.path.split("?")[1]);
    const place = q.has("lat")
      ? { latitude: Number(q.get("lat")), longitude: Number(q.get("lon")), timeZone: q.get("timezone") ?? "" }
      : KATHMANDU_PLACE;
    const kind = c.path.includes("/holidays") ? "holidays" : "festivals";
    const make = kind === "holidays" ? holidayListingPayload : festivalListingPayload;
    const got = make({ sky: drikSky, surya: await surya() }, place, {
      year: Number(q.get("year")),
      era: q.get("era") ?? "bs",
      language: q.get("language") ?? undefined,
    });
    assert.ok(got);
    delete got.generated_at;
    delete got.hash;
    const strip = (p: Record<string, unknown>) => {
      const rows = (p[kind] as { id: string }[]).filter((f) => !ADHIK_OWNED.has(f.id));
      return { ...p, [kind]: rows, count: rows.length };
    };
    assert.deepEqual(strip(got), strip(c.response));
  });
}
