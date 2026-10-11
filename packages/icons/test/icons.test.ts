import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FEATURE_ICON,
  NAV_ICON_NAMES,
  iconStrokeWidth,
  lucideForIonicon,
  resolveNavIcon,
} from "../src/index";

test("nav entries resolve the same in every section", () => {
  assert.equal(resolveNavIcon("patro", "holidays"), "party-popper");
  assert.equal(resolveNavIcon("jyotish", "kundali"), "sparkles");
  assert.equal(resolveNavIcon("spans", "chandra-rashi"), "moon-star");
  assert.equal(resolveNavIcon("tables", "hora"), "clock-3");
  assert.equal(resolveNavIcon("graha", "graha-vakri"), "rotate-ccw");
  assert.equal(resolveNavIcon("sait", "vivah"), "heart-handshake");
});

test("unknown entries fall back per section", () => {
  assert.equal(resolveNavIcon("patro", "nope"), "calendar-days");
  assert.equal(resolveNavIcon("tables", "nope"), "calendar-clock");
  assert.equal(resolveNavIcon("graha", "nope"), "orbit");
  assert.equal(resolveNavIcon("elsewhere", "nope"), "calendar-days");
});

test("every nav icon name is listed for the renderers", () => {
  for (const name of Object.values(FEATURE_ICON)) assert.ok(NAV_ICON_NAMES.includes(name), name);
  assert.ok(NAV_ICON_NAMES.includes("calendar-days"));
});

test("Ionicons aliases draw Lucide artwork", () => {
  assert.equal(lucideForIonicon("home-outline"), "house");
  assert.equal(lucideForIonicon("close"), "x");
  assert.equal(lucideForIonicon("logo-github"), undefined);
});

test("stroke follows size", () => {
  assert.equal(iconStrokeWidth(16), 2);
  assert.equal(iconStrokeWidth(24), 1.75);
});
