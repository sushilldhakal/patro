// The shared day engine against the server's recorded daily payloads (Python, via the Rust goldens).
// Every key the engine makes must match: names and numbers exactly, instants and clocks within a few
// seconds (the text's positions move in ten-second steps), floats within a small tolerance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { buildDay, DAY_BLOCKS } from "../src/panchanga/engine/day";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = {
  bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("bundled");
  },
};
const golden = JSON.parse(readFileSync(new URL("apps/rust/crates/panchanga/tests/fixtures/daily_golden.json", root), "utf8")) as {
  date: string;
  location: { lat: number; lon: number; timezone: string; name: string; city_id: number | null };
  payload: Record<string, unknown>;
}[];

const ISO = /^-?\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?[+-]\d\d:\d\d$/;
const CLOCK = /^-?\d+:\d\d:\d\d$/;
const secs = (s: string) => (CLOCK.test(s) ? s.split(":").reduce((a, v) => a * 60 + Number(v), 0) : Date.parse(s) / 1000);
/** Texts that differ only by digits a second or so apart ("10 Hours 59 Mins 04 Secs"). */
const closeText = (a: string, b: string) => {
  if (a.replace(/\d+/g, "#") !== b.replace(/\d+/g, "#")) return false;
  const x = a.match(/\d+/g) ?? [];
  const y = b.match(/\d+/g) ?? [];
  return x.every((v, i) => Math.abs(Number(v) - Number(y[i])) <= 1 || Math.abs(Number(v) - Number(y[i])) === 59);
};
/** ghati:pala:vipala (a ghati is 24 minutes, a pala 24 seconds, a vipala 0.4 second). */
const ghatiSecs = (s: string) => {
  const [g, p, v] = s.split(":").map(Number);
  return g * 1440 + p * 24 + v * 0.4;
};
const FUZZY_INTS = new Set(["seconds", "vipala", "minutes", "total_minutes", "pala", "ghadi", "hours"]);
const HM = /^\d\d:\d\d(:\d\d)?$/;

function diff(path: string, got: unknown, want: unknown, tol: number): string | null {
  if (typeof want === "number" && typeof got === "number") {
    if (Number.isInteger(want) && Number.isInteger(got)) {
      const fuzzy = FUZZY_INTS.has(path.split(".").pop() ?? "") ? 2 : 0;
      const wrap = (path.endsWith("vipala") || path.endsWith("seconds")) ? Math.abs(Math.abs(want - got) - 60) <= 2 : false;
      return Math.abs(want - got) <= fuzzy || wrap ? null : `${path}: ${got} vs ${want}`;
    }
    return Math.abs(got - want) <= Math.max(0.01, Math.abs(want) * 1e-3) ? null : `${path}: ${got} vs ${want}`;
  }
  if (typeof want === "string" && typeof got === "string") {
    if (want === got) return null;
    if (ISO.test(want) && ISO.test(got)) return Math.abs(secs(got) - secs(want)) <= tol ? null : `${path}: ${got} vs ${want}`;
    if (CLOCK.test(want) && CLOCK.test(got)) {
      const f = path.includes("ghati") ? ghatiSecs : secs;
      return Math.abs(f(got) - f(want)) <= tol ? null : `${path}: ${got} vs ${want}`;
    }
    if (HM.test(want) && HM.test(got)) {
      const m = (v: string) => v.split(":").slice(0, 2).reduce((a, x) => a * 60 + Number(x), 0);
      return Math.abs(m(got) - m(want)) <= 1 ? null : `${path}: ${got} vs ${want}`;
    }
    if (path.includes("label_") && closeText(got, want)) return null;
    return `${path}: ${got} vs ${want}`;
  }
  if (Array.isArray(want) && Array.isArray(got)) {
    if (want.length !== got.length) return `${path}: length ${got.length} vs ${want.length}`;
    for (let i = 0; i < want.length; i += 1) {
      const d = diff(`${path}[${i}]`, got[i], want[i], tol);
      if (d) return d;
    }
    return null;
  }
  if (want && got && typeof want === "object" && typeof got === "object") {
    const wk = Object.keys(want as object);
    const gk = Object.keys(got as object);
    if (wk.join() !== gk.join()) return `${path}: keys ${gk.join()} vs ${wk.join()}`;
    for (const k of wk) {
      const d = diff(`${path}.${k}`, (got as Record<string, unknown>)[k], (want as Record<string, unknown>)[k], tol);
      if (d) return d;
    }
    return null;
  }
  return got === want ? null : `${path}: ${String(got)} vs ${String(want)}`;
}

let sky: Sky | null = null;
test("the shared day engine matches the server's day payload for every block it makes", async () => {
  sky ??= new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  for (const c of golden) {
    const [y, m, d] = c.date.split("-").map(Number);
    const got = buildDay(sky, { year: y, month: m, day: d, latitude: c.location.lat, longitude: c.location.lon, timeZone: c.location.timezone, name: c.location.name, ...(c.location.city_id ? { cityId: c.location.city_id } : {}) });
    if (!got) {
      if (y < 1970) continue;
      failures.push(`${c.date} ${c.location.name}: no day`);
      continue;
    }
    for (const key of DAY_BLOCKS) {
      if (!(key in c.payload)) continue;
      const d2 = diff(key, got[key], c.payload[key], 20);
      if (d2) failures.push(`${c.date} ${c.location.name} ${d2}`);
    }
  }
  assert.equal(failures.length, 0, `${failures.length} differences:\n${failures.slice(0, 25).join("\n")}`);
});
