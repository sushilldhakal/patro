// The files the apps carry (BS 1950-2150, apps/web/public/sky) against each other and against the
// two built-in fallbacks. Nothing here is mocked: the Chebyshev file, the Surya
// formulas and our own Drik series are all read or run for real, and they must agree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { drikAnalyticSource } from "../src/astronomy/drik-analytic";
import { chebPositionsAt, chebScalars, parseChebTable } from "../src/astronomy/chebyshev";
import { Sky, type SkyIo } from "../src/astronomy/sky";
import { tithiAt } from "../src/astronomy/siddhanta-offline";
import { suryaFormulaSource } from "../src/astronomy/surya-formulas";

const file = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../../../apps/web/public/sky/${name}.bin`, import.meta.url)));

const JD_2026 = 2_461_041.5;
const SUN = 0;
const MOON = 1;

/** Angular difference in arcseconds. */
function arcsec(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
}

/** A deterministic spread of instants across the bundled window. */
function instants(count: number, from: number, to: number): number[] {
  let state = 12345;
  const next = () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
  return Array.from({ length: count }, () => from + next() * (to - from));
}

for (const system of ["surya", "drik"] as const) {
  const cheb = parseChebTable(file(`${system}.cheb`));
  const scalars = chebScalars(cheb);
  const sky = new Sky(system, { bundled: async (name) => file(name), readCache: async () => null, writeCache: async () => {}, fetchBytes: async () => { throw new Error("offline"); } });

  test(`${system}: the file covers BS 1950 to 2150`, async () => {
    await sky.open();
    const span = sky.bundledSpan;
    assert.ok(span);
    // BS 1950 starts 13 April 1893 (JD 2412566.5) and BS 2150 ends 13 April 2094 (JD 2485982.5)
    assert.ok(span[0] <= 2_412_566.5 - 60, "starts with room before BS 1950");
    assert.ok(span[1] >= 2_485_982.5 + 60, "ends with room after BS 2150");
  });

  test(`${system}: every tithi boundary solved is a tithi change in the positions`, async () => {
    await sky.open();
    let checked = 0;
    for (const jd of instants(60, JD_2026 - 20_000, JD_2026 + 20_000)) {
      const next = sky.nextBoundary("tithi", jd);
      assert.ok(next);
      const at = (t: number) => {
        const p = chebPositionsAt(cheb, t, scalars);
        assert.ok(p, "positions at the boundary");
        return tithiAt(p.longitude[SUN], p.longitude[MOON]).number - 1;
      };
      assert.equal(at(next.jd - 5 * 60 / 86_400), (next.multiple + 29) % 30);
      assert.equal(at(next.jd + 5 * 60 / 86_400), next.multiple);
      checked += 1;
    }
    assert.equal(checked, 60);
  });

  test(`${system}: tithi boundaries run in order and cycle through all thirty`, async () => {
    await sky.open();
    const events = sky.eventsBetween("tithi", JD_2026, JD_2026 + 400);
    assert.ok(events.length > 400 && events.length < 440, `${events.length} tithis in 400 days`);
    for (let i = 1; i < events.length; i += 1) {
      assert.ok(events[i].jd > events[i - 1].jd);
      assert.equal(events[i].multiple, (events[i - 1].multiple + 1) % 30);
    }
  });

  test(`${system}: nakshatra, yoga and sankranti are solved from the same positions`, async () => {
    await sky.open();
    const nak = sky.eventsBetween("nakshatra", JD_2026, JD_2026 + 60);
    assert.ok(nak.length >= 55 && nak.length <= 62, `${nak.length} nakshatras in 60 days`);
    const yoga = sky.eventsBetween("yoga", JD_2026, JD_2026 + 60);
    assert.ok(yoga.length >= 55 && yoga.length <= 70);
    const sankranti = sky.eventsBetween("sankranti", JD_2026, JD_2026 + 400);
    assert.equal(sankranti.length, 13);
  });
}

test("surya: the formulas reproduce the Chebyshev file (and so the server) to a few arcseconds", () => {
  const cheb = parseChebTable(file("surya.cheb"));
  const scalars = chebScalars(cheb);
  for (const jd of instants(40, 2_413_000, 2_485_000)) {
    const stored = chebPositionsAt(cheb, jd, scalars);
    const formulas = suryaFormulaSource.positionsAt(jd);
    assert.ok(stored && formulas);
    for (let body = 0; body < 8; body += 1) {
      const error = arcsec(stored.longitude[body], formulas.longitude[body]);
      assert.ok(error < 25, `body ${body} off by ${error.toFixed(1)} arcsec at ${jd}`);
    }
    assert.ok(Math.abs(stored.ayanamsha - formulas.ayanamsha) < 1e-6);
  }
});

test("drik: our own series stays within its measured error of the Chebyshev file", () => {
  const cheb = parseChebTable(file("drik.cheb"));
  const scalars = chebScalars(cheb);
  for (const jd of instants(40, 2_413_000, 2_485_000)) {
    const stored = chebPositionsAt(cheb, jd, scalars);
    const analytic = drikAnalyticSource.positionsAt(jd);
    assert.ok(stored && analytic);
    assert.ok(arcsec(stored.longitude[SUN], analytic.longitude[SUN]) < 80, "sun");
    assert.ok(arcsec(stored.longitude[MOON], analytic.longitude[MOON]) < 90, "moon");
    assert.ok(arcsec(stored.longitude[7], analytic.longitude[7]) < 200, "rahu");
    assert.ok(Math.abs(stored.ayanamsha - analytic.ayanamsha) < 0.001, "ayanamsha");
    for (const planet of [2, 3, 4, 5, 6]) {
      assert.ok(arcsec(stored.longitude[planet], analytic.longitude[planet]) < 3600, `planet ${planet} within a degree`);
    }
  }
});

test("sky: bundled years need no network; years outside fall back to the formulas", async () => {
  const requests: string[] = [];
  const io: SkyIo = {
    bundled: async (name) => file(name),
    readCache: async () => null,
    writeCache: async () => {},
    fetchBytes: async (path) => {
      requests.push(path);
      throw new Error("offline");
    },
  };
  const sky = new Sky("surya", io);
  await sky.open();
  await sky.ensure(JD_2026, JD_2026 + 30);
  assert.deepEqual(requests, [], "inside the bundled window nothing is fetched");
  assert.equal(sky.originAt(JD_2026), "bundled");
  assert.ok(sky.positionsAt(JD_2026));
  const tithi = sky.nextBoundary("tithi", JD_2026);
  assert.ok(tithi && tithi.jd > JD_2026 && tithi.jd < JD_2026 + 1.5);

  const farJd = 2_500_000; // AD 2132, outside the window
  await sky.ensure(farJd, farJd + 10);
  assert.ok(requests.length >= 1, "asked the server for a batch");
  assert.equal(sky.originAt(farJd), "formulas");
  const far = sky.positionsAt(farJd);
  assert.ok(far, "the formulas still answer");
  assert.ok(sky.nextBoundary("tithi", farJd), "tithi found from the fallback positions");
  const failed = requests.length;
  await sky.ensure(farJd, farJd + 10);
  assert.equal(requests.length, failed, "does not hammer a server that just failed");
});
