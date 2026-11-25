// Gochar and the graha detail routes made on the device against the server's recorded responses
// (Surya Siddhanta: the repo's goldens; Drik: the ones `record-extra.ts` made).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar } from "../src/festivals/local-calendar";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const goldens = (names: string[]): Case[] => names.flatMap((f) => JSON.parse(readFileSync(new URL(`apps/rust/tests/fixtures/${f}`, root), "utf8")) as Case[]);
const recorded = (name: string): Case[] => {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  return existsSync(url) ? (JSON.parse(gunzipSync(readFileSync(url)).toString()) as Case[]) : [];
};

const PLACES = new Set(["1283240", "1282898", "5128581"]);
/** A slow graha's entry time moves seconds with a millionth of a degree: the stored positions are that precise, no more. */
const noise = (err: string) => {
  // Where an event began is read at the search's start: an edge a few seconds off reads one step apart.
  if (/\.from_(nakshatra|nakshatra_ne|pada|pada_ne|rashi|rashi_ne): /.test(err)) return true;
  const m = /(?:entry_time_utc|\.iso): (\S+) vs (\S+)$/.exec(err);
  return Boolean(m && Math.abs(Date.parse(m[1]) - Date.parse(m[2])) <= 120_000);
};

async function answer(local: ReturnType<typeof makeLocalCalendar>, path: string): Promise<Record<string, unknown> | null | "skip"> {
  const [route, query = ""] = path.split("?");
  const q = new URLSearchParams(query);
  const city = q.get("city_id");
  if (city && !PLACES.has(city)) return "skip";
  const place = city ? { city_id: Number(city) } : undefined;
  const era = q.get("era") ?? undefined;
  const language = q.get("language") ?? undefined;
  let m: RegExpExecArray | null;
  // Year routes are stamped for an era the device is always told; ones asked without one are not the app's.
  if (/\/year\//.test(route) && !era && /graha-/.test(route)) return "skip";
  if ((m = /^\/v1\/nepal\/gochar\/jd\/([\d.]+)$/.exec(route))) return local.gochar({ jd: Number(m[1]), upcoming: q.get("upcoming") === "true", era, language }, place);
  if ((m = /^\/v1\/nepal\/gochar\/year\/(\d+)$/.exec(route))) return local.gochar({ year: Number(m[1]), era, language }, place);
  if (route === "/v1/nepal/gochar/ingress") {
    if (!q.get("from") || !q.get("to")) return "skip";
    return local.gochar({ from: q.get("from") as string, to: q.get("to") as string, level: q.get("level") ?? "pada", grahas: q.get("grahas") ?? undefined, era, language }, place);
  }
  if ((m = /^\/v1\/nepal\/gochar\/(\d{4}-\d\d-\d\d)$/.exec(route))) return local.gochar({ date: m[1], upcoming: q.get("upcoming") === "true", era, language }, place);
  if ((m = /^\/v1\/nepal\/graha-(asta|vakri)\/year\/(\d+)$/.exec(route))) return local.gochar({ graha: m[1] as "asta" | "vakri", year: Number(m[2]), era, language }, place);
  if ((m = /^\/v1\/nepal\/graha-sthiti\/(\d{4}-\d\d-\d\d)$/.exec(route))) return local.gochar({ sthiti: m[1], era, language }, place);
  return "skip";
}

for (const system of ["surya", "drik"] as const) {
  test(`gochar and graha detail made on the device match the server's (${system})`, async () => {
    const cases = system === "surya" ? goldens(["http_golden_gochar.json", "http_golden_graha_year.json", "http_golden_graha_sthiti.json"]) : recorded("gochar-drik.json.gz");
    if (system === "drik" && cases.length === 0) return;
    const surya = new Sky("surya", io);
    await surya.open();
    const drik = new Sky("drik", io);
    await drik.open();
    const local = makeLocalCalendar({ loadSky: async (s) => (s === "surya" ? surya : drik), system: () => ({ system, ayanamsha: "lahiri" }), enabled: () => true });
    const failures: string[] = [];
    let checked = 0;
    let gaps = 0;
    for (const c of cases) {
      if (c.status !== 200) continue;
      const got = await answer(local, c.path);
      if (got === "skip") continue;
      if (got === null) { gaps += 1; failures.push(`${c.path}: no answer`); continue; }
      checked += 1;
      const want = JSON.parse(c.body) as Record<string, unknown>;
      // Events a moment apart (an asta and a turn of one planet) come in either order.
      const tie = (e: Record<string, unknown>) => `${e.graha}|${e.level}|${e.event ?? e.motion ?? ""}|${e.to_pada ?? ""}|${e.to_rashi ?? ""}|${String(e.entry_time_utc).slice(0, 13)}`;
      for (const body of [got as Record<string, unknown>, want]) if (Array.isArray(body.events)) body.events = [...(body.events as Record<string, unknown>[])].sort((a, b) => (tie(a) < tie(b) ? -1 : 1));
      const err = diff("", got, want);
      if (err && !noise(err)) failures.push(`${c.path}: ${err}`);
    }
    console.log(system, "checked", checked, "no answer", gaps);
    assert.ok(checked >= 8, `checked ${checked}`);
    assert.equal(failures.length, 0, `${failures.length} differ:\n${failures.slice(0, 10).join("\n")}`);
  });
}
