// Every boundary kind can be found from positions alone: a lean sky (no files) agrees with the stored
// index. Surya formulas are exact; the Drik built-in series is approximate (minutes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { Sky, type SkyIo } from "../src/astronomy/sky";
import type { VidxKind } from "../src/astronomy/vidx";

const io: SkyIo = {
  bundled: async (name) => new Uint8Array(readFileSync(new URL(`../../../apps/web/public/sky/${name}.bin`, import.meta.url))),
  readCache: async () => null,
  writeCache: async () => {},
  fetchBytes: async () => {
    throw new Error("no server");
  },
};
const KINDS: VidxKind[] = ["tithi", "karana", "yoga", "nakshatra", "pada", "moonRashi", "sunNakshatra", "sankranti", "sunDegree", "phase"];
const START = 2461000.3; // late 2025, inside the bundled years

for (const [system, minutes] of [["surya", 1], ["drik", 12]] as const) {
  test(`${system}: lean sky solves every kind like the index`, async () => {
    const full = new Sky(system, io);
    await full.open();
    const lean = new Sky(system, io, { lean: true });
    await lean.open();
    assert.equal(lean.bundledSpan, null);
    for (const kind of KINDS) {
      for (const at of [START, START + 9.3, START + 200.7]) {
        const a = full.nextBoundary(kind, at);
        const b = lean.nextBoundary(kind, at);
        assert.ok(a && b, `${system} ${kind} found`);
        assert.equal(b.multiple, a.multiple, `${system} ${kind} span`);
        assert.ok(Math.abs(b.jd - a.jd) * 1440 <= minutes, `${system} ${kind} ${((b.jd - a.jd) * 1440).toFixed(2)} min`);
        assert.equal(lean.spanAt(kind, at), full.spanAt(kind, at), `${system} ${kind} spanAt`);
        const pa = full.prevBoundary(kind, at);
        const pb = lean.prevBoundary(kind, at);
        assert.ok(pa && pb);
        assert.equal(pb.multiple, pa.multiple, `${system} ${kind} prev span`);
        assert.ok(Math.abs(pb.jd - pa.jd) * 1440 <= minutes, `${system} ${kind} prev`);
      }
    }
    const a = full.eventsBetween("tithi", START, START + 60);
    const b = lean.eventsBetween("tithi", START, START + 60);
    assert.equal(b.length, a.length);
  });
}
