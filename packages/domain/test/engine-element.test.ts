// The element routes made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { elementDay, elementMonth, elementSpans, elementsList, eraMonthWindow } from "../src/panchanga/engine/element";
import { bsToJdn, civilFromJdn, jdnFromIso } from "../src/astronomy/lunar-month";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases = ["http_golden_identity.json", "http_golden_catalog.json"].flatMap((f) => (JSON.parse(readFileSync(new URL(`apps/rust/tests/fixtures/${f}`, root), "utf8")) as Case[]).filter((c) => c.path));
const PLACES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string; cityId: number }> = {
  "1283240": { latitude: 27.7, longitude: 85.32, timeZone: "Asia/Kathmandu", name: "Kathmandu", cityId: 1283240 },
  "1282898": { latitude: 28.27, longitude: 83.97, timeZone: "Asia/Kathmandu", name: "Pokhara", cityId: 1282898 },
  "5128581": { latitude: 40.71, longitude: -74.01, timeZone: "America/New_York", name: "New York City", cityId: 5128581 },
};

test("the element routes made on the device match the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  assert.deepEqual(elementsList(), JSON.parse(cases.find((c) => c.path === "/v1/panchanga/elements")?.body ?? "null"));
  const failures: string[] = [];
  const seen = new Set<string>();
  let day = 0, month = 0, spans = 0;
  for (const c of cases) {
    if (c.status !== 200 || seen.has(c.path)) continue;
    seen.add(c.path);
    const m = /^\/v1\/panchanga\/element\/([a-z-]+)\/(day|month|spans)(?:\/([^?]*))?\?(.*)$/.exec(c.path);
    if (!m) continue;
    const q = new URLSearchParams(m[4]);
    const place = PLACES[q.get("city_id") ?? ""];
    if (!place) continue;
    let got: Record<string, unknown> | null = null;
    if (m[2] === "day") {
      const era = q.get("era") ?? "ad";
      const jdn = era === "ad" ? jdnFromIso(m[3]) : bsToJdn(...(m[3].split("-").map(Number) as [number, number, number]));
      if (jdn === null) continue;
      const d = civilFromJdn(jdn);
      got = elementDay(sky, m[1], { year: d.year, month: d.month, day: d.day, ...place }, { era, language: q.get("language") ?? undefined });
      day += 1;
    } else if (m[2] === "month") {
      const [y, mo] = m[3].split("/").map(Number);
      got = elementMonth(sky, m[1], y, mo, place);
      month += 1;
    } else {
      const window = q.get("start_jd") ? ([Number(q.get("start_jd")), Number(q.get("end_jd"))] as [number, number]) : eraMonthWindow(q.get("era") ?? "", Number(q.get("year")), Number(q.get("month")));
      if (!window) continue;
      got = elementSpans(sky, m[1], window[0], window[1], place, q.get("era") ? { era: q.get("era") as string, language: q.get("language") ?? undefined } : undefined);
      spans += 1;
    }
    assert.ok(got, c.path);
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", { day, month, spans });
  assert.ok(day >= 4 && month >= 3 && spans >= 5);
  assert.equal(failures.length, 0, failures.slice(0, 10).join("\n"));
});
