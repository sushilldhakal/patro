import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLIMATIC_PRECESSION_YEARS,
  northernSummer,
  perihelionAngle,
  perihelionDate,
  solsticeSunlight,
} from "../src/learn/apsidal-precession.ts";

test("perihelion falls in early January today", () => {
  const { month, day } = perihelionDate(2026);
  assert.equal(month, 0);
  assert.ok(day >= 2 && day <= 4, `day ${day}`);
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
