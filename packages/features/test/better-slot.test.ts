import { test } from "node:test";
import assert from "node:assert/strict";
import { betterSlot, type DayTimePick } from "../src/events/day-time-picks";

const pick = (source: "shubh" | "ashubh", key: string, start: string, end: string): DayTimePick => ({
  id: `${source}:${key}`,
  source,
  key,
  nameNe: key,
  nameEn: key,
  startDate: start.slice(0, 10),
  startTime: start.slice(11),
  endDate: end.slice(0, 10),
  endTime: end.slice(11),
});

test("skips a शुभ window that lies inside an अशुभ one", () => {
  const shubh = [pick("shubh", "amrit", "2026-11-05T20:51", "2026-11-05T22:29"), pick("shubh", "nishita", "2026-11-05T23:21", "2026-11-06T00:13")];
  const ashubh = [pick("ashubh", "baan", "2026-11-05T06:17", "2026-11-05T21:22"), pick("ashubh", "kaal", "2026-11-05T19:38", "2026-11-05T21:22")];
  const got = betterSlot(shubh, ashubh, "2026-11-05T20:00");
  // अमृत starts inside बाण: the clean part begins when बाण ends.
  assert.equal(got?.key, "amrit");
  assert.equal(got?.startTime, "21:22");
  assert.equal(got?.endTime, "22:29");
});

test("returns null when every शुभ window is covered", () => {
  const shubh = [pick("shubh", "a", "2026-11-05T10:00", "2026-11-05T10:30")];
  const ashubh = [pick("ashubh", "b", "2026-11-05T06:00", "2026-11-05T18:00")];
  assert.equal(betterSlot(shubh, ashubh, "2026-11-05T09:00"), null);
});

test("prefers a later clean window over an earlier one", () => {
  const shubh = [pick("shubh", "early", "2026-11-05T07:00", "2026-11-05T08:00"), pick("shubh", "late", "2026-11-05T15:00", "2026-11-05T16:00")];
  const got = betterSlot(shubh, [pick("ashubh", "x", "2026-11-05T12:00", "2026-11-05T13:00")], "2026-11-05T12:30");
  assert.equal(got?.key, "late");
  assert.equal(got?.startTime, "15:00");
});
