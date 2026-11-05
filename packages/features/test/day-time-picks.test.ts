import { test } from "node:test";
import assert from "node:assert/strict";
import type { PanchangaDay } from "@vedic-patro/api-client";
import { buildDayTimePicks, clockMinutes } from "../src/events/day-time-picks";

const seg = (start: string, end?: string, until_full_night = false) => ({
  start_local_time_short: start,
  end_local_time_short: end,
  until_full_night,
});

// 5 Nov 2026 as the user's pasted panchanga: sunrise 6:17.
const day = {
  sunrise: "06:17",
  muhurta: {
    auspicious_timings: [
      { key: "abhijit", name_ne: "अभिजित् मुहूर्त", name_en: "Abhijit", segments: [seg("11:25", "12:09")] },
      { key: "nishita", name_ne: "निशिता मुहूर्त", name_en: "Nishita", segments: [seg("23:21", "24:13")] },
      { key: "brahma", name_ne: "ब्रह्म मुहूर्त", name_en: "Brahma", segments: [seg("04:32", "05:25")] },
    ],
    inauspicious_timings: [
      { key: "rahu_kalam", name_ne: "राहु काल", name_en: "Rahu Kaal", segments: [seg("13:09", "14:32")] },
      { key: "baana", name_ne: "बाण", name_en: "Baana", segments: [seg("21:23", "06:17")] },
      { key: "yoga_visha", name_ne: "योग विष", name_en: "Yoga Visha", segments: [seg("05:24", undefined, true)] },
    ],
  },
  udaya_lagna: [
    { name: "Makara", name_ne: "मकर", start_local_time_short: "11:37", end_local_time_short: "13:20", pushkara_navamsha: [{ local_time_short: "12:02" }, { local_time_short: "12:25" }] },
    { name: "Simha", name_ne: "सिंह", start_local_time_short: "00:28", end_local_time_short: "02:44", pushkara_navamsha: [{ local_time_short: "01:52" }] },
    { name: "Dhanu", name_ne: "धनु", start_local_time_short: "09:33", end_local_time_short: "11:37" },
  ],
} as unknown as PanchangaDay;

test("clock strings read as minutes, 12-hour and past midnight too", () => {
  assert.equal(clockMinutes("13:09"), 789);
  assert.equal(clockMinutes("1:09 PM"), 789);
  assert.equal(clockMinutes("12:05 AM"), 5);
  assert.equal(clockMinutes("24:13"), 1453);
  assert.equal(clockMinutes("—"), null);
});

test("shubh windows in day order; before sunrise and past 24:00 fall on the next date", () => {
  const { shubh } = buildDayTimePicks(day, "2026-11-05");
  assert.deepEqual(
    shubh.map((p) => [p.key, p.startDate, p.startTime, p.endDate, p.endTime]),
    [
      ["abhijit", "2026-11-05", "11:25", "2026-11-05", "12:09"],
      ["nishita", "2026-11-05", "23:21", "2026-11-06", "00:13"],
      ["brahma", "2026-11-06", "04:32", "2026-11-06", "05:25"],
    ],
  );
});

test("ashubh windows: an end before the start, and one running to sunrise", () => {
  const { ashubh } = buildDayTimePicks(day, "2026-11-05");
  const baana = ashubh.find((p) => p.key === "baana")!;
  assert.deepEqual([baana.startDate, baana.startTime, baana.endDate, baana.endTime], ["2026-11-05", "21:23", "2026-11-06", "06:17"]);
  const visha = ashubh.find((p) => p.key === "yoga_visha")!;
  assert.deepEqual([visha.startDate, visha.startTime, visha.endDate, visha.endTime], ["2026-11-06", "05:24", "2026-11-06", "06:17"]);
});

test("pushkara: one pick per moment, a ninth of the lagna long, lagnas with none left out", () => {
  const { pushkara } = buildDayTimePicks(day, "2026-11-05");
  assert.deepEqual(
    pushkara.map((p) => [p.nameNe, p.startDate, p.startTime, p.endTime]),
    [
      ["मकर", "2026-11-05", "12:02", "12:13"],
      ["मकर", "2026-11-05", "12:25", "12:36"],
      ["सिंह", "2026-11-06", "01:52", "02:07"],
    ],
  );
});
