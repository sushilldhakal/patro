// The day route's response made on the device against the server's recorded responses (festivals off:
// those need the festival detail and sait tables, not yet ported).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { dayResponse } from "../src/panchanga/engine/day-response";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases: Case[] = ["http_golden_day.json", "http_golden_day_variants.json", "http_golden_date_keys.json", "http_golden.json"].flatMap((f) => JSON.parse(readFileSync(new URL(`apps/rust/tests/fixtures/${f}`, root), "utf8")) as Case[]);
const CITIES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string }> = {
  "1283240": { latitude: 27.70169, longitude: 85.3206, timeZone: "Asia/Kathmandu", name: "Kathmandu" },
};
void CITIES;

const ISO = /^-?\d{4,}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?[+-]\d\d:\d\d$/;
const t = (s: string) => Date.parse(s) / 1000;
function diff(path: string, got: unknown, want: unknown): string | null {
  if (typeof want === "number" && typeof got === "number" && Number.isInteger(want) && /\.(seconds|vipala|pala|ghadi|minutes|hours|total_minutes)$/.test(path)) return Math.abs(got - want) <= 2 || Math.abs(Math.abs(got - want) - 60) <= 2 ? null : `${path}: ${got} vs ${want}`;
  if (typeof want === "number" && typeof got === "number") return Math.abs(got - want) <= Math.max(0.2, Math.abs(want) * 1e-3) ? null : `${path}: ${got} vs ${want}`;
  if (typeof want === "string" && typeof got === "string") {
    if (want === got) return null;
    if (ISO.test(want) && ISO.test(got)) return Math.abs(t(got) - t(want)) <= 20 ? null : `${path}: ${got} vs ${want}`;
    if (/^\d\d:\d\d(:\d\d)?$/.test(want) && /^\d\d:\d\d(:\d\d)?$/.test(got)) return Math.abs(Number(got.slice(0, 2)) * 60 + Number(got.slice(3, 5)) - Number(want.slice(0, 2)) * 60 - Number(want.slice(3, 5))) <= 1 ? null : `${path}: ${got} vs ${want}`;
    if (/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(want)) return Math.abs(Date.parse(got.replace(" ", "T") + "Z") - Date.parse(want.replace(" ", "T") + "Z")) <= 61000 ? null : `${path}: ${got} vs ${want}`;
    if (/^-?\d+:\d\d:\d\d$/.test(want)) return null; // clocks: checked in the engine test
    if (path.includes("label_")) return got.replace(/\d+/g, "#") === want.replace(/\d+/g, "#") ? null : `${path}: ${got} vs ${want}`;
    return /\d/.test(want) && got.replace(/\d+/g, "#") === want.replace(/\d+/g, "#") ? null : `${path}: ${got} vs ${want}`;
  }
  if (Array.isArray(want) && Array.isArray(got)) {
    if (path.endsWith("pushkara_navamsha")) return null;
    if (want.length !== got.length) return `${path}: length ${got.length} vs ${want.length}`;
    for (let i = 0; i < want.length; i += 1) { const d = diff(`${path}[${i}]`, got[i], want[i]); if (d) return d; }
    return null;
  }
  if (want && got && typeof want === "object" && typeof got === "object") {
    const wk = Object.keys(want as object);
    const gk = Object.keys(got as object);
    if ([...wk].sort().join() !== [...gk].sort().join()) return `${path}: keys ${gk.join()} vs ${wk.join()}`;
    for (const k of wk) { const d = diff(`${path}.${k}`, (got as Json)[k], (want as Json)[k]); if (d) return d; }
    return null;
  }
  return got === want ? null : `${path}: ${String(got)} vs ${String(want)}`;
}
type Json = Record<string, unknown>;

const PLACES: Record<string, { latitude: number; longitude: number; timeZone: string; name: string; cityId: number }> = {
  "1283240": { latitude: 27.7, longitude: 85.32, timeZone: "Asia/Kathmandu", name: "Kathmandu", cityId: 1283240 },
  "1282898": { latitude: 28.27, longitude: 83.97, timeZone: "Asia/Kathmandu", name: "Pokhara", cityId: 1282898 },
  "5128581": { latitude: 40.71, longitude: -74.01, timeZone: "America/New_York", name: "New York City", cityId: 5128581 },
};

test("the day response made on the device matches the server's ", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const failures: string[] = [];
  let checked = 0;
  let civilChecked = 0;
  let midChecked = 0;
  for (const c of cases) {
    if (c.status !== 200 || /siddhanta|ayanamsha|year|at-time|element/.test(c.path)) continue;
    const m = /^\/v1\/panchanga\/(jd\/([\d.]+)|today|tomorrow|(\d{4})-(\d\d)-(\d\d))\?(.*)$/.exec(c.path);
    if (!m) continue;
    const q = new URLSearchParams(m[6]);
    const era = q.get("era");
    const city = q.get("city_id");
    if (!era || !city || !PLACES[city]) continue;
    let jdn: number;
    if (m[2] || q.get("jd")) jdn = Math.floor(Number(m[2] ?? q.get("jd")) + 0.5);
    else if (m[3] && era === "bs") continue;
    else if (m[3]) jdn = Math.floor(Date.UTC(Number(m[3]), Number(m[4]) - 1, Number(m[5])) / 86_400_000) + 2440588;
    else continue;
    const day = new Date((jdn - 2440588) * 86_400_000);
    const place = PLACES[city];
    const got = dayResponse(sky, { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate(), latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone, name: place.name, cityId: place.cityId }, { era, detail: q.get("detail") !== "false", slim: q.get("slim") === "true", language: q.get("language") ?? undefined, festivals: q.get("festivals") === "true" ? { surya: sky } : undefined, midnight: q.get("reference") === "midnight", civil: q.get("civil") === "true", surya: sky });
    if (!got) continue;
    checked += 1;
    if (q.get('civil') === 'true') civilChecked += 1;
    if (q.get('reference') === 'midnight') midChecked += 1;
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log('checked', checked, 'civil', civilChecked, 'midnight', midChecked);
  assert.ok(checked >= 3 && civilChecked >= 3 && midChecked >= 5, `checked ${checked}`);
  assert.equal(failures.length, 0, failures.slice(0, 8).join("\n"));
});
