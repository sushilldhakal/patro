// The Gregorian month grids (`/panchanga/ad/{y}/{m}`, `bc`) made on the device against the server's recorded months.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar } from "../src/festivals/local-calendar";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const recorded = JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/greg-surya.json.gz", import.meta.url))).toString()) as Case[];
const cases: Case[] = [...["http_golden_year.json", "http_golden_civil_month.json"].flatMap((f) => JSON.parse(readFileSync(new URL(`apps/rust/tests/fixtures/${f}`, root), "utf8")) as Case[]), ...recorded];

test("the Gregorian month grids made on the device match the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const local = makeLocalCalendar({ loadSky: async () => sky, system: () => ({ system: "surya", ayanamsha: "lahiri" }), enabled: () => true });
  const failures: string[] = [];
  let checked = 0;
  let outside = 0;
  for (const c of cases) {
    const m = /^\/v1\/panchanga\/(ad|bc)\/(\d+)\/(\d+)\?(.*)$/.exec(c.path);
    if (!m || c.status !== 200) continue;
    const q = new URLSearchParams(m[4]);
    if (q.get("clock")) continue;
    // The device always names the era; a recorded full month asked without one is not rendered for it.
    if (q.get("full") === "true" && !q.get("era")) continue;
    const city = q.get("city_id");
    const got = await local.month({ year: Number(m[2]), month: Number(m[3]), era: m[1], language: q.get("language") ?? undefined, excludeInternational: q.get("exclude_international") === "true", full: q.get("full") === "true", slim: q.get("slim") === "true" }, city ? { city_id: Number(city) } : undefined);
    if (!got) { outside += 1; continue; }
    if (!q.get("era")) delete (got as Record<string, unknown>).language;
    checked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", checked, "left to the server (outside the carried years)", outside);
  assert.ok(checked >= 20, `checked ${checked}`);
  assert.equal(failures.length, 0, failures.slice(0, 8).join("\n"));
});
