import assert from "node:assert/strict";
import { test } from "node:test";
import {
  brand,
  cssShadow,
  dark,
  light,
  minWidthQuery,
  mix,
  mobileRoles,
  nativeShadow,
  rgbChannels,
  tintRgba,
  withAlpha,
} from "../src/index";

test("mix() matches CSS color-mix(in srgb) rounding", () => {
  assert.equal(mix("#ffffff", 0, "#000000"), "#000000");
  assert.equal(mix("#ffffff", 100, "#000000"), "#ffffff");
  assert.equal(mix("#ffffff", 50, "#000000"), "#808080");
  // The website's light muted surface: color-mix(gold 18%, off-white).
  assert.equal(mix(brand.gold, 18, brand.offWhite), "#f2e7cb");
});

test("roles keep the website's values", () => {
  assert.equal(light.border, "#d7c9a4");
  assert.equal(light.muted, "#f2e7cb");
  assert.equal(dark.muted, "#191d31");
  assert.equal(dark.input, "#3f4252");
  assert.equal(light.destructive, brand.vermilion);
});

test("the app reads the website's roles unchanged", () => {
  for (const name of ["light", "dark"] as const) {
    const web = name === "light" ? light : dark;
    const app = mobileRoles(name);
    for (const [role, value] of Object.entries(app)) assert.equal(value, (web as Record<string, string>)[role], `${name}.${role} differs from the website`);
  }
  assert.equal(mobileRoles("light").accent, brand.gold);
  assert.equal(mobileRoles("light").success, brand.green);
});

test("channel and alpha helpers", () => {
  assert.equal(rgbChannels("#c62828"), "198 40 40");
  assert.equal(withAlpha("#c62828", 0.14), "rgba(198, 40, 40, 0.14)");
  assert.equal(tintRgba("surfaceToday"), "rgba(198, 40, 40, 0.14)");
});

test("shadows render for both platforms", () => {
  assert.match(cssShadow("sm"), /^0px 2px 3px 0px hsl\(28\.125 25% 25\.098% \/ 0\.18\),\n/);
  const n = nativeShadow("lg");
  assert.equal(n.shadowColor, "#503f30");
  assert.deepEqual(n.shadowOffset, { width: 0, height: 4 });
});

test("breakpoint media queries", () => {
  assert.equal(minWidthQuery("xl"), "(min-width: 1280px)");
});

import { illustration, brand as brandColors, midnight as midnightColors, neutral as neutralColors, wheel as wheelColors } from "../src/index";

test("illustration palette: valid, unique, and not a repeat of a named token", () => {
  const named = new Set(
    [brandColors, midnightColors, neutralColors, wheelColors].flatMap((g) => Object.values(g).map((v) => String(v).toLowerCase())),
  );
  const seen = new Map<string, string>();
  for (const [name, hex] of Object.entries(illustration)) {
    assert.match(hex, /^#[0-9a-f]{6}$/, `${name} is not a lowercase #rrggbb`);
    assert.ok(!seen.has(hex), `${name} repeats ${seen.get(hex)}`);
    assert.ok(!named.has(hex), `${name} (${hex}) is already a brand, midnight, neutral or wheel token`);
    seen.set(hex, name);
  }
});
