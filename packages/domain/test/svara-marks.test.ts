import assert from "node:assert/strict";
import { test } from "node:test";
import { svaraPieces } from "../src/learn/svara-marks";

const D1 = "\uA8E1";
const D2 = "\uA8E2";
const D3 = "\uA8E3";
const RA = "\uA8EF";

test("pitch digits sit on the syllable they follow", () => {
  const pieces = svaraPieces(`अ${D2}ग्न${D3} आ${D1}`);
  assert.deepEqual(pieces, [
    { text: "अ", marks: "2" },
    { text: "ग्न", marks: "3" },
    { text: " ", marks: "" },
    { text: "आ", marks: "1" },
  ]);
});

test("a svara letter stays with the digit on that syllable", () => {
  const pieces = svaraPieces(`होता${D2}${RA}`);
  assert.deepEqual(pieces, [
    { text: "हो", marks: "" },
    { text: "ता", marks: "2र" },
  ]);
});

test("a mantra with no pitch marks stays on the plain line", () => {
  assert.deepEqual(svaraPieces("अग्न आ याहि"), []);
});
