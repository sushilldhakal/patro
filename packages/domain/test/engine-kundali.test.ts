// The kundali routes made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { dashaExpand, momentJd, planetaryPositions, shadbalaRoute, vimshottari, type KundaliPlace } from "../src/jyotish/kundali/engine";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const load = (name: string) => JSON.parse(readFileSync(new URL(`apps/rust/tests/fixtures/http_golden_${name}.json`, root), "utf8")) as Case[];
export const PLACES: Record<string, KundaliPlace> = {
  "1283240": { latitude: 27.7, longitude: 85.32, timeZone: "Asia/Kathmandu", name: "Kathmandu", cityId: 1283240 },
  "1282898": { latitude: 28.27, longitude: 83.97, timeZone: "Asia/Kathmandu", name: "Pokhara", cityId: 1282898 },
  "5128581": { latitude: 40.71, longitude: -74.01, timeZone: "America/New_York", name: "New York City", cityId: 5128581 },
  "2643743": { latitude: 51.51, longitude: -0.13, timeZone: "Europe/London", name: "London", cityId: 2643743 },
};

/** The place and moment a recorded path names, or null when the device would send it to the server. */
export function requestOf(q: URLSearchParams): { place: KundaliPlace; jd: number } | null {
  const place = q.get("city_id") ? PLACES[q.get("city_id") ?? ""] : q.has("lat") ? null : PLACES["1283240"];
  if (!place) return null;
  const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
  const jd = momentJd({ jd: num("jd"), clock: q.get("clock") ?? undefined, datetime: q.get("datetime") ?? undefined, era: q.get("era") ?? undefined, year: num("year"), month: num("month"), day: num("day") }, place.timeZone);
  return jd === null ? null : { place, jd };
}

test("planetary positions, vimshottari and dasha expansion made on the device match the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  const checked: Record<string, number> = {};
  for (const c of load("kundali_basic")) {
    if (c.status !== 200) continue;
    const [route, query] = c.path.split("?");
    const q = new URLSearchParams(query);
    let got: unknown = undefined;
    if (route === "/v1/kundali/dasha/expand") {
      got = dashaExpand({ lord: q.get("lord") ?? "", start: q.get("start") ?? "", end: q.get("end") ?? "", system: q.get("system") ?? undefined });
    } else if (route === "/v1/planetary/positions" || route === "/v1/kundali/vimshottari" || route === "/v1/shadbala") {
      const r = requestOf(q);
      if (!r) continue;
      const echo = { era: q.get("era") ?? undefined, language: q.get("language") ?? undefined };
      got =
        route === "/v1/planetary/positions"
          ? planetaryPositions(sky, r.jd, r.place, echo)
          : route === "/v1/shadbala"
            ? shadbalaRoute(sky, r.jd, r.place, echo)
            : vimshottari(sky, r.jd, r.place, Number(q.get("cycles") ?? 1), echo);
    } else continue;
    checked[route] = (checked[route] ?? 0) + 1;
    const want = JSON.parse(c.body);
    if (route === "/v1/kundali/vimshottari" && got) {
      // The server's Surya Moon steps in 10 s (a double-precision epoch); the device's does not, and
      // one arcsecond of Moon moves a dasha date ~1.8 h. Dates within 12 h, then the rest as usual.
      const g = got as { sequence: { start: string; end: string }[] };
      for (const [i, w] of (want.sequence as { start: string; end: string }[]).entries()) {
        for (const k of ["start", "end"] as const) {
          const hours = Math.abs(Date.parse(g.sequence[i]?.[k] ?? "") - Date.parse(w[k])) / 3.6e6;
          if (!(hours <= 12)) failures.push(`${c.path}: sequence[${i}].${k} ${g.sequence[i]?.[k]} vs ${w[k]}`);
          if (g.sequence[i]) g.sequence[i][k] = w[k];
        }
      }
    }
    const err = got ? diff("", got, want) : "null";
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", checked);
  assert.ok((checked["/v1/kundali/vimshottari"] ?? 0) >= 5 && (checked["/v1/planetary/positions"] ?? 0) >= 3 && (checked["/v1/kundali/dasha/expand"] ?? 0) >= 4 && (checked["/v1/shadbala"] ?? 0) >= 3);
  assert.equal(failures.length, 0, failures.slice(0, 10).join("\n"));
});
