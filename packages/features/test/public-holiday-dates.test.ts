import { test } from "node:test";
import assert from "node:assert/strict";

import { publicHolidayDateSet } from "@vedic-patro/read-models/calendar/local-calendar";

test("a multi-day public holiday marks every day of its span", () => {
  const dates = publicHolidayDateSet([
    { id: "tihar", start_date: "2026-11-08", end_date: "2026-11-11", is_public_holiday: true },
    { id: "laxmi-puja", start_date: "2026-11-08", end_date: "2026-11-08", is_public_holiday: false },
    { id: "chhath", start_date: "2026-11-15", end_date: "2026-11-15", is_public_holiday: true },
    { id: "month-end", start_date: "2026-10-31", end_date: "2026-11-01", is_public_holiday: true },
  ]);
  assert.deepEqual([...dates].sort(), ["2026-10-31", "2026-11-01", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-15"]);
});
