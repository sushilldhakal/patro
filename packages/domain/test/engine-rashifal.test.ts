// The scored rashifal (`/panchanga/rashifal`) made on the device against the server's recorded responses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar } from "../src/festivals/local-calendar";
/** Strict: text and structure exactly, numbers to 1e-4 (the scores are in -1..1, so the shared tolerance would hide everything). */
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
  return got === want ? null : `${path}: ${String(got).slice(0, 80)} vs ${String(want).slice(0, 80)}`;
}

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const surya = JSON.parse(readFileSync(new URL("apps/rust/tests/fixtures/http_golden_rashifal.json", root), "utf8")) as Case[];
const drikUrl = new URL("./fixtures/rashifal-drik.json.gz", import.meta.url);
const drikCases = existsSync(drikUrl) ? (JSON.parse(gunzipSync(readFileSync(drikUrl)).toString()) as Case[]) : [];
const PLACES = new Set(["1283240", "1282898", "5128581"]);

/** Drik: two days tied to four decimals can swap as best or weak day when a position differs by a millionth of a degree. */
function untie(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(untie);
  if (typeof v === "string") return v.replace(/(is |watch is )\d{4}-\d\d-\d\d/g, "$1#").replace(/दिन [^,।]*[,।]/g, "दिन #,");
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as object).filter(([k]) => k !== "best_day" && k !== "weak_day").map(([k, x]) => [k, untie(x)]));
  return v;
}

for (const system of ["surya", "drik"] as const) test(`the scored rashifal made on the device matches the server's (${system})`, async () => {
  const cases = system === "surya" ? surya : drikCases;
  const sunSky = new Sky("surya", io);
  await sunSky.open();
  const drik = new Sky("drik", io);
  await drik.open();
  const local = makeLocalCalendar({ loadSky: async (s) => (s === "surya" ? sunSky : drik), system: () => ({ system, ayanamsha: "lahiri" }), enabled: () => true });
  const failures: string[] = [];
  const kinds = new Set<string>();
  let checked = 0;
  for (const c of cases) {
    if (c.status !== 200 || !c.path.startsWith("/v1/panchanga/rashifal?")) continue;
    const q = new URLSearchParams(c.path.split("?")[1]);
    const city = q.get("city_id");
    if (!city || !PLACES.has(city)) continue;
    // Two ways of naming the day at once are the server's to sort out.
    if ((q.get("jd") && q.get("date")) || (q.get("year") && !q.get("day"))) continue;
    const got = await local.rashifal(
      { date: q.get("date") ?? undefined, inputEra: q.get("inputEra") ?? undefined, year: q.get("year") ? Number(q.get("year")) : undefined, month: q.get("month") ? Number(q.get("month")) : undefined, day: q.get("day") ? Number(q.get("day")) : undefined, jd: q.get("jd") ? Number(q.get("jd")) : undefined, era: q.get("era") ?? undefined, language: q.get("language") ?? undefined, period: q.get("period") ?? "daily" },
      { city_id: Number(city) },
    );
    assert.ok(got, `${c.path}: no answer`);
    checked += 1;
    kinds.add(q.get("period") ?? "daily");
    const err = system === "drik" ? diff("", untie(got), untie(JSON.parse(c.body))) : diff("", got, JSON.parse(c.body));
    if (err) failures.push(`${c.path}: ${err}`);
  }
  console.log("checked", checked, [...kinds]);
  assert.ok(checked >= 6 && kinds.size === 4, `checked ${checked}`);
  assert.equal(failures.length, 0, `${failures.length} differ:\n${failures.slice(0, 8).join("\n")}`);
});
