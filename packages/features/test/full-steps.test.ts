import { test } from "node:test";
import assert from "node:assert/strict";
import { fullRecordingSteps } from "../src/documents/full-steps";

test("sukta files: next sukta, and previous restarts unless the sukta just began", () => {
  assert.deepEqual(fullRecordingSteps({ trackCount: 3, trackIndex: 1, verseStarts: [], currentTime: 1 }), {
    prev: { kind: "track", index: 0 },
    next: { kind: "track", index: 2 },
  });
  assert.deepEqual(fullRecordingSteps({ trackCount: 3, trackIndex: 1, verseStarts: [], currentTime: 40 }).prev, { kind: "seek", time: 0 });
  assert.equal(fullRecordingSteps({ trackCount: 3, trackIndex: 2, verseStarts: [], currentTime: 1 }).next, null);
  assert.equal(fullRecordingSteps({ trackCount: 3, trackIndex: 0, verseStarts: [], currentTime: 0 }).prev, null);
});

test("one recording with verse times: steps verse by verse", () => {
  const verseStarts = [0, 10, 20, null];
  assert.deepEqual(fullRecordingSteps({ trackCount: 1, trackIndex: 0, verseStarts, currentTime: 11 }), {
    prev: { kind: "seek", time: 0 },
    next: { kind: "seek", time: 20 },
  });
  assert.deepEqual(fullRecordingSteps({ trackCount: 1, trackIndex: 0, verseStarts, currentTime: 15 }).prev, { kind: "seek", time: 10 });
  assert.equal(fullRecordingSteps({ trackCount: 1, trackIndex: 0, verseStarts, currentTime: 25 }).next, null);
});

test("one recording without verse times: previous restarts, no next", () => {
  assert.deepEqual(fullRecordingSteps({ trackCount: 1, trackIndex: 0, verseStarts: [], currentTime: 30 }), { prev: { kind: "seek", time: 0 }, next: null });
});
