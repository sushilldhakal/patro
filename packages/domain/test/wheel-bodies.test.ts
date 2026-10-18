import assert from "node:assert/strict";
import test from "node:test";
import { earthTop, retroBorder, wheelMoonShadow } from "../src/panchanga/wheel-bodies.ts";

test("longitude 0 is straight up from the north pole", () => {
  const top = earthTop(27.7, 0, new Date("2026-10-15T06:15:00Z"));
  assert.ok(Math.abs(top.place.x) < 1e-9);
  assert.ok(top.place.y < 0);
  assert.ok(Math.abs(top.dx) < 1e-9);
  assert.ok(Math.abs(top.dy + 1) < 1e-9);
  const rho = Math.hypot(top.place.x, top.place.y);
  assert.ok(Math.abs(rho - Math.cos((27.7 * Math.PI) / 180)) < 1e-9);
});

test("east of Greenwich swings counter-clockwise", () => {
  const top = earthTop(0, 90, new Date("2026-10-15T06:15:00Z"));
  assert.ok(top.place.x > 0.9);
  assert.ok(Math.abs(top.place.y) < 1e-9);
});

test("the retrograde border is 3 screen pixels and flush with the icon", () => {
  const border = retroBorder(8, 2);
  assert.equal(border.width, 1.5);
  assert.equal(border.r, 8.75);
});

test("full moon has no shadow and new moon is a disc", () => {
  assert.equal(wheelMoonShadow(180, 8), null);
  const neu = wheelMoonShadow(0, 8);
  assert.ok(neu);
  assert.equal(neu.includes("A"), true);
  assert.equal(wheelMoonShadow(90, 8)?.includes("A"), true);
});
