import { test } from "node:test";
import assert from "node:assert/strict";
import { relinkDayDetail, unlinkDayDetail, type PanchangaDay } from "../src/index.ts";

function slimDay(): PanchangaDay {
  return {
    muhurta: { abhijit: "11:26" },
    planets: { sun: "kanya" },
    detail: { tithi: { name: "Shashthi" } },
    detail_shared: ["muhurta", "planets"],
  } as unknown as PanchangaDay;
}

test("relink copies the shared blocks into detail as the same objects", () => {
  const day = relinkDayDetail(slimDay());
  const detail = day.detail as Record<string, unknown>;
  assert.equal(detail.muhurta, (day as unknown as Record<string, unknown>).muhurta);
  assert.deepEqual(detail.tithi, { name: "Shashthi" });
  // Idempotent.
  assert.deepEqual(relinkDayDetail(day), day);
});

test("unlink writes the slim form, and relink restores it after a JSON round trip", () => {
  const day = relinkDayDetail(slimDay());
  const written = JSON.stringify(unlinkDayDetail(day));
  assert.equal(written.split("11:26").length - 1, 1, "shared block written once");
  const back = relinkDayDetail(JSON.parse(written) as PanchangaDay);
  assert.deepEqual(back, day);
  // The live object is untouched by unlink.
  assert.ok("muhurta" in (day.detail as object));
});

test("payloads without detail_shared pass through", () => {
  const old = { detail: { muhurta: 1 }, muhurta: 1 } as unknown as PanchangaDay;
  assert.equal(relinkDayDetail(old), old);
  assert.equal(unlinkDayDetail(old), old);
  assert.equal(unlinkDayDetail(null), null);
});
