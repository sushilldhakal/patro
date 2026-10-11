import assert from "node:assert/strict";
import { test } from "node:test";
import { formatVedaCite } from "../src/veda-cite";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, parseStoredLanguage } from "../src/locale";
import { angaEndClock, angaEndWithDay, dayOffsetLabel } from "../src/panchanga-format";
import { assignLanes } from "../src/day-timeline-layout";
import { niceCeil } from "../src/kundali/shadbala-chart";
import { clampPct, strengthBand } from "../src/kundali/bhava-bala-chart";
import { embedRashi, dowOf } from "../src/dainikKranti/day-helpers";
import { positiveInt, positiveMonth } from "../src/patro-browse-params";

test("Veda citations", () => {
  assert.equal(formatVedaCite("rigveda:1.1.3", "ne"), "ऋग्वेद १.१.३");
  assert.equal(formatVedaCite("rigveda:1.1.3", "en"), "Rigveda 1.1.3");
  assert.equal(formatVedaCite("unknown:1", "en"), null);
  assert.equal(formatVedaCite(null, "en"), null);
});

test("stored language parsing is the same on both apps", () => {
  assert.equal(LANGUAGE_STORAGE_KEY, "i18nextLng");
  assert.equal(DEFAULT_LANGUAGE, "ne");
  assert.equal(parseStoredLanguage("en-US"), "en");
  assert.equal(parseStoredLanguage("NE"), "ne");
  assert.equal(parseStoredLanguage("hi"), null);
  assert.equal(parseStoredLanguage(null), null);
});

test("anga end times carry a भोलि / पर्सि prefix when they end on a later day", () => {
  assert.equal(angaEndClock({ end_local_time: "14:05:00" }), "१४:०५");
  // Sunrise 06:00; 20 h after sunrise is 02:00 the next day.
  assert.equal(angaEndWithDay({ end_local_time: "02:00", end_hours_clock: "20:00" }, 6, "ne"), "भोलि ०२:००");
  assert.equal(angaEndWithDay({ end_local_time: "02:00", end_hours_clock: "20:00" }, 6, "en"), "tomorrow ०२:००");
  assert.equal(angaEndWithDay({ end_local_time: "10:00", end_hours_clock: "04:00" }, 6, "ne"), "१०:००");
  assert.equal(dayOffsetLabel(2, "ne"), "पर्सि");
});

test("timeline lanes never overlap", () => {
  const lanes = assignLanes([
    { fromG: 0, toG: 10 } as never,
    { fromG: 5, toG: 15 } as never,
    { fromG: 10, toG: 20 } as never,
  ]) as unknown as { lane: number }[];
  assert.deepEqual(lanes.map((s) => s.lane), [0, 1, 0]);
});

test("chart scale helpers", () => {
  assert.equal(niceCeil(0), 1);
  assert.ok(niceCeil(437) >= 437);
  assert.equal(strengthBand(100), "strong");
  assert.equal(strengthBand(85), "average");
  assert.equal(strengthBand(10), "weak");
  assert.equal(clampPct(5, 0), 0);
  assert.equal(clampPct(150, 100), 100);
});

test("DainikKranti day helpers", () => {
  assert.equal(embedRashi("कृत्तिका १ मा", "वृष"), "कृत्तिका १ वृषमा");
  assert.equal(dowOf("2026-10-11"), 0);
  assert.equal(dowOf("not a date"), -1);
});

test("browse parameters stay in range", () => {
  assert.equal(positiveInt(-3), 1);
  assert.equal(positiveInt(2083.7), 2083);
  assert.equal(positiveMonth(13), 12);
  assert.equal(positiveMonth(0), 1);
});
