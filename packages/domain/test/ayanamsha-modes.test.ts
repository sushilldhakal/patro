// The Drik ayanamshas against the Swiss Ephemeris (production Python's engine for them):
// `get_ayanamsa_ex_ut` every five years 1900-2100, recorded on the production box.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ayanamshaFor, drikAyanamshaOf, type DrikAyanamsha } from "../src/astronomy/ayanamsha-modes";

const swiss = JSON.parse(readFileSync(new URL("./fixtures/ayanamsha-swiss.json", import.meta.url), "utf8")) as {
  jd: number[];
  modes: Record<DrikAyanamsha, number[]>;
};

test("each mode stands from Lahiri where Swiss puts it (within 0.05″)", () => {
  for (const mode of Object.keys(swiss.modes) as DrikAyanamsha[]) {
    swiss.jd.forEach((jd, i) => {
      const ours = ayanamshaFor(mode, jd) - ayanamshaFor("lahiri", jd);
      const theirs = swiss.modes[mode][i] - swiss.modes.lahiri[i];
      assert.ok(Math.abs(ours - theirs) * 3600 < 0.05, `${mode} at ${jd}: ${((ours - theirs) * 3600).toFixed(3)}″`);
    });
  }
});

test("Lahiri is Swiss Lahiri on the mean equinox (Swiss adds nutation; it cancels in sidereal places)", () => {
  const R = Math.PI / 180;
  swiss.jd.forEach((jd, i) => {
    const t = (jd - 2451545) / 36525;
    const om = (125.04452 - 1934.136261 * t) * R;
    const L = (280.4665 + 36000.7698 * t) * R;
    const Lp = (218.3165 + 481267.8813 * t) * R;
    const dpsi = (-17.2 * Math.sin(om) - 1.32 * Math.sin(2 * L) - 0.23 * Math.sin(2 * Lp) + 0.21 * Math.sin(2 * om)) / 3600;
    assert.ok(Math.abs(ayanamshaFor("lahiri", jd) - (swiss.modes.lahiri[i] - dpsi)) * 3600 < 0.5, `lahiri at ${jd}`);
  });
});

test("the app's choices map to modes", () => {
  assert.equal(drikAyanamshaOf("nepal"), "lahiri");
  assert.equal(drikAyanamshaOf("kp"), "kp");
  assert.equal(drikAyanamshaOf("fagan"), null);
});
