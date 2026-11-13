import { test } from "node:test";
import assert from "node:assert/strict";

import { compactFestivalLabel } from "../src/home/use-bs-calendar-grid";

test("a phone cell writes a short festival name whole", () => {
  assert.equal(compactFestivalLabel("भाई टीका"), "भाई टीका");
  assert.equal(compactFestivalLabel("विजया दशमी"), "विजया दशमी");
});

test("a long festival name is cut to its first word", () => {
  assert.equal(compactFestivalLabel("पापांकुशा एकादशी व्रत"), "पापांकुशा");
});

test("a name whose first word is still too long is left to the +N badge", () => {
  assert.equal(compactFestivalLabel("अन्तर्राष्ट्रियसहनशीलतादिवस"), undefined);
});
