// The client festival engine against the server's festival lists (the Rust golden file, Surya
// Siddhanta, Kathmandu and New York) and against the dates the owner stated for the adhik and
// kshaya months of BS 2039 and BS 2085. It reads only the bundled sky files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { Sky, type SkyIo } from "../src/astronomy/sky";
import { isoFromJdn, type PatroObserver } from "../src/astronomy/lunar-month";
import {
  computeFestivalDates,
  festivalObserver,
  festivalsForDay,
  generateBsFestivals,
  generateFestivals,
  rule,
  type FestivalContext,
} from "../src/festivals/festival-engine";

const root = new URL("../../../", import.meta.url);
const file = (name: string) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${name}.bin`, root)));
const io: SkyIo = {
  bundled: async (name) => file(name),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("the bundled years need no server");
  },
};

interface Loc {
  lat: number;
  lon: number;
  timezone: string;
  name: string;
}
type Row = Record<string, unknown>;
const golden = JSON.parse(
  readFileSync(new URL("apps/rust/crates/festivals/tests/fixtures/festival_golden.json", root), "utf8"),
) as {
  bs_years: { bs_year: number; location: Loc; festivals: Row[] }[];
  gregorian_years: { year: number; location: Loc; festivals: Row[] }[];
  days: { date: string; festivals: Row[] }[];
};

let surya: Sky | null = null;
async function ctxAt(loc: Loc): Promise<FestivalContext> {
  if (!surya) {
    surya = new Sky("surya", io);
    await surya.open();
  }
  const observer: PatroObserver = { sky: surya, latitude: loc.lat, longitude: loc.lon, timeZone: loc.timezone };
  return { observer, surya };
}
const KATHMANDU: Loc = { lat: 27.7172, lon: 85.324, timezone: "Asia/Kathmandu", name: "Kathmandu" };

/** Python drops the lunar festivals of a masa a kshaya lunation swallows; the owner's rule moves them (checked below). */
const LOST_MASA: Record<number, string> = { 2039: "Magh", 2085: "Poush" };
const withoutLost = (bsYear: number, list: Row[]) =>
  list.filter((f) => {
    const r = rule(String(f.id));
    return !(LOST_MASA[bsYear] && r.type === "lunar" && r.lunar_month === LOST_MASA[bsYear]);
  });

function compare(what: string, got: Row[], want: Row[]) {
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i += 1) {
    assert.equal(JSON.stringify(got[i]), JSON.stringify(want[i]), `${what} row ${i}`);
  }
  assert.equal(got.length, want.length, `${what}: count; got ${got.map((f) => f.id).join(",")}`);
}

test("the rule copies match the server's", () => {
  for (const name of ["festival_rules_v3", "public_holidays_v1", "holiday_overrides_v1", "month_type_rules_v1"]) {
    const ours = readFileSync(new URL(`packages/domain/src/festivals/rules/${name}.json`, root), "utf8");
    const server = readFileSync(new URL(`apps/rust/rules/${name}.json`, root), "utf8");
    assert.equal(ours, server, `${name}.json drifted from apps/rust/rules; copy it again`);
  }
});

for (const c of golden.bs_years) {
  test(`BS ${c.bs_year} ${c.location.name}: the year's festivals match the server`, async () => {
    const ctx = await ctxAt(c.location);
    compare(`BS ${c.bs_year}`, withoutLost(c.bs_year, generateBsFestivals(ctx, c.bs_year) as unknown as Row[]), withoutLost(c.bs_year, c.festivals));
  });
}

for (const c of golden.gregorian_years) {
  test(`AD ${c.year} ${c.location.name}: the year's festivals match the server`, async () => {
    const ctx = await ctxAt(c.location);
    const local = { ...ctx, observer: festivalObserver(ctx.observer) };
    compare(`AD ${c.year}`, generateFestivals(local, c.year) as unknown as Row[], c.festivals);
  });
}

test("a year of days in BS 2083: each day's festivals match the server", async () => {
  const all = generateBsFestivals(await ctxAt(KATHMANDU), 2083);
  for (const c of golden.days) compare(c.date, festivalsForDay(all, c.date) as unknown as Row[], c.festivals);
});

async function start(id: string, year: number): Promise<string | null> {
  const dates = computeFestivalDates(await ctxAt(KATHMANDU), rule(id), id, year);
  return dates ? isoFromJdn(dates[0]) : null;
}

test("BS 2039: lost Magha's festivals follow into Adhik Phalguna", async () => {
  assert.equal(await start("swasthani-brata-arambha", 1983), "1983-01-28");
  assert.equal(await start("saraswati-puja", 1983), "1983-02-18");
  assert.equal(await start("swasthani-brata-samapti", 1983), "1983-02-26");
  assert.equal(await start("magh-purnima", 1983), "1983-02-27");
  assert.ok(await start("saraswati-puja", 1982));
  assert.ok(await start("saraswati-puja", 1984));
});

test("BS 2085: lost Poush skips the Swasthani opening", async () => {
  assert.equal(await start("swasthani-brata-arambha", 2029), null);
  assert.ok(await start("swasthani-brata-arambha", 2028));
  assert.ok(await start("magh-purnima", 2029));
  assert.ok(await start("swasthani-brata-samapti", 2029));
});

test("the adhik months own Padmini and Parama", async () => {
  assert.equal(await start("padmini-ekadashi", 2028), "2028-10-28");
  assert.equal(await start("parama-ekadashi", 2028), "2028-11-12");
  assert.equal(await start("padmini-ekadashi", 2027), null);
});

