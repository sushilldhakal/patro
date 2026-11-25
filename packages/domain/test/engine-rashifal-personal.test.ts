// The personal rashifal and the janma lookup made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar } from "../src/festivals/local-calendar";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases = JSON.parse(readFileSync(new URL("apps/rust/tests/fixtures/http_golden_rashifal_personal.json", root), "utf8")) as Case[];
const PLACES = new Set(["1283240", "1282898", "5128581"]);
/** Strict: text and structure exactly, numbers to 1e-4. */
function diff(path: string, got: unknown, want: unknown): string | null {
  if (typeof want === "number" && typeof got === "number") return Math.abs(got - want) <= 1e-4 + Math.abs(want) * 1e-9 ? null : `${path}: ${got} vs ${want}`;
  if (Array.isArray(want) && Array.isArray(got)) {
    if (want.length !== got.length) return `${path}: length ${got.length} vs ${want.length}`;
    for (let i = 0; i < want.length; i += 1) { const d = diff(`${path}[${i}]`, got[i], want[i]); if (d) return d; }
    return null;
  }
  if (want && got && typeof want === "object" && typeof got === "object") {
    const wk = Object.keys(want as object).sort();
    const gk = Object.keys(got as object).sort();
    if (wk.join() !== gk.join()) return `${path}: keys ${gk.join()} vs ${wk.join()}`;
    for (const k of wk) { const d = diff(`${path}.${k}`, (got as Record<string, unknown>)[k], (want as Record<string, unknown>)[k]); if (d) return d; }
    return null;
  }
  // A dasha boundary moves by hours with the arcseconds the Moon differs by (see natalLongitudes), more for a 20-year lord.
  if (typeof want === "string" && typeof got === "string" && /^\d{4}-\d\d-\d\dT/.test(want)) {
    return Math.abs(Date.parse(got) - Date.parse(want)) <= 12 * 3_600_000 && got.slice(-6) === want.slice(-6) ? null : `${path}: ${got} vs ${want}`;
  }
  return got === want ? null : `${path}: ${String(got).slice(0, 80)} vs ${String(want).slice(0, 80)}`;
}

test("the personal rashifal and janma made on the device match the server's", async () => {
  const sky = new Sky("surya", io);
  await sky.open();
  const local = makeLocalCalendar({ loadSky: async () => sky, system: () => ({ system: "surya", ayanamsha: "lahiri" }), enabled: () => true });
  const failures: string[] = [];
  let personal = 0;
  let janma = 0;
  // The recorded answers were made in late November 2026; the running dasha is the same anywhere in that stretch.
  const asOfJd = Date.UTC(2026, 10, 21, 12) / 86_400_000 + 2_440_587.5;
  for (const c of cases) {
    if (c.status !== 200) continue;
    const q = new URLSearchParams(c.path.split("?")[1]);
    const birthEra = q.get("birth_era");
    if (!birthEra || !q.get("birth_year")) continue; // the older birth= form is the server's
    const birth = { era: birthEra, year: Number(q.get("birth_year")), month: Number(q.get("birth_month")), day: Number(q.get("birth_day")), clock: q.get("birth_clock") ?? undefined, tz: q.get("birth_tz") ?? "Asia/Kathmandu" };
    let got: Record<string, unknown> | null;
    if (c.path.startsWith("/v1/panchanga/rashifal/janma")) {
      got = await local.janma({ birth, era: q.get("era") ?? undefined, language: q.get("language") ?? undefined });
      janma += 1;
    } else {
      const city = q.get("city_id");
      if (city && !PLACES.has(city)) continue;
      got = await local.personalRashifal(
        { date: q.get("date") ?? undefined, year: q.get("year") ? Number(q.get("year")) : undefined, month: q.get("month") ? Number(q.get("month")) : undefined, day: q.get("day") ? Number(q.get("day")) : undefined, era: q.get("era") ?? undefined, language: q.get("language") ?? undefined, period: q.get("period") ?? "daily", birth, birthLat: Number(q.get("birth_lat")), birthLon: Number(q.get("birth_lon")), asOfJd },
        city ? { city_id: Number(city) } : undefined,
      );
      personal += 1;
    }
    if (!got) { failures.push(`${c.path}: no answer`); continue; }
    const err = diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("personal", personal, "janma", janma);
  assert.ok(personal >= 6 && janma >= 3, `checked ${personal} ${janma}`);
  assert.equal(failures.length, 0, `${failures.length} differ:\n${failures.slice(0, 8).join("\n")}`);
});
