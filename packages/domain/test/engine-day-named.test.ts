// A day named by the page's own state (today, a Julian Day, a typed date in either era) is the same day,
// under both systems; only the era it is shown in differs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { makeLocalCalendar } from "../src/festivals/local-calendar";

const root = new URL("../../../", import.meta.url);
const io: SkyIo = { bundled: async (n) => new Uint8Array(readFileSync(new URL(`apps/web/public/sky/${n}.bin`, root))), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("bundled"); } };
type Day = { date_ad: string; date_bs: string; weekday_en: string; tithi: { name: string } };

for (const system of ["surya", "drik"] as const) {
  test(`a named day is the same day by date, Julian Day and today (${system})`, async () => {
    const surya = new Sky("surya", io);
    await surya.open();
    const drik = new Sky("drik", io);
    await drik.open();
    const local = makeLocalCalendar({ loadSky: async (s) => (s === "surya" ? surya : drik), system: () => ({ system, ayanamsha: "lahiri" }), enabled: () => true });
    const byAd = (await local.day({ date: "2026-12-16", inputEra: "ad", era: "bs", language: "ne", detail: false })) as unknown as Day;
    const byBs = (await local.day({ date: "2083-09-01", inputEra: "bs", era: "ad", language: "en", detail: false })) as unknown as Day;
    const byJd = (await local.day({ jd: 2461390.5, era: "bs", language: "ne", detail: false })) as unknown as Day;
    assert.equal(byAd.date_ad, "2026-12-16");
    assert.equal(byAd.date_bs, "2083-09-01");
    assert.equal(byBs.date_ad, "2026-12-16");
    assert.equal(byJd.date_ad, "2026-12-16");
    assert.equal(byJd.tithi.name, byAd.tithi.name);
    const today = (await local.day({ today: true, era: "ad", language: "en", detail: false })) as unknown as Day;
    const zoneDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
    assert.equal(today.date_ad, zoneDate);
    // A date the device cannot name (an era it does not read) is the server's.
    assert.equal(await local.day({ date: "0044-03-15", inputEra: "bc", era: "bc", detail: false }), null);
  });
}
