// The kundali routes made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { dashaExpand, kundaliDayRoute, milanRoute, momentJd, planetaryPositions, shadbalaRoute, vimshottari, type KundaliPlace } from "../src/jyotish/kundali/engine";
import { kundaliDetail, kundaliReport } from "../src/jyotish/kundali/detail-engine";
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

test("the kundali detail made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  // The goldens pin "now" at 2026-11-15T06:30:00.123456Z.
  const nowJd = Date.UTC(2026, 10, 15, 6, 30, 0, 123) / 86_400_000 + 2440587.5;
  const failures: string[] = [];
  let checked = 0;
  for (const c of load("kundali_detail")) {
    if (c.status !== 200) continue;
    const q = new URLSearchParams(c.path.split("?")[1]);
    const r = requestOf(q);
    if (!r) continue;
    const got = kundaliDetail(sky, r.jd, r.place, nowJd, {
      era: q.get("era") ?? undefined,
      language: q.get("language") ?? undefined,
      date: q.has("year") ? `${q.get("year")}-${String(q.get("month")).padStart(2, "0")}-${String(q.get("day")).padStart(2, "0")}` : undefined,
    }) as Record<string, unknown> | null;
    checked += 1;
    if (!got) {
      failures.push(`${c.path}: null`);
      continue;
    }
    const want = JSON.parse(c.body) as Record<string, unknown>;
    // Degree-minute-second parts drift by a few arcseconds (the lagna from the fitted sky moves 15″ a second):
    // compare the total within 30″, then drop them.
    const dmsDrift = (g: unknown, w: unknown, path: string): void => {
      if (Array.isArray(w) && Array.isArray(g)) w.forEach((x, i) => dmsDrift(g[i], x, `${path}[${i}]`));
      else if (w && g && typeof w === "object" && typeof g === "object") {
        const wo = w as Record<string, unknown>;
        const go = g as Record<string, unknown>;
        if ("rashiNum" in wo && "sec" in wo) {
          const arc = (d: Record<string, unknown>) => ((d.rashiNum as number) * 30 + (d.deg as number)) * 3600 + (d.min as number) * 60 + (d.sec as number);
          if (Math.abs(arc(go) - arc(wo)) > 30) failures.push(`${c.path}: ${path} ${JSON.stringify(go)} vs ${JSON.stringify(wo)}`);
          Object.assign(go, wo);
          return;
        }
        for (const k of Object.keys(wo)) dmsDrift(go[k], wo[k], `${path}.${k}`);
      }
    };
    dmsDrift(got, want, "");
    for (const [k, w] of Object.entries(want)) {
      const g = got[k];
      if (k === "dasha" || k === "tribhagiDasha" || k === "yoginiDasha") continue; // dates move with the server's 10 s Moon steps; checked below
      if (k === "birthMeta") {
        // The server lays out Sunday's choghadiya for every birth (it reads a weekday key the block does not have).
        const { choghadiyaAtBirth: _a, ...gw } = g as Record<string, unknown>;
        const { choghadiyaAtBirth: _b, ...ww } = w as Record<string, unknown>;
        const e = diff(`.${k}`, gw, ww);
        if (e) failures.push(`${c.path}: ${e}`);
        continue;
      }
      const e = diff(`.${k}`, g, w);
      if (e) failures.push(`${c.path}: ${e}`);
    }
    for (const k of ["dasha", "tribhagiDasha", "yoginiDasha"]) {
      const g = got[k] as { sequence: unknown[]; tree: unknown[]; mahadasha_lord: string; balance_years: number };
      const w = want[k] as typeof g;
      if (g.mahadasha_lord !== w.mahadasha_lord || g.sequence.length !== w.sequence.length || g.tree.length !== w.tree.length || Math.abs(g.balance_years - w.balance_years) > 1e-3 * Math.max(1, w.balance_years)) {
        failures.push(`${c.path}: ${k} lord ${g.mahadasha_lord}/${w.mahadasha_lord} sequence ${g.sequence.length}/${w.sequence.length} tree ${g.tree.length}/${w.tree.length} balance ${g.balance_years}/${w.balance_years}`);
      }
    }
  }
  console.log("checked detail", checked);
  assert.ok(checked >= 8);
  assert.equal(failures.length, 0, failures.slice(0, 15).join("\n"));
});

test("milan made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  for (const c of load("kundali_basic")) {
    if (c.status !== 200 || !c.path.startsWith("/v1/kundali/milan")) continue;
    const q = new URLSearchParams(c.path.split("?")[1]);
    const person = (who: string) => {
      const n = (k: string) => (q.has(`${who}_${k}`) ? Number(q.get(`${who}_${k}`)) : undefined);
      return {
        moment: { jd: n("jd"), clock: q.get(`${who}_clock`) ?? undefined, datetime: q.get(`${who}_datetime`) ?? undefined, era: q.get(`${who}_era`) ?? undefined, year: n("year"), month: n("month"), day: n("day") },
        lat: n("lat"), lon: n("lon"), timezone: q.get(`${who}_timezone`) ?? undefined,
      };
    };
    const got = milanRoute(sky, person("boy"), person("girl"), q.get("lang") ?? "ne");
    checked += 1;
    const e = got ? diff("", got, JSON.parse(c.body)) : "null";
    if (e) failures.push(`${c.path}: ${e}`);
  }
  assert.ok(checked >= 4);
  assert.equal(failures.length, 0, failures.join("\n"));
});

test("the kundali report made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const nowJd = Date.UTC(2026, 10, 15, 6, 30, 0, 123) / 86_400_000 + 2440587.5;
  const failures: string[] = [];
  let checked = 0;
  for (const c of load("kundali_report")) {
    if (c.status !== 200) continue;
    const q = new URLSearchParams(c.path.split("?")[1]);
    const r = requestOf(q);
    if (!r) continue;
    const got = kundaliReport(sky, r.jd, r.place, nowJd, q.get("lang") ?? "ne");
    checked += 1;
    const want = c.body.trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    if (!got) {
      failures.push(`${c.path}: null`);
      continue;
    }
    // The dasha window moves hours with the server's 10 s Moon steps: within 12 h, then as usual.
    const gm = got[1]?.mahadasha as { window: string[] } | undefined;
    const wm = want[1]?.mahadasha as { window: string[] } | undefined;
    if (gm && wm) {
      wm.window.forEach((w, k) => {
        if (!(Math.abs(Date.parse(gm.window[k]) - Date.parse(w)) <= 12 * 3.6e6)) failures.push(`${c.path}: window ${gm.window[k]} vs ${w}`);
        gm.window[k] = w;
      });
    }
    for (const [i, w] of want.entries()) {
      const e = diff(`[${i}]`, got[i], w);
      if (e) failures.push(`${c.path}: ${e}`);
    }
    if (got.length !== want.length) failures.push(`${c.path}: ${got.length} records vs ${want.length}`);
  }
  console.log("checked report", checked);
  assert.ok(checked >= 8);
  assert.equal(failures.length, 0, failures.slice(0, 15).join("\n"));
});

test("the sunrise snapshot (/kundali/{date}) made on the device matches the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  for (const c of load("kundali_basic")) {
    const m = /^\/v1\/kundali\/(\d{4}-\d\d-\d\d)(?:\?(.*))?$/.exec(c.path);
    if (c.status !== 200 || !m) continue;
    const q = new URLSearchParams(m[2] ?? "");
    const place = PLACES[q.get("city_id") ?? "1283240"];
    if (!place) continue;
    const got = kundaliDayRoute(sky, place, m[1], q.get("era") ?? "bs", { era: q.get("era") ?? undefined, language: q.get("language") ?? undefined });
    checked += 1;
    const e = got ? diff("", got, JSON.parse(c.body)) : "null";
    if (e) failures.push(`${c.path}: ${e}`);
  }
  console.log("checked day", checked);
  assert.ok(checked >= 2);
  assert.equal(failures.length, 0, failures.join("\n"));
});
