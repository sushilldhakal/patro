// The sait listings made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar } from "../src/festivals/local-calendar";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases = JSON.parse(readFileSync(new URL("apps/rust/tests/fixtures/http_golden_sait.json", root), "utf8")) as Case[];
const PLACES = new Set(["1283240", "1282898", "5128581"]);

test("the sait listings made on the device match the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const local = makeLocalCalendar({ loadSky: async () => sky, system: () => ({ system: "surya", ayanamsha: "lahiri" }), enabled: () => true });
  const failures: string[] = [];
  let checked = 0;
  for (const c of cases) {
    if (c.status !== 200) continue;
    const m = /^\/v1\/nepal\/sait\/(\d+)\/(month\/(\d+)|[a-z-]+)\?(.*)$/.exec(c.path);
    const dm = /^\/v1\/nepal\/sait\/(\d+)\/([a-z-]+)\/(detail|personalize)\?(.*)$/.exec(c.path);
    if (dm) {
      const q = new URLSearchParams(dm[4]);
      const city = q.get("city_id");
      if (city && !PLACES.has(city)) continue;
      const place = city ? { city_id: Number(city) } : undefined;
      const num = (k: string) => (q.get(k) ? Number(q.get(k)) : undefined);
      const personalize = dm[3] === "personalize" ? { janmaNakshatra: num("janma_nakshatra"), janmaRashi: num("janma_rashi"), gender: q.get("gender") ?? undefined, moment: q.get("birth_era") ? { era: q.get("birth_era") as string, year: Number(q.get("birth_year")), month: Number(q.get("birth_month")), day: Number(q.get("birth_day")), clock: q.get("birth_clock") ?? undefined, tz: q.get("birth_tz") ?? "Asia/Kathmandu" } : undefined } : undefined;
      const got = await local.sait({ year: Number(dm[1]), category: dm[2], detail: dm[3] === "detail" ? { exclude: q.get("exclude")?.split(","), nakshatraMode: q.get("nakshatra_mode") ?? undefined } : undefined, personalize, era: q.get("era") ?? undefined, language: q.get("language") ?? undefined }, place);
      if (!got) { failures.push(`${c.path}: no answer`); continue; }
      checked += 1;
      const err = diff("", got, JSON.parse(c.body));
      if (err) failures.push(`${c.path}: ${err}`);
      continue;
    }
    if (!m || /about/.test(c.path)) continue;
    const q = new URLSearchParams(m[4]);
    const city = q.get("city_id");
    if (city && !PLACES.has(city)) continue;
    const got = await local.sait({ year: Number(m[1]), month: m[3] ? Number(m[3]) : undefined, category: m[3] ? undefined : m[2], era: q.get("era") ?? undefined, language: q.get("language") ?? undefined }, city ? { city_id: Number(city) } : undefined);
    if (!got) { failures.push(`${c.path}: no answer`); continue; }
    checked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", checked);
  assert.ok(checked >= 20, `checked ${checked}`);
  assert.equal(failures.length, 0, `${failures.length} differ:\n${failures.slice(0, 8).join("\n")}`);
});
