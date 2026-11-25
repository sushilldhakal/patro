// The printable patro month made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar } from "../src/festivals/local-calendar";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases = JSON.parse(readFileSync(new URL("apps/rust/tests/fixtures/http_golden_nepal_patro.json", root), "utf8")) as Case[];

test("the patro month made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const local = makeLocalCalendar({ loadSky: async () => sky, system: () => ({ system: "surya", ayanamsha: "lahiri" }), enabled: () => true });
  const failures: string[] = [];
  let checked = 0;
  for (const c of cases) {
    const m = /^\/v1\/nepal\/patro\/(\d+)\/(\d+)\?(.*)$/.exec(c.path);
    if (!m || c.status !== 200) continue;
    const q = new URLSearchParams(m[3]);
    if ((q.get("format") ?? "patro") !== "patro" || q.get("output") === "text" || q.get("era")) continue;
    const city = q.get("city_id");
    const got = await local.patro({ year: Number(m[1]), month: Number(m[2]) }, city ? { city_id: Number(city) } : undefined);
    if (!got) continue;
    checked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", checked);
  assert.ok(checked >= 2);
  assert.equal(failures.length, 0, failures.slice(0, 10).join("\n"));
});
