import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ensureBundle,
  getLanguage,
  getRequestedLanguage,
  getT,
  interpolate,
  registerBundle,
  setBundleLoader,
  setLanguage,
  subscribe,
  translate,
  translateList,
} from "../src/runtime";

registerBundle("ne", {
  greet: "नमस्ते {{name}}",
  only_ne: "नेपाली मात्र",
  faq: [{ q: "{{year}} मा?", a: "हो" }],
  group: { leaf: "पात" },
});

test("looks up dotted keys and fills values", () => {
  assert.equal(translate("ne", "greet", { name: "राम" }), "नमस्ते राम");
  assert.equal(translate("ne", "group.leaf"), "पात");
});

test("a value that was not passed becomes empty, like i18next", () => {
  assert.equal(interpolate("a {{x}} b"), "a  b");
  assert.equal(interpolate("{{ n }}/{{- m}}", { n: 1, m: "z" }), "1/z");
});

test("missing key gives defaultValue, else the key", () => {
  assert.equal(translate("ne", "nope", { defaultValue: "fallback" }), "fallback");
  assert.equal(translate("ne", "nope"), "nope");
});

test("an object without returnObjects gives the key", () => {
  assert.equal(translate("ne", "group"), "group");
  assert.deepEqual(translate("ne", "faq", { returnObjects: true, year: "२०८२" }), [{ q: "२०८२ मा?", a: "हो" }]);
  assert.deepEqual(translateList("ne", "faq"), [{ q: "{{year}} मा?", a: "हो" }]);
});

test("English waits for its bundle, then falls back to Nepali per key", async () => {
  let loads = 0;
  setBundleLoader(async () => {
    loads++;
    return { greet: "Hello {{name}}" };
  });
  let changes = 0;
  const off = subscribe(() => changes++);
  const pending = setLanguage("en-US");
  assert.equal(getRequestedLanguage(), "en");
  assert.equal(getLanguage(), "ne", "UI stays Nepali while English loads");
  await pending;
  await ensureBundle("en");
  assert.equal(loads, 1);
  assert.equal(getLanguage(), "en");
  assert.ok(changes >= 2, "notified on the pick and on the bundle");
  assert.equal(getT("en")("greet", { name: "Ram" }), "Hello Ram");
  assert.equal(getT("en")("only_ne"), "नेपाली मात्र");
  assert.equal(getT("en"), getT("en"), "t is stable per language");
  off();
  await setLanguage("ne");
});
