// The Drik routes made on the device (the Drik sky, in the reader's Lahiri ayanamsha) against the Rust server's
// recorded `siddhanta=drik` answers. Record them with `test/record-drik-goldens.ts` (it needs a local server).
// Differences below the printed precision (a pala rollover, a sign on a value near zero) are not failures.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar, type LocalCalendar } from "../src/festivals/local-calendar";
import { diff } from "./golden-diff";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Case = { path: string; status: number; body: string };
const cases = JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/drik-golden.json.gz", import.meta.url))).toString()) as Case[];

/** Noise the server's own rounding makes: not a different answer. */
const noise = (err: string) =>
  /\.vipala: \d+ vs \d+$/.test(err) ||
  /akshamsha\.sign: (rin vs dhan|dhan vs rin)$/.test(err) ||
  // A segment ending within seconds of UTC midnight: the two sides' few-second drift puts it on either
  // side, and `spans_midnight` (UTC, on both) appears on one only. No screen reads it.
  spansMidnightOnly(err);

function spansMidnightOnly(err: string): boolean {
  const m = /: keys (\S+) vs (\S+)$/.exec(err);
  if (!m) return false;
  const strip = (keys: string) => keys.split(",").filter((k) => k !== "spans_midnight").join(",");
  return m[1] !== m[2] && strip(m[1]) === strip(m[2]);
}

async function answer(local: LocalCalendar, path: string): Promise<Record<string, unknown> | null | "skip"> {
  const [route, query = ""] = path.split("?");
  const q = new URLSearchParams(query);
  const city = q.get("city_id");
  const place = city ? { city_id: Number(city) } : undefined;
  const era = q.get("era") ?? "bs";
  const language = q.get("language") ?? undefined;
  let m: RegExpExecArray | null;
  if ((m = /^\/v1\/panchanga\/(\d{4}-\d\d-\d\d)$/.exec(route))) {
    return local.day({ date: m[1], era, language, detail: q.get("detail") !== "false", slim: q.get("slim") === "true", festivals: q.get("festivals") === "true", midnight: q.get("reference") === "midnight", civil: q.get("civil") === "true" }, place);
  }
  if (route === "/v1/panchanga/at-time") {
    const jd = Number(q.get("jd"));
    return local.atTime({ jd, clock: q.get("clock") as string, era, language }, place);
  }
  if ((m = /^\/v1\/panchanga\/year\/(\d+)\/sun$/.exec(route))) return local.yearSun({ year: Number(m[1]), era, language }, place);
  if ((m = /^\/v1\/panchanga\/year\/(\d+)$/.exec(route))) return local.yearWheel({ year: Number(m[1]), era }, place);
  if ((m = /^\/v1\/panchanga\/(\d+)\/(\d+)$/.exec(route))) {
    return local.month({ year: Number(m[1]), month: Number(m[2]), era, language, full: q.get("full") === "true", slim: q.get("slim") === "true" }, place);
  }
  if ((m = /^\/v1\/panchanga\/element\/([a-z-]+)\/day\/(.+)$/.exec(route))) return local.element({ route: "day", name: m[1], date: m[2], era, language }, place);
  if ((m = /^\/v1\/panchanga\/element\/([a-z-]+)\/month\/(\d+)\/(\d+)$/.exec(route))) return local.element({ route: "month", name: m[1], year: Number(m[2]), month: Number(m[3]) }, place);
  if ((m = /^\/v1\/nepal\/panchak\/year\/(\d+)$/.exec(route))) return local.grahaYear({ kind: "panchak", year: Number(m[1]), era, language }, place);
  if ((m = /^\/v1\/nepal\/patro\/(\d+)\/(\d+)$/.exec(route))) return local.patro({ year: Number(m[1]), month: Number(m[2]) }, place);
  return "skip";
}

test("the Drik routes made on the device match the server's", async () => {
  const surya = new Sky("surya", io);
  await surya.open();
  const drik = new Sky("drik", io);
  await drik.open();
  const local = makeLocalCalendar({ loadSky: async (s) => (s === "surya" ? surya : drik), system: () => ({ system: "drik", ayanamsha: "lahiri" }), enabled: () => true });
  const failures: string[] = [];
  const answered = new Map<string, number>();
  let nulls = 0;
  for (const c of cases) {
    if (c.status !== 200) continue;
    const got = await answer(local, c.path);
    if (got === "skip") continue;
    if (got === null) { nulls += 1; failures.push(`${c.path}: the device gave no answer`); continue; }
    const kind = c.path.split("?")[0].replace(/\d+/g, "#").replace(/\/[a-z]+\/(day|month)\/.*/, "/element/$1");
    answered.set(kind, (answered.get(kind) ?? 0) + 1);
    const err = diff("", got, JSON.parse(c.body));
    if (err && !noise(err)) failures.push(`${c.path}: ${err}`);
  }
  console.log("answered", Object.fromEntries(answered), "no answer", nulls);
  assert.equal(failures.length, 0, `${failures.length} differ:\n${failures.slice(0, 12).join("\n")}`);
});
