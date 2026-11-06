import assert from "node:assert/strict";
import test from "node:test";
import { GRAHA_META } from "../src/panchanga/wheel-data.ts";
import { grahaAtSvgPoint, nextGrahaDoubleTap, planetSvgPosition } from "../src/panchanga/wheel-chart-geometry.ts";

const orbits = GRAHA_META.map((g) => g.orbit);
const lons = [10, 40, 70, 100, 130, 160, 190, 220, 250];

test("a point on a graha selects that graha", () => {
  const [x, y] = planetSvgPosition(lons[0]!, orbits[0]!, 0);
  assert.equal(grahaAtSvgPoint(x, y, lons, orbits, 0), 0);
});

test("empty sky selects nothing", () => {
  assert.equal(grahaAtSvgPoint(0, 0, lons, orbits, 0), null);
});

test("overlapping discs resolve to the closer centre", () => {
  const shared = [0, 0, 0, 0, 0, 0, 0, 0, 5];
  const [mx, my] = planetSvgPosition(0, orbits[1]!, 0);
  const [kx, ky] = planetSvgPosition(5, orbits[8]!, 0);
  assert.equal(grahaAtSvgPoint(mx, my, shared, orbits, 0), 1);
  assert.equal(grahaAtSvgPoint(kx, ky, shared, orbits, 0), 8);
});

test("one tap waits and the second tap on the same graha selects", () => {
  const first = nextGrahaDoubleTap(null, { at: 1000, index: 3 });
  assert.equal(first.select, null);
  assert.deepEqual(first.pending, { at: 1000, index: 3 });
  const second = nextGrahaDoubleTap(first.pending, { at: 1300, index: 3 });
  assert.equal(second.select, 3);
  assert.equal(second.pending, null);
});

test("a late or different second tap does not select", () => {
  const pending = { at: 1000, index: 3 };
  assert.equal(nextGrahaDoubleTap(pending, { at: 1500, index: 3 }).select, null);
  const moved = nextGrahaDoubleTap(pending, { at: 1200, index: 4 });
  assert.equal(moved.select, null);
  assert.deepEqual(moved.pending, { at: 1200, index: 4 });
  assert.equal(nextGrahaDoubleTap(pending, { at: 1100, index: null }).pending, null);
});
