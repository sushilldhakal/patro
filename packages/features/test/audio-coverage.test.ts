import { test } from "node:test";
import assert from "node:assert/strict";

import { audioCoversAll, isNextSukta, isNextVerse } from "../src/documents/audio-coverage";

const NOTE = "टीका 1"; // a note card's label (टीका)
const v = (id: number, audio: boolean, label = `9.${id}`) => ({
  id,
  verse_label: label,
  audio_url: audio ? `https://x/${id}.mp3` : null,
});

test("audioCoversAll: every verse recorded; notes don't count", () => {
  assert.equal(audioCoversAll([v(1, true), v(2, true), v(3, false, NOTE)]), true);
  assert.equal(audioCoversAll([v(1, true), v(2, false), v(3, true)]), false);
  assert.equal(audioCoversAll([]), false);
});

test("isNextVerse: only the very next verse, skipping notes", () => {
  const page = [v(1, true), v(2, false, NOTE), v(3, true), v(4, false), v(5, true)];
  assert.equal(isNextVerse(page, 1, 3), true);
  assert.equal(isNextVerse(page, 3, 5), false); // verse 4 has no recording between them
  assert.equal(isNextVerse(page, 5, 1), false);
});

test("isNextSukta", () => {
  assert.equal(isNextSukta(66, 67), true);
  assert.equal(isNextSukta(67, 70), false);
  assert.equal(isNextSukta(null, 1), false);
});
