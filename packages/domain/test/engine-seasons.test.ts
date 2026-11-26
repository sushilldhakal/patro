// The seasons page made on the device against the server's recorded responses ("now" pinned as there).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { tropicalSeasons } from "../src/panchanga/engine/seasons";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string | Record<string, unknown> };
const cases = JSON.parse(readFileSync(new URL("apps/rust/tests/fixtures/http_golden_seasons.json", root), "utf8")) as Case[];
const NOW = Date.UTC(2026, 10, 15, 6, 30, 0, 123.456) / 86_400_000 + 2_440_587.5;

test("tropical seasons made on the device match the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  for (const c of cases) {
    // The apps never send era= here; the server would add era/language for it.
    if (c.path.includes("era=")) continue;
    checked += 1;
    const want = (typeof c.body === "string" ? JSON.parse(c.body) : c.body) as { timezone: string; latitude: number };
    const got = tropicalSeasons(sky, { latitude: want.latitude, timeZone: want.timezone }, NOW);
    const err = diff("", got, want);
    if (err) failures.push(`${c.path}: ${err}`);
  }
  assert.equal(checked, 7);
  assert.equal(failures.length, 0, failures.join("\n"));
});
