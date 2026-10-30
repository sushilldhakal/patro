import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLIMATIC_PRECESSION_YEARS,
  northernSummer,
  perihelionAngle,
  perihelionBsDate,
  perihelionNearestCardinal,
  solsticeSunlight,
} from "../src/learn/apsidal-precession.ts";

test("perihelion falls around पुस १९ today, 13 days after the December solstice", () => {
  const { month, day } = perihelionBsDate(2026, 24.2);
  assert.equal(month, 9);
  assert.ok(day >= 18 && day <= 20, `day ${day}`);
  assert.deepEqual(perihelionNearestCardinal(2026), { point: 0, days: 13 });
});

test("in BS, perihelion moves only a rashi in ~9,300 years", () => {
  // ~11,750 CE: ayanamsha has grown ~136° but perihelion has moved only ~31° among the stars.
  const { month } = perihelionBsDate(11750, 24.2 + (50.29 / 3600) * 9724);
  assert.equal(month, 10);
  assert.equal(perihelionNearestCardinal(11750).point, 2);
});

test("perihelion coincided with the December solstice around 1250 CE", () => {
  const a = perihelionAngle(1280);
  assert.ok(a < 2 || a > 358, `angle ${a}`);
});

test("one round through the seasons takes about 21,000 years", () => {
  assert.ok(CLIMATIC_PRECESSION_YEARS > 20_000 && CLIMATIC_PRECESSION_YEARS < 22_000);
});

test("today the northern summer comes near aphelion", () => {
  const s = solsticeSunlight(2026);
  assert.ok(s.june < -3 && s.june > -3.5, `june ${s.june}`);
  assert.ok(s.december > 3 && s.december < 3.5, `december ${s.december}`);
  assert.equal(northernSummer(2026), "mild");
});

test("as the last ice age ended (~9000 BCE) perihelion fell in the northern summer", () => {
  assert.equal(northernSummer(-9000), "intense");
  const a = perihelionAngle(-9000);
  assert.ok(Math.abs(a - 180) < 10, `angle ${a}`);
});
