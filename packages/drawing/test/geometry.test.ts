import assert from "node:assert/strict";
import { test } from "node:test";
import { assignLanes } from "../src/panchanga/day-timeline-layout";
import { clampPct, strengthBand } from "../src/jyotish/kundali/bhava-bala-chart";
import { annulusPath, CX, CY } from "../src/vastu/vastu-purusha-wheel";
import { CX as AV_CX, CY as AV_CY, polar } from "../src/jyotish/avakahada-wheel";

test("timeline lanes never overlap", () => {
  const lanes = assignLanes([
    { fromG: 0, toG: 10 } as never,
    { fromG: 5, toG: 15 } as never,
    { fromG: 10, toG: 20 } as never,
  ]) as unknown as { lane: number }[];
  assert.deepEqual(lanes.map((s) => s.lane), [0, 1, 0]);
});

test("bhava bala chart scale", () => {
  assert.equal(strengthBand(100), "strong");
  assert.equal(strengthBand(85), "average");
  assert.equal(strengthBand(10), "weak");
  assert.equal(clampPct(5, 0), 0);
  assert.equal(clampPct(150, 100), 100);
});

test("wheel geometry: annulus from the right, 0° at the top", () => {
  assert.ok(annulusPath(10, 5).startsWith(`M ${(CX + 10).toFixed(2)} ${CY}`));
  const [x, y] = polar(100, 0);
  assert.deepEqual([Math.round(x), Math.round(y)], [AV_CX, AV_CY - 100]);
});
