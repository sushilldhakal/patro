import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDay } from "@vedic-patro/api-client";
import { abhijitDays } from "../src/abhijit/model";

const day = (partial: Partial<CalendarDay>): CalendarDay =>
  ({ day: 4, date_ad: "2026-11-04", weekday: "Wednesday", festivals: [], ...partial }) as CalendarDay;

const OMITTED = "Wednesday — Abhijit not used";

test("a Wednesday row says Abhijit is not used", () => {
  const [row] = abhijitDays(
    [day({ weekday_en: "Wednesday", sunrise: "06:16", sunset: "17:16" })],
    "2026-11-01",
    "en",
    OMITTED,
  );
  assert.ok(row);
  assert.equal(row.omitted, true);
  assert.equal(row.range, OMITTED);
  assert.equal(row.noon, "");
});

test("a Thursday row keeps the abhijit window", () => {
  const [row] = abhijitDays(
    [
      day({
        day: 5,
        date_ad: "2026-11-05",
        weekday: "Thursday",
        weekday_en: "Thursday",
        sunrise: "06:17",
        sunset: "17:15",
        abhijit: { start_time: "11:24", end_time: "12:09", solar_noon: "11:46" },
      }),
    ],
    "2026-11-01",
    "en",
    OMITTED,
  );
  assert.equal(row?.omitted, false);
  assert.match(row?.range ?? "", /११:२४/);
});
